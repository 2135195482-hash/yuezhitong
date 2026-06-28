# 粤志通 2026 志愿方案复核公测版：本地运行说明

当前公开版本是纯静态应用：不需要账号系统、数据库、API Key、DeepSeek 服务或服务端接口。

## 安装

```powershell
npm ci
```

## 本地开发

```powershell
npm run dev
```

访问 `http://localhost:3000`。

## 本地验证

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npm run test:static
```

## 当前数据策略

- 公开静态数据只包含广东省教育考试院已公开的 2023-2025 普通类本科批院校专业组投档历史数据。
- 内置历史数据不是 2026 年招生计划，不是具体专业录取数据，也不构成录取预测。
- `ALLOW_DEMO_DATA=false`，`demo.db` 不参与公开结果。
- 用户录入的志愿草稿默认保存在浏览器本地，不上传到服务器。

最终填报前，仍必须以《广东省2026年普通高等学校招生专业目录》、广东省教育考试院志愿填报系统及高校 2026 年招生章程为准。
