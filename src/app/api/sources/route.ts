import { NextResponse } from 'next/server'

const sources = [
  {
    name: '广东省2026年普通高等学校招生专业目录',
    role: '院校代码、院校专业组代码、招生计划、选科要求、收费标准的首要核对来源',
    status: '请以考生本人获取到的官方纸质或电子目录为准',
  },
  {
    name: '广东省教育考试院志愿填报系统与官方辅助系统',
    role: '验证2026年代码、专业组、选科要求，并完成最终网上确认',
    status: '本工具不会登录、读取或提交广东官方志愿系统',
  },
  {
    name: '高校2026年招生章程',
    role: '核对体检限制、单科成绩要求、专业录取规则、校区和高收费项目',
    status: '请逐校逐专业组核实',
  },
]

export async function GET() {
  return NextResponse.json({
    mode: 'volunteer-plan-review-mvp',
    officialDataAvailable: false,
    demoDataUsed: false,
    message:
      '粤志通公测版仅复核用户自行录入的候选志愿方案，不提供官方招生数据库，不读取演示库参与真实推荐。',
    sources,
  })
}
