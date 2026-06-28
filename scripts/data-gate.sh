#!/bin/bash
# Data Gate — runs before production build
# Ensures ALLOW_DEMO_DATA=false means zero demo records
# Run: bash scripts/data-gate.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== 数据门禁检查 ==="

# Source environment
if [ -f "$PROJECT_DIR/.env" ]; then
  export $(grep -v '^#' "$PROJECT_DIR/.env" | xargs)
fi

if [ "${ALLOW_DEMO_DATA:-false}" != "true" ]; then
  echo "[GATE] ALLOW_DEMO_DATA=false — 正式数据库不得含演示数据"
  
  DB_PATH="$PROJECT_DIR/prisma/official.db"
  if [ ! -f "$DB_PATH" ]; then
    echo "[GATE] 正式数据库不存在，跳过 (空数据库允许通过)"
    exit 0
  fi
  
  # Check for demo data
  DEMO_COUNT=$(python3 -c "
import sqlite3
conn = sqlite3.connect('$DB_PATH')
c = conn.cursor()
c.execute(\"SELECT COUNT(*) FROM AdmissionRecord WHERE notes LIKE '%演示%' OR notes LIKE '%demo%' OR isDemo = 1\")
print(c.fetchone()[0])
")
  
  if [ "$DEMO_COUNT" -gt 0 ]; then
    echo "[GATE] FAIL: 正式数据库含 $DEMO_COUNT 条演示数据！"
    echo "[GATE] 请清除演示数据或设置 ALLOW_DEMO_DATA=true"
    exit 1
  fi
  
  # Check for placeholder URLs
  PLACEHOLDER_COUNT=$(python3 -c "
import sqlite3
conn = sqlite3.connect('$DB_PATH')
c = conn.cursor()
c.execute(\"SELECT COUNT(*) FROM AdmissionRecord WHERE sourceUrl = 'https://eea.gd.gov.cn/gkgs/' OR sourceUrl LIKE '%placeholder%' OR sourceUrl = '' OR sourceUrl IS NULL\")
print(c.fetchone()[0])
")
  
  if [ "$PLACEHOLDER_COUNT" -gt 0 ]; then
    echo "[GATE] FAIL: 正式数据库含 $PLACEHOLDER_COUNT 条占位URL！"
    exit 1
  fi
  
  # Check for review-required in recommendation pool
  REVIEW_COUNT=$(python3 -c "
import sqlite3
conn = sqlite3.connect('$DB_PATH')
c = conn.cursor()
c.execute(\"SELECT COUNT(*) FROM AdmissionRecord WHERE verificationStatus = 'review-required'\")
print(c.fetchone()[0])
")
  
  echo "[GATE] 待复核记录: $REVIEW_COUNT 条"
  
  echo "[GATE] ✅ 通过"
else
  echo "[GATE] ALLOW_DEMO_DATA=true — 跳过演示数据检查"
fi
