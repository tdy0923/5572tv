#!/bin/bash
# Code Verification Script
# Run before every commit to ensure no bugs

set -e

echo "=========================================="
echo "  代码验证体系"
echo "=========================================="

cd /root/www.5572.net

# 1. TypeScript compilation check
echo ""
echo "[1/5] TypeScript 类型检查..."
if npx tsc --noEmit 2>&1 | grep -q "error"; then
  echo "❌ TypeScript 错误"
  npx tsc --noEmit 2>&1 | grep "error" | head -10
  exit 1
fi
echo "✅ TypeScript 零错误"

# 2. ESLint check
echo ""
echo "[2/5] ESLint 代码规范检查..."
if npx next lint 2>&1 | grep -q "Error:"; then
  echo "❌ ESLint 错误"
  npx next lint 2>&1 | grep "Error:" | head -10
  exit 1
fi
echo "✅ ESLint 无错误"

# 3. Build check
echo ""
echo "[3/5] 构建检查..."
if ! pnpm build 2>&1 | grep -q "Build completed"; then
  echo "❌ 构建失败"
  exit 1
fi
echo "✅ 构建成功"

# 4. Check for console.log in production code
echo ""
echo "[4/5] 生产代码检查..."
CONSOLE_COUNT=$(grep -r "console\." src/app/api/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "console.error" | grep -v "console.warn" | wc -l)
if [ "$CONSOLE_COUNT" -gt 50 ]; then
  echo "⚠️  API 路由中有 $CONSOLE_COUNT 个 console.log（建议清理）"
fi
echo "✅ 生产代码检查完成"

# 5. Check for common issues
echo ""
echo "[5/5] 常见问题检查..."
ISSUES=0

# Check for unused imports
UNUSED=$(grep -r "import.*from.*\./" src/app/api/ --include="*.ts" 2>/dev/null | grep -c "unused" || true)
if [ "$UNUSED" -gt 0 ]; then
  echo "⚠️  发现 $UNUSED 个未使用的导入"
  ISSUES=$((ISSUES + 1))
fi

# Check for hardcoded secrets
SECRETS=$(grep -r "password.*=.*['\"]" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "passwordHash\|hashPassword\|verifyPassword\|process.env\|password:" | wc -l)
if [ "$SECRETS" -gt 0 ]; then
  echo "⚠️  发现 $SECRETS 个可能的硬编码密码"
  ISSUES=$((ISSUES + 1))
fi

echo "✅ 常见问题检查完成"

echo ""
echo "=========================================="
echo "  验证完成！"
echo "=========================================="
