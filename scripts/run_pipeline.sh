#!/bin/bash
set -e
echo "粤志通 数据管道"
python3 scripts/collect_data.py 2>&1 | tail -5
python3 scripts/generate_demo_data.py 2>&1 | tail -3
python3 scripts/validate_data.py 2>&1 | tail -10
cd "$(dirname "$0")/.."
DATABASE_URL="file:dev.db" npx prisma db push --accept-data-loss 2>&1 | tail -2
python3 scripts/seed_db.py 2>&1
echo "管道完成"
