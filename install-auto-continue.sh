#!/bin/bash

set -e

echo "========================================"
echo "OpenCode Auto-Continue 安装脚本"
echo "========================================"
echo ""

# 检查是否已安装
if command -v opencode &> /dev/null; then
    echo "检测到已安装的 OpenCode:"
    opencode --version 2>/dev/null || opencode version 2>/dev/null || echo "无法获取版本"
    echo ""
    read -p "是否要卸载旧版本？(y/N) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "正在卸载..."
        npm uninstall -g @opencode-ai/cli
        echo "卸载完成"
    fi
fi

echo ""
echo "从 dyyz1993/opencode 的 feature/auto-continue-event 分支安装..."
echo ""

# 安装
npm install -g https://github.com/dyyz1993/opencode.git#feature/auto-continue-event

echo ""
echo "========================================"
echo "安装完成！"
echo "========================================"
echo ""
echo "验证安装:"
opencode --version || opencode version
echo ""
echo "使用方法:"
echo "  1. 启动 OpenCode: opencode serve"
echo "  2. 在会话中使用 auto_continue_create 工具"
echo "  3. AI 回答完成后会自动触发继续"
echo ""
echo "详细文档: AUTO_CONTINUE_README.md"
echo ""
