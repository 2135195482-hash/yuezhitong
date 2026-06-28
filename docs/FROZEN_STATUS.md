# 粤志通 — 项目冻结状态

## 冻结信息

| 项目 | 值 |
|------|-----|
| 冻结日期 | 2026-06-27 |
| 冻结原因 | 当前运行环境（非中国大陆IP）无法访问广东省教育考试院服务器完成官方数据下载 |
| 冻结时版本 | 技术原型 (pre-official-data) |
| 恢复入口 | `docs/CODEX_HANDOFF.md` |

## 当前可运行功能

- ✅ 首页服务介绍
- ✅ 问卷页选科/排位/偏好采集
- ✅ 推荐引擎（冲/稳/保三级分级）
- ✅ 结果页展示
- ✅ 数据来源页
- ✅ 免责声明页
- ✅ DeepSeek AI 报告生成
- ✅ 演示数据库231条数据可跑通完整推荐流程
- ✅ 所有代码编译通过 (tsc --noEmit)
- ✅ 生产构建成功 (next build)
- ✅ 2023/2024/2025年官方数据解析器
- ✅ 18项数据校验
- ✅ 数据审计报告生成
- ✅ 数据门禁

## 当前不可用功能

- ❌ 基于真实官方数据的推荐
- ❌ 真实排位参考
- ❌ 对用户公开服务

## 数据真实性状态

| 数据库 | 记录数 | 真实性 |
|--------|--------|--------|
| prisma/official.db | 0条 | 无数据 |
| prisma/demo.db | 231条 | 全部为演示数据，已物理隔离 |

ALLOW_DEMO_DATA=false：正式推荐引擎不会使用演示数据。

## 恢复开发的入口

1. 阅读 `docs/CODEX_HANDOFF.md`
2. 在中国大陆网络环境中下载4个官方附件
3. 放入 `data/official/raw/YYYY/` 对应目录
4. 执行 `python3 scripts/importers/import-official.py`
5. 执行 `python3 scripts/validate-official.py`
6. 执行 `bash scripts/data-gate.sh`
7. 执行 `npx next build`
