import { tool, PluginInput, Hooks } from "@opencode-ai/plugin"
import { mkdir, appendFile } from "node:fs/promises"
import { join } from "node:path"

type Timer = {
  id: string
  sessionID: string
  prompt: string
  triggerCondition: "assistant_finished" | "message_created" | "always"
  lastTriggeredAt?: string
  triggerCount: number
}

const AutoContinuePlugin = async (input: PluginInput): Promise<Hooks> => {
  const { directory, serverUrl, serverHeaders } = input
  const tmDir = join(directory, ".opencode", "auto-continue")
  const logPath = join(tmDir, "debug.log")
  const timersPath = join(tmDir, "timers.json")

  await mkdir(tmDir, { recursive: true })

  const log = async (msg: string, data?: Record<string, unknown>) => {
    const ts = new Date().toISOString()
    const line = data ? `[${ts}] ${msg} ${JSON.stringify(data)}\n` : `[${ts}] ${msg}\n`
    await appendFile(logPath, line).catch(() => {})
  }

  await log("AutoContinue plugin loaded", { serverUrl: serverUrl.href })

  let timers: Timer[] = []

  const loadTimers = async () => {
    try {
      const content = await Bun.file(timersPath).text()
      timers = JSON.parse(content)
    } catch {
      timers = []
    }
  }

  await loadTimers()

  const saveTimers = async () => {
    await Bun.write(timersPath, JSON.stringify(timers, null, 2))
  }

  const triggerContinue = async (sessionID: string, timer: Timer) => {
    const url = `${serverUrl.origin}/session/${sessionID}/prompt_async`

    await log(`Triggering continue for ${timer.id}`, { sessionID, url })

    try {
    const res = await fetch(url, {
              method: "POST",
              headers: { "Content-Type": "application/json", ...serverHeaders },
              body: JSON.stringify({ parts: [{ type: "text", text: timer.prompt }] }),
            })

      await log(`Continue triggered`, {
        timerID: timer.id,
        sessionID,
        status: res.status,
        ok: res.ok,
      })

      return res.ok
    } catch (err: any) {
      await log(`Continue trigger FAILED`, {
        timerID: timer.id,
        sessionID,
        error: String(err),
        message: err?.message,
      })
      return false
    }
  }

  return {
    event: async ({ event }) => {
      const keys = Object.keys(event).join(",")
      const ev = event.event || event
      const type = ev?.type || "unknown"
      const props = ev?.properties || {}
      await log(`Event received`, { keys, type })

      // Check for AssistantFinished event
      if (type === "session.assistant.finished") {
        const sessionID = props.sessionID as string
        const messageID = props.messageID as string
        const finish = props.finish as string | undefined

        await log(`Assistant finished`, { sessionID, messageID, finish })

        for (const timer of timers) {
          if (timer.sessionID !== sessionID) continue

          if (timer.triggerCondition === "assistant_finished" || timer.triggerCondition === "always") {
            await log(`Triggering timer`, {
              timerID: timer.id,
              event: type,
              finish,
            })

            const success = await triggerContinue(sessionID, timer)

            if (success) {
              timer.lastTriggeredAt = new Date().toISOString()
              timer.triggerCount++
              await saveTimers()
            }
          }
        }
      }
    },

    tool: {
      auto_continue_create: tool({
        description: "Create an auto-continue rule that triggers when AI finishes answering",
        parameters: {
          type: "object",
          properties: {
            sessionID: {
              type: "string",
              description: "The session ID to continue",
            },
            prompt: {
              type: "string",
              description: "The message to send when continuing",
            },
            triggerCondition: {
              type: "string",
              enum: ["assistant_finished", "message_created", "always"],
              description: "When to trigger the continue",
              default: "assistant_finished",
            },
          },
          required: ["sessionID", "prompt"],
        },
        execute: async ({ sessionID, prompt, triggerCondition = "assistant_finished" }) => {
          const timer: Timer = {
            id: `ac_${Date.now()}`,
            sessionID,
            prompt,
            triggerCondition: triggerCondition as any,
            triggerCount: 0,
          }

          timers.push(timer)
          await saveTimers()

          await log(`Timer created`, timer)

          return {
            success: true,
            timerID: timer.id,
          }
        },
      }),

      auto_continue_list: tool({
        description: "List all auto-continue rules",
        parameters: {
          type: "object",
          properties: {},
        },
        execute: async () => {
          return {
            timers: timers.map((t) => ({
              id: t.id,
              sessionID: t.sessionID,
              triggerCondition: t.triggerCondition,
              triggerCount: t.triggerCount,
              lastTriggeredAt: t.lastTriggeredAt,
            })),
          }
        },
      }),

      auto_continue_delete: tool({
        description: "Delete an auto-continue rule",
        parameters: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "The timer ID to delete",
            },
          },
          required: ["id"],
        },
        execute: async ({ id }) => {
          const index = timers.findIndex((t) => t.id === id)
          if (index === -1) {
            return {
              success: false,
              error: "Timer not found",
            }
          }

          timers.splice(index, 1)
          await saveTimers()

          await log(`Timer deleted`, { id })

          return {
            success: true,
          }
        },
      }),
    },
  }
}

export default AutoContinuePlugin
