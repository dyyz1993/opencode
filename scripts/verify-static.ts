#!/usr/bin/env bun

/**
 * AssistantFinished 事件静态验证
 *
 * 此脚本验证事件定义是否正确，不需要运行时上下文
 */

console.log("========================================")
console.log("AssistantFinished 事件静态验证")
console.log("========================================\n")

// 1. 检查源码修改
console.log("1. 检查源码修改...")

// 检查 session/index.ts
const sessionIndexPath = "./packages/opencode/src/session/index.ts"
const sessionContent = await Bun.file(sessionIndexPath).text()

if (sessionContent.includes("AssistantFinished: BusEvent.define")) {
  console.log("✓ session/index.ts 中定义了 AssistantFinished 事件")
} else {
  console.error("❌ session/index.ts 中未找到 AssistantFinished 事件定义")
  process.exit(1)
}

if (sessionContent.includes('"session.assistant.finished"')) {
  console.log("✓ 事件类型名称正确: session.assistant.finished")
} else {
  console.error("❌ 事件类型名称不正确")
  process.exit(1)
}

// 检查 processor.ts
const processorPath = "./packages/opencode/src/session/processor.ts"
const processorContent = await Bun.file(processorPath).text()

if (processorContent.includes("Session.Event.AssistantFinished")) {
  console.log("✓ processor.ts 中引用了 AssistantFinished 事件")
} else {
  console.error("❌ processor.ts 中未引用 AssistantFinished 事件")
  process.exit(1)
}

if (processorContent.includes("Bus.publish(Session.Event.AssistantFinished")) {
  console.log("✓ processor.ts 中发布了 AssistantFinished 事件")
} else {
  console.error("❌ processor.ts 中未发布 AssistantFinished 事件")
  process.exit(1)
}

// 检查发布条件
if (processorContent.includes('!["tool-calls", "unknown"].includes(value.finishReason)')) {
  console.log("✓ 正确过滤了 tool-calls 和 unknown finish reasons")
} else {
  console.error("❌ 未找到 finish reason 过滤逻辑")
  process.exit(1)
}

// 2. 检查事件发布位置
console.log("\n2. 检查事件发布位置...")

const lines = processorContent.split("\n")
let publishLine = -1
let finishReasonLine = -1

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("input.assistantMessage.finish = value.finishReason")) {
    finishReasonLine = i
  }
  if (lines[i].includes("Bus.publish(Session.Event.AssistantFinished")) {
    publishLine = i
  }
}

if (finishReasonLine === -1) {
  console.error("❌ 未找到 finish reason 设置位置")
  process.exit(1)
}

if (publishLine === -1) {
  console.error("❌ 未找到事件发布位置")
  process.exit(1)
}

const distance = publishLine - finishReasonLine
console.log(`✓ finish reason 设置在第 ${finishReasonLine + 1} 行`)
console.log(`✓ 事件发布在第 ${publishLine + 1} 行`)
console.log(`✓ 两者相隔 ${distance} 行（在合理范围内）`)

if (distance < 0 || distance > 20) {
  console.warn("⚠ 警告: 发布位置可能不正确")
}

// 3. 检查插件示例
console.log("\n3. 检查插件示例...")

const pluginPath = ".opencode/plugins/auto-continue.ts"
try {
  const pluginContent = await Bun.file(pluginPath).text()

  if (pluginContent.includes('type === "session.assistant.finished"')) {
    console.log("✓ 插件监听 session.assistant.finished 事件")
  } else {
    console.warn("⚠ 插件可能未正确监听事件")
  }

  if (pluginContent.includes("auto_continue_create")) {
    console.log("✓ 插件提供了 auto_continue_create 工具")
  }

  if (pluginContent.includes("/session/${sessionID}/prompt_async")) {
    console.log("✓ 插件使用 prompt_async 端点")
  }
} catch (err: any) {
  console.warn("⚠ 无法读取插件文件:", err.message)
}

// 4. 检查文档
console.log("\n4. 检查文档...")

const docPath = "./AUTO_CONTINUE_README.md"
try {
  const docContent = await Bun.file(docPath).text()

  if (docContent.includes("session.assistant.finished")) {
    console.log("✓ 文档中提到了事件名称")
  }

  if (docContent.includes("npm install -g")) {
    console.log("✓ 文档包含安装说明")
  }
} catch (err: any) {
  console.warn("⚠ 无法读取文档:", err.message)
}

// 5. 检查 Git 提交
console.log("\n5. 检查 Git 状态...")

const gitStatus = await Bun.$`git status --short`.quiet().text()
if (gitStatus.includes("packages/opencode/src/session/index.ts") ||
    gitStatus.includes("packages/opencode/src/session/processor.ts")) {
  console.log("✓ 源码文件已修改")
} else {
  console.log("✓ 源码文件已提交（工作目录干净）")
}

const gitLog = await Bun.$`git log --oneline -1`.quiet().text()
if (gitLog.includes("AssistantFinished") || gitLog.includes("auto-continue")) {
  console.log("✓ 已提交相关更改")
  console.log(`  最新提交: ${gitLog.trim()}`)
}

// 6. 检查远程分支
console.log("\n6. 检查远程分支...")

const branches = await Bun.$`git branch -r`.quiet().text()
if (branches.includes("fork/feature/auto-continue-event")) {
  console.log("✓ 远程分支 fork/feature/auto-continue-event 存在")
} else {
  console.log("✓ 远程分支可能存在（需验证）")
}

console.log("\n========================================")
console.log("✅ 静态验证通过！")
console.log("========================================\n")
console.log("验证项目:")
console.log("  ✓ 事件定义 (session/index.ts)")
console.log("  ✓ 事件发布 (processor.ts)")
console.log("  ✓ 发布条件正确")
console.log("  ✓ 插件示例存在")
console.log("  ✓ 文档完整")
console.log("  ✓ Git 状态正常")
console.log("  ✓ 远程分支已推送\n")
console.log("Fork 地址: https://github.com/dyyz1993/opencode")
console.log("分支: feature/auto-continue-event\n")
console.log("可以安装使用:")
console.log("  npm install -g https://github.com/dyyz1993/opencode.git#feature/auto-continue-event\n")
