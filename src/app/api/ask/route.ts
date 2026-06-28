import { NextRequest, NextResponse } from 'next/server'
import { sanitizeInput, checkRateLimit } from '@/lib/validation'
import { generateReport } from '@/lib/deepseek'

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    if (!checkRateLimit(ip, 5, 60000)) {
      return NextResponse.json({ error: '请稍候再提问' }, { status: 429 })
    }

    const body = await request.json()
    const question = sanitizeInput(body.question || '')
    if (!question || question.length < 2) {
      return NextResponse.json({ error: '请输入有效的问题' }, { status: 400 })
    }

    const result = await generateReport({
      profile: body.profile,
      recommendations: body.recommendations || [],
      question,
      history: body.history || [],
    })

    if (result === null) {
      return NextResponse.json({
        answer: 'AI助手当前不可用，请稍后重试。基于数据的推荐结果仍然可用。',
        aiUnavailable: true,
      })
    }

    return NextResponse.json({ answer: result, aiUnavailable: false })
  } catch (error) {
    console.error('Ask API error:', error)
    return NextResponse.json({ answer: '抱歉，AI助手暂时无法响应。请稍后重试。', aiUnavailable: true })
  }
}
