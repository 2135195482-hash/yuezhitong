# 粤志通 (YueZhiTong) — Codex 交接文档

生成时间: 2026-06-27  
交接类型: 技术原型冻结交接  
下一任代理入口: 阅读本文档后从"恢复开发步骤"开始

---

## 一、项目当前完成度

| 模块 | 状态 | 说明 |
|------|------|------|
| 项目框架 | 100% | Next.js 16 + React 19 + Prisma + Tailwind CSS |
| 5个前端页面 | 100% | 首页/问卷/结果/来源/免责 |
| 推荐引擎 | 100% | 冲/稳/保三级分级，年份科类隔离 |
| DeepSeek AI | 100% | fetch直调，含降级 |
| 演示数据 | 100% | 231条演示数据 (prisma/demo.db) |
| 演示数据隔离 | 100% | ALLOW_DEMO_DATA=false |
| 2023解析器 | 100% | scripts/importers/guangdong-2023.py |
| 2024解析器 | 100% | scripts/importers/guangdong-2024.py |
| 2025解析器 | 100% | scripts/importers/guangdong-2025.py |
| 导入脚本 | 100% | scripts/importers/import-official.py |
| 18项校验 | 100% | scripts/validate-official.py |
| 审计报告 | 100% | scripts/audit-official-data.py |
| 数据门禁 | 100% | scripts/data-gate.sh |
| **官方正式数据** | **0%** | **prisma/official.db = 0条记录** |

---

## 二、技术栈

- **框架**: Next.js 16.2.9 (Turbopack)
- **语言**: TypeScript + Python 3
- **数据库**: SQLite (Prisma v5, 非v7)
- **样式**: Tailwind CSS v4
- **AI**: DeepSeek API (fetch直调，非OpenAI SDK)
- **数据处理**: pdfplumber, pandas, openpyxl, xlrd

---

## 三、已完成页面

| 页面 | 路由 | 功能 |
|------|------|------|
| 首页 | `/` | 服务介绍、数据范围说明 |
| 问卷页 | `/questionnaire` | 选科、排位、偏好采集 |
| 结果页 | `/results` | 冲/稳/保推荐展示 |
| 数据来源页 | `/sources` | 来源追溯与透明度 |
| 免责声明页 | `/disclaimer` | 使用条款与风险提示 |

---

## 四、已完成 API

| API | 路由 | 功能 |
|-----|------|------|
| 推荐接口 | `/api/recommend` | 接收排位/选科/偏好，返回分组推荐 |
| 来源查询 | `/api/sources` | 返回数据来源元信息 |

---

## 五、数据库结构

**AdmissionRecord 核心字段**:
- `admissionYear` — 招生年份 (2023-2025)
- `province` — 省份 (广东)
- `category` — 科类 (物理类/历史类)
- `batch` — 批次 (本科批)
- `institutionCode` / `institutionName` — 院校
- `groupCode` / `groupName` — 专业组
- `planCount` / `minimumScore` / `minimumRank` — 投档数据
- `sourceLevel` / `sourceName` / `sourceUrl` — 来源追溯
- `dataType` — "group" (院校专业组投档)
- `isDemo` — 布尔标记 (正式数据专用字段)
- `verificationStatus` — official-primary / review-required / rejected
- `notes` — 解析备注、SHA256

**数据库文件**:
- `prisma/official.db` — 正式数据库 (0条记录)
- `prisma/demo.db` — 演示数据库 (231条记录，全部标记为演示数据)

---

## 六、解析器位置

| 文件 | 年份 | 输入格式 |
|------|------|----------|
| `scripts/importers/guangdong-2023.py` | 2023 | ZIP → 内部PDF |
| `scripts/importers/guangdong-2024.py` | 2024 | ZIP → 内部PDF |
| `scripts/importers/guangdong-2025.py` | 2025 | 两个独立PDF |
| `scripts/importers/import-official.py` | 全部 | 统一导入入口 |

---

## 七、数据校验和审计脚本

| 文件 | 功能 |
|------|------|
| `scripts/validate-official.py` | 18项自动化校验 (T1-T18) |
| `scripts/audit-official-data.py` | 20+指标审计报告 |
| `scripts/data-gate.sh` | 生产构建前门禁检查 |

---

## 八、已确认的4个广东省教育考试院官方附件地址

| 文件 | 官方URL | 本地路径 |
|------|---------|----------|
| 2023年 ZIP | `https://eea.gd.gov.cn/attachment/0/526/526559/4221648.zip` | `data/official/raw/2023/archive/4221648.zip` |
| 2024年 ZIP | `https://eea.gd.gov.cn/attachment/0/554/554636/4458330.zip` | `data/official/raw/2024/archive/4458330.zip` |
| 2025年 历史 PDF | `https://eea.gd.gov.cn/attachment/0/585/585885/4746781.pdf` | `data/official/raw/2025/history/4746781.pdf` |
| 2025年 物理 PDF | `https://eea.gd.gov.cn/attachment/0/585/585886/4746786.pdf` | `data/official/raw/2025/physics/4746786.pdf` |

---

## 九、当前真实数据记录数

**0条**。正式数据库 `prisma/official.db` 为空。

---

## 十、当前网络环境为什么无法下载

广东省教育考试院 (eea.gd.gov.cn) 在 TCP+TLS 握手阶段主动断开所有非中国大陆 IP 的连接。已尝试并失败的连接方式:
- curl 直连 (HTTP/HTTPS, 含 --noproxy)
- curl + 代理 (172.16.10.254:7890)
- Python requests (默认SSL、verify=False)
- Python urllib
- Node.js https (TLSv1.2/1.3, rejectUnauthorized=false)
- WebFetch MCP tool

所有方式均返回 `ERR_CONNECTION_CLOSED` / `SSL EOF`。这不是代理、TLS版本或证书问题——是服务器端的网络策略。

---

## 十一、下一任代理需要完成的具体步骤

1. 在**中国大陆网络环境**中打开4个官方页面（见上方URL）
2. 下载4个附件并放入对应目录
3. 或直接双击 `一键下载并导入.cmd`（仅限中国大陆网络环境）
4. 执行:
   ```bash
   python3 scripts/importers/import-official.py
   python3 scripts/validate-official.py
   bash scripts/data-gate.sh
   npx next build
   ```
5. 如果 `validate-official.py` 校验发现异常记录，检查并手动处理 `review-required` 记录
6. 确认 `prisma/official.db` 中 `isDemo=1` 为 0，占位URL为 0
7. 重新构建并启动

---

## 十二、启动、测试和构建命令

```bash
# 开发
npx next dev

# 测试
npx tsc --noEmit

# 构建
npx next build

# 数据导入
python3 scripts/importers/import-official.py [--dry-run]

# 数据校验
python3 scripts/validate-official.py

# 数据审计
python3 scripts/audit-official-data.py

# 门禁检查
bash scripts/data-gate.sh
```

---

## 十三、已知问题

| 问题 | 严重程度 | 说明 |
|------|----------|------|
| 无真实官方数据 | 🔴 阻塞 | 见第十、十一节 |
| DeepSeek API未配置真实密钥 | 🟡 中等 | .env中为占位密钥 |
| 2025年数据发布日待确认 | 🟢 轻微 | 当前设定为2025-07-19 |
| demo.db无isDemo列 | 🟢 轻微 | 演示数据通过notes字段标记，不影响正式库 |

---

## 十四、禁止事项

1. ❌ 不得把演示数据或第三方数据冒充官方数据
2. ❌ 不得将 `demo.db` 的内容导入 `official.db`
3. ❌ 不得将 `ALLOW_DEMO_DATA` 设为 `true`
4. ❌ 不得使用商业志愿平台、第三方整理表、自媒体等来源
5. ❌ 不得根据文件名排列顺序推断科类——必须读取PDF内部标题
6. ❌ 不得删除 `archive/` 中的原始ZIP文件
7. ❌ 不得将投档最低分描述为专业录取最低分
8. ❌ 不得将空排位记录强行补全
9. ❌ 不得为了通过构建而创建伪造正式数据
