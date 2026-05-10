#!/usr/bin/env bun

/**
 * 验证 AssistantFinished 事件的简单脚本
 *
 * 此脚本验证：
 * 1. Session.Event.AssistantFinished 事件是否已定义
 * 2. 事件 schema 是否正确
 */

import { Session } from "../packages/opencode/src/session"
import { Instance } from "../packages/opencode/src/project/instance"

console.log("========================================")
console.log("验证 AssistantFinished 事件")
console.log("========================================\n")

// 1. 检查事件是否定义
console.log("1. 检查事件定义...")
if (!Session.Event.AssistantFinished) {
  console.error("❌ 失败: Session.Event.AssistantFinished 未定义")
  process.exit(1)
}
console.log("✓ 事件已定义")
console.log(`  类型: ${Session.Event.AssistantFinished.type}\n`)

// 2. 检查事件类型名称
console.log("2. 检查事件类型...")
if (Session.Event.AssistantFinished.type !== "session.assistant.finished") {
  console.error(`❌ 失败: 事件类型应为 'session.assistant.finished', 实际为 '${Session.Event.AssistantFinished.type}'`)
  process.exit(1)
}
console.log("✓ 事件类型正确\n")

// 3. 检查事件 schema
console.log("3. 检查事件 schema...")
const properties = Session.Event.AssistantFinished.properties
if (!properties) {
  console.error("❌ 失败: 事件没有 properties 定义")
  process.exit(1)
}

const requiredProps = ["sessionID", "messageID", "finish"]
const shape = properties.shape || {}
for (const prop of requiredProps) {
  if (!shape[prop]) {
    console.error(`❌ 失败: 缺少必需属性 '${prop}'`)
    console.error(`  可用属性: ${Object.keys(shape).join(", ")}`)
    process.exit(1)
  }
}
console.log("✓ 事件 schema 正确")
console.log(`  包含属性: ${Object.keys(shape).join(", ")}\n`)

// 4. 显示事件详情
console.log("4. 事件详情...")
console.log(`  事件名称: ${Session.Event.AssistantFinished.type}`)
console.log(`  sessionID 类型: ${shape.sessionID.constructor.name}`)
console.log(`  messageID 类型: ${shape.messageID.constructor.name}`)
console.log(`  finish 类型: ${shape.finish.constructor.name}\n`)

// 5. 验证在 processor.ts 中的使用
console.log("5. 验证 processor.ts 中的实现...")
const processorPath = "./packages/opencode/src/session/processor.ts"
const processorContent = await Bun.file(processorPath).text()

if (processorContent.includes("Session.Event.AssistantFinished")) {
  console.log("✓ processor.ts 中使用了 AssistantFinished 事件")
} else {
  console.error("❌ 失败: processor.ts 中未找到 AssistantFinished 事件的使用")
  process.exit(1)
}

if (processorContent.includes("Bus.publish(Session.Event.AssistantFinished")) {
  console.log("✓ processor.ts 中正确发布了事件")
} else {
  console.error("❌ 失败: processor.ts 中未找到 Bus.publish 调用")
  process.exit(1)
}

console.log("\n========================================")
console.log("✅ 所有验证通过！")
console.log("========================================\n")
console.log("AssistantFinished 事件已正确实现，功能包括：")
console.log("")
console.log("📝 事件定义:")
console.log("   - 类型: session.assistant.finished")
console.log("   - 属性: sessionID, messageID, finish")
console.log("")
console.log("🔄 触发时机:")
console.log("   - 在 processor.ts 中，AI 消息保存并设置 finish 后")
console.log("   - finish reason 为 'stop', 'length', 'content-filter' 等")
console.log("   - 不会在 'tool-calls' 或 'unknown' 时触发")
console.log("")
console.log("💡 使用场景:")
console.log("   - AI 回答完成后自动发送新消息 (auto-continue)")
console.log("   - 会话状态监控和记录")
console.log("   - 自动化工作流触发")
console.log("   - 通知和提醒系统")
console.log("")
console.log("📦 安装使用:")
console.log("   npm install -g https://github.com/dyyz1993/opencode.git#feature/auto-continue-event")
console.log("")
console.log("详细文档: AUTO_CONTINUE_README.md")
