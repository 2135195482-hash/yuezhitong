# 粤志通 - 广东高考志愿与专业方向咨询系统

> ⚠️ **当前版本为技术原型。正式数据库尚未导入广东省教育考试院官方投档数据，不可用于真实高考志愿决策。演示数据已与正式环境隔离。**
>
> 详见: [冻结状态](docs/FROZEN_STATUS.md) | [交接文档](docs/CODEX_HANDOFF.md)

基于广东省教育考试院官方公开招生信息，为广东高考考生提供院校专业组筛选、专业方向分析和个性化志愿咨询的智能辅助工具。

## 服务范围

- 仅服务**广东省普通高考考生**
- 覆盖**物理类与历史类**本科批
- 基于**广东省排位**进行分析
- 包含**2023、2024、2025**年招生数据
- 支持**院校专业组**投档数据查询

## 技术栈

- **前端**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **后端**: Next.js API Routes, Node.js
- **数据库**: SQLite + Prisma ORM
- **AI**: DeepSeek API（可选）
- **数据处理**: Python 3 + SQLite

## 快速开始

### 环境要求

- Node.js 22+
- Python 3.10+
- npm 10+

### 安装

```bash
# 克隆项目
cd yuezhitong

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入 DeepSeek API Key（可选）

# 初始化数据库
DATABASE_URL="file:dev.db" npx prisma db push

# 运行数据管道
bash scripts/run_pipeline.sh
```

### 启动

```bash
# 开发模式
npm run dev

# 生产构建
npm run build
npm start
```

访问 http://localhost:3000

## 数据目录结构

```
data/
  sources/           # 数据来源索引
  raw/               # 原始下载文件
    2023/
    2024/
    2025/
  normalized/        # 标准化清洗数据
    2023/
    2024/
    2025/
  verified/          # 校验通过数据
  rejected/          # 已拒绝数据
  review/            # 待人工复核
```

## 数据来源

- **A级**: 广东省教育考试院、广东省教育厅、教育部、教育部阳光高考平台、高校招生官网
- **B级**: 高校官方微信公众号、官方新闻稿、政府开放数据平台

## 数据校验规则

1. 年份绝对隔离：不同年份数据独立存储，不得合并
2. 科类严格分离：物理类与历史类数据不混合
3. 批次分离：本科批与其他批次数据不混合
4. 排位校验：排除异常排位值
5. 分数校验：分数必须在0-750合理区间
6. 来源校验：必须有权威官方来源
7. 双重验证：关键数据须有A级来源交叉验证

## 推荐算法

1. 按广东、年份、科类和批次筛选
2. 选科硬条件过滤
3. 地区、学费和院校性质过滤
4. 历年排位趋势计算
5. 招生计划变化分析
6. 数据完整度评估
7. 冲稳保分层

推荐层级：冲刺 → 偏冲 → 稳妥 → 偏稳 → 保底 → 数据不足

## 更新数据

```bash
# 重新运行完整数据管道
bash scripts/run_pipeline.sh

# 或分步执行
python3 scripts/collect_data.py    # 构建来源索引
python3 scripts/generate_demo_data.py  # 生成演示数据
python3 scripts/validate_data.py   # 校验数据
python3 scripts/seed_db.py         # 导入数据库
```

## 更新下一年度数据

1. 在 `data/raw/` 下创建新年度目录
2. 在 `data/normalized/` 下创建新年度目录
3. 更新 `scripts/generate_demo_data.py` 中的年份列表
4. 从广东省教育考试院获取官方投档数据
5. 运行 `bash scripts/run_pipeline.sh`

## 免责声明

本系统仅面向广东省普通高考考生，根据官方公开招生信息和用户提供的信息进行初步分析，仅供志愿研究与信息整理参考，不构成官方录取预测、志愿填报承诺或专业决策建议。最终填报请以广东省教育考试院和高校招生章程为准。

## 部署

```bash
npm run build
# 部署 .next/ 到服务器
# 确保 DATABASE_URL 环境变量正确设置
```

## 许可证

MIT
