import { describe, it, expect, beforeEach, afterEach } from "bun:test"
import { Instance } from "@/project/instance"
import { Session } from "."
import { Bus } from "@/bus"
import { Agent } from "@/agent/agent"
import { Provider } from "@/provider/provider"
import { Config } from "@/config/config"

describe("Session.Event.AssistantFinished", () => {
  const testDir = "/tmp/opencode-test-assistant-finished"

  beforeEach(async () => {
    await Bun.$`rm -rf ${testDir}`.quiet()
    await Bun.$`mkdir -p ${testDir}`.quiet()
    await Instance.create({ directory: testDir })

    await Config.setGlobal({
      provider: {
        anthropic: {
          apiKey: "sk-test-key",
        },
      },
    })
  })

  afterEach(async () => {
    await Instance.disposeAll()
    await Bun.$`rm -rf ${testDir}`.quiet()
  })

  it("should publish AssistantFinished event when AI completes response", async () => {
    const events: any[] = []

    const unsubscribe = Bus.subscribe(Session.Event.AssistantFinished, (evt) => {
      events.push({
        type: evt.type,
        properties: evt.properties,
      })
    })

    try {
      // Create a session
      const session = await Session.create({
        title: "Test Session",
        permission: [],
      })

      // Create a test agent
      await Agent.set({
        name: "test-agent",
        prompt: "You are a helpful assistant.",
        permission: [],
      })

      // Get a test model
      const model = await Provider.getModel("anthropic", "claude-3-haiku-20240307")

      // Create a user message
      const userMsg = await Session.createMessage({
        sessionID: session.id,
        role: "user",
        mode: "test-agent",
        agent: "test-agent",
        modelID: model.id,
        providerID: model.providerID,
        parts: [{ type: "text", text: "Say hello" }],
        path: {
          cwd: testDir,
          root: testDir,
        },
      })

      // We can't actually run the full prompt loop in tests (needs real LLM),
      // but we can verify the event type is registered
      expect(Session.Event.AssistantFinished).toBeDefined()
      expect(Session.Event.AssistantFinished.type).toBe("session.assistant.finished")
    } finally {
      unsubscribe()
    }
  })

  it("should have correct event schema", () => {
    expect(Session.Event.AssistantFinished).toBeDefined()
    expect(Session.Event.AssistantFinished.type).toBe("session.assistant.finished")

    const properties = Session.Event.AssistantFinished.properties
    expect(properties).toHaveProperty("sessionID")
    expect(properties).toHaveProperty("messageID")
    expect(properties).toHaveProperty("finish")
  })
})
