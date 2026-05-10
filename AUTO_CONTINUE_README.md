# Auto-Continue 功能

## 概述

这个修改为 OpenCode 添加了 `Session.Event.AssistantFinished` 事件，当 AI 回答完成时触发。这使得插件可以实现"AI 回答后自动继续"的功能。

## 修改内容

### 核心修改

1. **`packages/opencode/src/session/index.ts`**
   - 添加新事件定义：`Session.Event.AssistantFinished`
   - 事件包含：`sessionID`, `messageID`, `finish`

2. **`packages/opencode/src/session/processor.ts`**
   - 在 AI 消息保存并设置 finish 状态后发布事件
   - 只有当 finish reason 不是 "tool-calls" 或 "unknown" 时才发布

### 插件示例

`.opencode/plugins/auto-continue.ts` 提供了一个实现示例，包含三个工具：
- `auto_continue_create`: 创建自动继续规则
- `auto_continue_list`: 列出所有规则
- `auto_continue_delete`: 删除规则

## 如何使用

### 1. 从 Fork 安装

```bash
# 卸载当前全局安装
npm uninstall -g @opencode-ai/cli

# 从你的 fork 安装
npm install -g https://github.com/dyyz1993/opencode.git#feature/auto-continue-event
```

### 2. 使用插件

```bash
# 在 OpenCode 会话中
# 创建自动继续规则
auto_continue_create sessionID="你的会话ID" prompt="请总结刚才的对话并继续"

# 列出所有规则
auto_continue_list

# 删除规则
auto_continue_delete id="规则ID"
```

### 3. 事件监听（插件开发者）

插件可以通过以下代码监听事件：

```typescript
import { Hooks } from "@opencode-ai/plugin"

const MyPlugin = async (input): Promise<Hooks> => {
  return {
    event: async ({ event }) => {
      if (event.payload?.type === "session.assistant.finished") {
        const { sessionID, messageID, finish } = event.payload.properties

        // AI 回答完成，执行你的逻辑
        console.log(`Assistant ${sessionID} finished: ${finish}`)

        // 例如：自动发送新消息
        await fetch(`${input.serverUrl.origin}/session/${sessionID}/prompt_async`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            parts: [{ type: "text", text: "请继续..." }]
          })
        })
      }
    }
  }
}
```

## 工作原理

1. 用户向 AI 发送消息
2. AI 处理并生成回答
3. 在 `processor.ts` 中，AI 回答保存到数据库时：
   - 设置 `assistantMessage.finish` 为 finish reason（如 "stop", "length"）
   - 保存消息到数据库
   - 如果 finish reason 有效（非 "tool-calls"/"unknown"），发布 `AssistantFinished` 事件
4. 插件监听到事件，可以：
   - 自动发送新消息让 AI 继续
   - 记录会话状态
   - 触发其他自动化流程

## Finish Reason 说明

- `stop`: AI 正常完成回答
- `length`: 回答达到最大长度
- `content_filter`: 内容被过滤
- `tool-calls`: AI 需要调用工具（不触发事件）
- `unknown`: 未知原因（不触发事件）

## 限制

- 只在 AI 完成回答时触发，不包括工具调用情况
- 需要从修改后的 fork 安装才能使用

## 后续改进

可以添加更多事件类型，如：
- `session.user.message.created`: 用户发送消息时
- `session.tool.called`: 工具被调用时
- `session.error`: 会话出错时

## Fork 地址

https://github.com/dyyz1993/opencode

分支：`feature/auto-continue-event`
