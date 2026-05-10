#!/bin/bash

set -e

echo "========================================"
echo "同步 OpenCode Upstream"
echo "========================================"

# 获取上游最新
echo "1. 获取上游最新代码..."
timeout 60 git fetch origin || {
  echo "⚠ 获取超时，网络可能较慢"
  echo "可以稍后重试或手动运行: git fetch origin"
  exit 1
}

# 检查是否有新提交
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/dev)

echo "本地最新: $LOCAL"
echo "上游最新: $REMOTE"

if [ "$LOCAL" = "$REMOTE" ]; then
  echo ""
  echo "✓ 已经是最新版本，无需同步"
  exit 0
fi

echo ""
echo "2. 检测到新提交，准备同步..."
echo "上游新提交:"
git log --oneline HEAD..origin/dev | head -5

echo ""
echo "3. 显示当前分支更改:"
echo "你的提交:"
git log --oneline origin/dev..HEAD

echo ""
read -p "是否继续同步？(y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "取消同步"
  exit 0
fi

# 保存当前分支名
CURRENT_BRANCH=$(git branch --show-current)

echo ""
echo "4. 合并上游更改..."
if ! git merge origin/dev --no-edit 2>&1; then
  echo ""
  echo "⚠ 检测到冲突！"
  echo ""
  echo "请手动解决冲突："
  echo "  1. 查看冲突文件: git status"
  echo "  2. 编辑冲突文件，解决冲突"
  echo "  3. 标记为已解决: git add <文件>"
  echo "  4. 完成合并: git commit"
  echo "  5. 推送: git push fork $CURRENT_BRANCH"
  echo ""
  echo "冲突文件:"
  git status --short | grep "^UU"
  exit 1
fi

echo "5. 推送到 fork..."
git push fork $CURRENT_BRANCH

echo ""
echo "========================================"
echo "✅ 同步完成！"
echo "========================================"
echo ""
echo "本地分支: $CURRENT_BRANCH"
echo "最新提交: $(git log -1 --oneline)"
echo ""
echo "如果一切正常，可以继续开发"
