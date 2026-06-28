# 粤志通 使用指南

## 一、环境准备

你需要安装：
- **Node.js** 22+ ：https://nodejs.org/
- **Python** 3.10+ ：https://www.python.org/
- **Git**（可选）

验证安装：
```cmd
node --version
npm --version
python --version
```

## 二、安装依赖

打开命令提示符（CMD）或 PowerShell，进入项目目录：

```cmd
cd D:\高考志愿填报系统\yuezhitong
npm install
```

## 三、配置环境变量

```cmd
copy .env.example .env
```

编辑 `.env` 文件：
- `DEEPSEEK_API_KEY`：填入你的 DeepSeek API Key（可选，没有也可用基础功能）
- 数据库路径无需修改

## 四、初始化数据库并填充演示数据

```cmd
# 1. 生成 Prisma Client
npx prisma generate

# 2. 创建数据库表
npx prisma db push --accept-data-loss

# 3. 生成演示数据
python scripts\collect_data.py
python scripts\generate_demo_data.py
python scripts\validate_data.py
python scripts\seed_db.py
```

或者一键运行：
```cmd
bash scripts\run_pipeline.sh
```

## 五、启动

```cmd
npm run dev
```

浏览器打开：**http://localhost:3000**

## 六、使用流程

1. 打开首页 → 点击「开始咨询」
2. 填写问卷：
   - 选择目标年份（2023/2024/2025）
   - 选择科类（物理类/历史类）
   - 选择选科组合
   - 输入分数和排位
   - 选择城市、专业偏好
   - 设置学费、院校性质等约束
3. 提交 → 查看推荐结果
4. 结果页包含：冲/稳/保分层、历年排位数据、风险说明、数据来源
5. AI报告（如有DeepSeek API Key）

## 七、生产构建

```cmd
npm run build
npm start
```

## 八、常见问题

**Q: npm install 失败？**
A: 尝试 `npm install --legacy-peer-deps`

**Q: 数据库报错？**
A: 删除 `prisma\dev.db` 后重新执行 `npx prisma db push --accept-data-loss`

**Q: 如何更新数据？**
A: 运行 `python scripts\run_pipeline.sh`

**Q: DeepSeek API 不可用？**
A: 基础推荐功能不依赖 AI，仍可正常使用。AI 报告会显示服务不可用的提示。
