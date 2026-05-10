#!/bin/bash

echo "========================================"
echo "OpenCode Fork 状态检查"
echo "========================================"

# 获取当前分支
BRANCH=$(git branch --show-current)
echo "当前分支: $BRANCH"

# 获取本地 HEAD
LOCAL=$(git rev-parse HEAD)
echo "本地 HEAD: ${LOCAL:0:8}"

# 获取上游 HEAD
if REMOTE=$(git rev-parse origin/dev 2>/dev/null); then
  echo "上游 dev:  ${REMOTE:0:8}"
else
  echo "⚠ 无法获取上游状态（可能需要 fetch）"
  exit 1
fi

# 比较差异
echo ""
echo "========================================"
echo "差异分析"
echo "========================================"

if [ "$LOCAL" = "$REMOTE" ]; then
  echo "✓ 与上游同步（基于最新版本）"
else
  # 检查本地是否基于上游
  if git merge-base --is-ancestor $REMOTE $LOCAL; then
    echo "✓ 本地基于上游最新版本"
    AHEAD_COUNT=$(git rev-list --count $REMOTE..$LOCAL)
    echo "  本地领先上游 $AHEAD_COUNT 个提交"
    echo ""
    echo "你的新提交:"
    git log --oneline $REMOTE..$LOCAL
  elif git merge-base --is-ancestor $LOCAL $REMOTE; then
    echo "⚠ 本地落后上游"
    BEHIND_COUNT=$(git rev-list --count $LOCAL..$REMOTE)
    echo "  上游领先本地 $BEHIND_COUNT 个提交"
    echo ""
    echo "建议运行: ./scripts/sync-upstream.sh"
  else
    echo "⚠ 本地与上游分叉"
    echo "  需要合并或 rebase"
  fi
fi

echo ""
echo "========================================"
echo "最近 5 个提交"
echo "========================================"
git log --oneline -5

echo ""
echo "========================================"
echo "分支信息"
echo "========================================"
git remote -v
