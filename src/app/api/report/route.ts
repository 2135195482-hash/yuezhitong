import { NextRequest, NextResponse } from 'next/server'
import { buildLocalFallbackExplanation, generatePlanReviewExplanation } from '@/lib/deepseek'
import { checkRateLimit } from '@/lib/validation'

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    if (!checkRateLimit(ip, 5, 60000)) {
      return NextResponse.json({ report: buildLocalFallbackExplanation(), aiUnavailable: true }, { status: 429 })
    }

    const body = await request.json()
    if (body.mode !== 'plan-review') {
      return NextResponse.json({ report: buildLocalFallbackExplanation(), aiUnavailable: true }, { status: 400 })
    }

    const result = await generatePlanReviewExplanation({
      profile: body.profile || {},
      candidates: Array.isArray(body.candidates) ? body.candidates.slice(0, 20) : [],
      localAnalysis: body.localAnalysis || {},
    })

    if (!result) {
      return NextResponse.json({ report: buildLocalFallbackExplanation(), aiUnavailable: true })
    }

    return NextResponse.json({ report: result, aiUnavailable: false })
  } catch (error) {
    console.error('Plan review report API error:', error)
    return NextResponse.json({ report: buildLocalFallbackExplanation(), aiUnavailable: true })
  }
}
