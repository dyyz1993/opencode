import { tool } from "@opencode-ai/plugin"
import { mkdir, appendFile } from "node:fs/promises"
import { join } from "node:path"

/**
 * 权限拦截插件
 *
 * 功能：
 * 1. 监听 permission.asked 事件（权限请求）
 * 2. 获取 requestID
 * 3. 可以推送到外部系统
 * 4. 外部系统可以通过 requestID 回复
 *
 * 这证明了 OpenCode 已经支持 UI 事件拦截和远程响应！
 */

const PermissionInterceptorPlugin = async (input) => {
  const { directory, serverUrl, serverHeaders } = input
  const logDir = join(directory, ".opencode", "permission-interceptor")
  const logPath = join(logDir, "debug.log")

  await mkdir(logDir, { recursive: true })

  const log = async (msg: string, data?: Record<string, unknown>) => {
    const ts = new Date().toISOString()
    const line = data ? `[${ts}] ${msg} ${JSON.stringify(data)}\n` : `[${ts}] ${msg}\n`
    await appendFile(logPath, line).catch(() => {})
  }

  await log("Plugin loaded", { serverUrl: serverUrl.href })

  return {
    event: async ({ event }) => {
      const type = event.payload?.type || "unknown"
      const props = event.payload?.properties || {}

      // 监听权限请求事件
      if (type === "permission.asked") {
        const requestID = props.id as string
        const sessionID = props.sessionID as string
        const permission = props.permission as string
        const patterns = props.patterns as string[]
        const metadata = props.metadata as Record<string, any>

        await log("Permission asked", {
          requestID,
          sessionID,
          permission,
          patterns,
          metadata,
        })

        // 这里可以推送到外部系统
        // 例如：飞书通知、手机推送、Webhook 等
        // 外部系统收到后，可以调用 reply 端点回复

        // 示例：推送通知到外部
        // await pushToExternal(requestID, permission, patterns)
      }

      // 监听权限回复事件
      if (type === "permission.replied") {
        const requestID = props.requestID as string
        const reply = props.reply as string

        await log("Permission replied", { requestID, reply })
      }
    },

    tool: {
      // 工具1: 手动回复权限请求
      permission_reply: tool({
        description: "通过 requestID 回复权限请求（模拟外部系统响应）",
        parameters: {
          type: "object",
          properties: {
            requestID: {
              type: "string",
              description: "权限请求的 ID（从 permission.asked 事件获取）",
            },
            reply: {
              type: "string",
              enum: ["once", "always", "reject"],
              description: "回复类型: once=本次允许, always=永久允许, reject=拒绝",
            },
            message: {
              type: "string",
              description: "拒绝原因（仅在 reply=reject 时有效）",
            },
          },
          required: ["requestID", "reply"],
        },
        execute: async ({ requestID, reply, message }) => {
          const url = `${serverUrl.origin}/permission/${requestID}/reply`

          await log("Replying to permission", { requestID, reply, message, url })

          try {
            const res = await fetch(url, {
              method: "POST",
              headers: { "Content-Type": "application/json", ...serverHeaders },
              body: JSON.stringify({ reply, message }),
            })

            await log("Reply result", {
              status: res.status,
              ok: res.ok,
            })

            return {
              success: res.ok,
              status: res.status,
              message: res.ok
                ? `权限请求已回复: ${reply}`
                : `回复失败 (HTTP ${res.status})`,
            }
          } catch (err: any) {
            await log("Reply error", { error: String(err) })
            return {
              success: false,
              error: err.message,
            }
          }
        },
      }),

      // 工具2: 列出所有待处理的权限请求
      permission_list: tool({
        description: "列出所有待处理的权限请求",
        parameters: {
          type: "object",
          properties: {},
        },
        execute: async () => {
          const url = `${serverUrl.origin}/permission/`

          try {
            const res = await fetch(url, {
              headers: serverHeaders,
            })
            const data = await res.json()

            await log("Listed permissions", { count: data.length })

            return {
              success: true,
              permissions: data,
              count: data.length,
            }
          } catch (err: any) {
            await log("List error", { error: String(err) })
            return {
              success: false,
              error: err.message,
            }
          }
        },
      }),

      // 工具3: 查看插件日志
      permission_log: tool({
        description: "查看权限拦截插件的日志",
        parameters: {
          type: "object",
          properties: {
            lines: {
              type: "number",
              description: "查看最后几行日志",
              default: 20,
            },
          },
        },
        execute: async ({ lines = 20 }) => {
          try {
            const content = await Bun.file(logPath).text()
            const allLines = content.split("\n").filter((l) => l.trim())
            const recent = allLines.slice(-lines).join("\n")

            return {
              totalLines: allLines.length,
              recentLogs: recent,
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

export default PermissionInterceptorPlugin
