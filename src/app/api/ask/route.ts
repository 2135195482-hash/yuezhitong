import { NextRequest, NextResponse } from 'next/server'
import { sanitizeInput, checkRateLimit } from '@/lib/validation'
import { buildLocalFallbackExplanation, generatePlanReviewExplanation } from '@/lib/deepseek'

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    if (!checkRateLimit(ip, 5, 60000)) {
      return NextResponse.json({ answer: buildLocalFallbackExplanation(), aiUnavailable: true }, { status: 429 })
    }

    const body = await request.json()
    const question = sanitizeInput(body.question || '')
    if (!question || question.length < 2) {
      return NextResponse.json({ error: '请输入有效的问题' }, { status: 400 })
    }

    const result = await generatePlanReviewExplanation({
      profile: body.profile || {},
      candidates: Array.isArray(body.candidates) ? body.candidates.slice(0, 20) : [],
      localAnalysis: {
        ...(body.localAnalysis || {}),
        userQuestion: question,
      },
    })

    if (!result) {
      return NextResponse.json({ answer: buildLocalFallbackExplanation(), aiUnavailable: true })
    }

    return NextResponse.json({ answer: result, aiUnavailable: false })
  } catch (error) {
    console.error('Ask API error:', error)
    return NextResponse.json({ answer: buildLocalFallbackExplanation(), aiUnavailable: true })
  }
}
