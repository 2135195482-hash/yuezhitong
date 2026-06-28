import { NextRequest, NextResponse } from 'next/server'
import { validateProfile } from '@/lib/validation'
import { generateReport } from '@/lib/deepseek'
import { checkRateLimit } from '@/lib/validation'

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    if (!checkRateLimit(ip, 5, 60000)) {
      return NextResponse.json({ error: 'AI报告生成过于频繁，请稍候再试' }, { status: 429 })
    }

    const body = await request.json()
    const validation = validateProfile(body.profile)
    if (!validation.success) {
      return NextResponse.json({ error: '输入数据校验失败' }, { status: 400 })
    }

    const result = await generateReport({
      profile: body.profile,
      recommendations: body.recommendations || [],
      question: body.question,
      history: body.history,
    })

    if (result === null) {
      return NextResponse.json({
        report: 'AI报告服务当前不可用。基础推荐结果已就绪，请查看下方的冲稳保分层建议。您可以稍后重试AI报告功能。',
        aiUnavailable: true,
      })
    }

    return NextResponse.json({ report: result, aiUnavailable: false })
  } catch (error) {
    console.error('Report API error:', error)
    return NextResponse.json({
      report: 'AI报告生成遇到问题。基础推荐结果已就绪，请查看下方的冲稳保分层建议。',
      aiUnavailable: true,
    })
  }
}
