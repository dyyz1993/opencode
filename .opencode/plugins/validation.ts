import { tool } from "@opencode-ai/plugin"
import { mkdir, appendFile } from "node:fs/promises"
import { join } from "node:path"

/**
 * 验证插件：测试两个核心功能
 *
 * 1. 在插件中发送消息到当前会话（基于 AssistantFinished 事件）
 * 2. 在插件中使用 Fork Agent 静默执行任务
 */

const ValidationPlugin = async (input) => {
  const { directory, serverUrl, serverHeaders } = input
  const logPath = join(directory, ".opencode", "validation.log")

  await mkdir(join(directory, ".opencode"), { recursive: true })

  const log = async (msg: string, data?: Record<string, unknown>) => {
    const ts = new Date().toISOString()
    const line = data ? `[${ts}] ${msg} ${JSON.stringify(data)}\n` : `[${ts}] ${msg}\n`
    await appendFile(logPath, line).catch(() => {})
  }

  await log("Validation plugin loaded", { serverUrl: serverUrl.href })

  return {
    event: async ({ event }) => {
      const type = event.payload?.type || "unknown"
      const props = event.payload?.properties || {}

      await log(`Event received`, { type, props })

      // 测试功能1: 监听 AssistantFinished 事件并自动发送消息
      if (type === "session.assistant.finished") {
        const sessionID = props.sessionID as string
        const messageID = props.messageID as string
        const finish = props.finish as string | undefined

        await log(`Assistant finished`, { sessionID, messageID, finish })

        // 自动发送测试消息
        const url = `${serverUrl.origin}/session/${sessionID}/prompt_async`
        const testPrompt = "[Validation] 这是一个自动发送的测试消息，验证插件能否在 AI 回答完成后自动发送新消息。"

        await log(`Sending test message to ${sessionID}`)

        try {
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...serverHeaders },
            body: JSON.stringify({ parts: [{ type: "text", text: testPrompt }] }),
          })

          await log(`Test message sent`, {
            sessionID,
            status: res.status,
            ok: res.ok,
          })
        } catch (err: any) {
          await log(`Failed to send test message`, {
            error: String(err),
            message: err?.message,
          })
        }
      }
    },

    tool: {
      // 工具1: 验证在插件中发送消息到会话
      validation_send_message: tool({
        description: "验证插件能否发送消息到指定会话（测试功能1）",
        parameters: {
          type: "object",
          properties: {
            sessionID: {
              type: "string",
              description: "目标会话ID",
            },
            message: {
              type: "string",
              description: "要发送的消息内容",
            },
          },
          required: ["sessionID", "message"],
        },
        execute: async ({ sessionID, message }) => {
          const url = `${serverUrl.origin}/session/${sessionID}/prompt_async`

          await log(`validation_send_message called`, { sessionID, message })

          try {
            const res = await fetch(url, {
              method: "POST",
              headers: { "Content-Type": "application/json", ...serverHeaders },
              body: JSON.stringify({ parts: [{ type: "text", text: `[Validation] ${message}` }] }),
            })

            await log(`validation_send_message result`, {
              status: res.status,
              ok: res.ok,
            })

            return {
              success: res.ok,
              status: res.status,
              message: res.ok ? "消息发送成功" : "消息发送失败",
            }
          } catch (err: any) {
            await log(`validation_send_message error`, { error: String(err) })
            return {
              success: false,
              error: err.message,
            }
          }
        },
      }),

      // 工具2: 验证 Fork Agent 静默执行
      validation_fork_agent: tool({
        description: "验证插件能否使用 Fork Agent 静默执行任务（测试功能2）",
        parameters: {
          type: "object",
          properties: {
            sessionID: {
              type: "string",
              description: "父会话ID（用于获取上下文）",
            },
            task: {
              type: "string",
              description: "要执行的任务描述",
            },
          },
          required: ["sessionID", "task"],
        },
        execute: async ({ sessionID, task }) => {
          await log(`validation_fork_agent called`, { sessionID, task })

          try {
            // 动态导入模块
            const forkedStream = (await import("../../packages/opencode/src/session/fork")).forkedStream
            const { Provider } = await import("../../packages/opencode/src/provider/provider")
            const { MessageV2 } = await import("../../packages/opencode/src/session/message-v2")

            // 获取会话消息
            const messages = await MessageV2.filterCompacted(MessageV2.stream(sessionID))

            // 获取模型（使用默认模型）
            const model = await Provider.getModel("anthropic", "claude-3-haiku-20240307")

            // 使用 Fork Agent 静默执行
            const result = await forkedStream({
              parentSessionID: sessionID,
              model: model,
              agentPrompt: `你是一个助手，负责执行以下任务，不需要输出给用户，只需完成任务。任务：${task}`,
              messages: messages.map((msg) => ({
                role: msg.info.role,
                content: msg.parts
                  .filter((p) => p.type === "text")
                  .map((p) => (p as any).text)
                  .join("\n"),
              })),
              maxTokens: 1000,
            })

            await log(`validation_fork_agent result`, {
              textLength: result.text.length,
              usage: result.usage,
            })

            return {
              success: true,
              result: result.text,
              usage: result.usage,
            }
          } catch (err: any) {
            await log(`validation_fork_agent error`, {
              error: String(err),
              message: err?.message,
              stack: err?.stack,
            })
            return {
              success: false,
              error: err.message,
              note: "这个功能需要在源码运行环境中测试，全局安装版本可能无法访问内部模块",
            }
          }
        },
      }),

      // 工具3: 查看验证日志
      validation_log: tool({
        description: "查看验证插件的日志",
        parameters: {
          type: "object",
          properties: {},
        },
        execute: async () => {
          try {
            const content = await Bun.file(logPath).text()
            const lines = content.split("\n").filter((line) => line.trim())
            const last20 = lines.slice(-20).join("\n")

            return {
              totalLines: lines.length,
              recentLogs: last20,
              logPath,
            }
          } catch {
            return {
              totalLines: 0,
              recentLogs: "暂无日志",
              logPath,
            }
          }
        },
      }),
    },
  }
}

export default ValidationPlugin
