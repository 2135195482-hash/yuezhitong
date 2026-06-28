import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    {
      error: '当前公测版不提供自动数据库推荐。请在页面中录入从广东官方渠道获得的候选院校专业组，本工具只进行本地规则复核。',
    },
    { status: 410 },
  )
}
