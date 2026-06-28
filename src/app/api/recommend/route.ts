import { NextRequest, NextResponse } from 'next/server'
import { validateProfile } from '@/lib/validation'
import { getRecommendations } from '@/lib/recommendation-engine'
import { checkRateLimit } from '@/lib/validation'
import { getCached, setCache } from '@/lib/cache'

export async function POST(request: NextRequest) {
  try {
    // 速率限制
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    if (!checkRateLimit(ip, 20, 60000)) {
      return NextResponse.json({ error: '请求过于频繁，请稍候再试' }, { status: 429 })
    }

    const body = await request.json()
    const validation = validateProfile(body)
    if (!validation.success) {
      return NextResponse.json({ error: '输入数据校验失败', details: validation.errors }, { status: 400 })
    }

    const profile = validation.data!

    // 检查缓存
    const cacheKey = `recommend:${JSON.stringify(profile)}`
    const cached = getCached(cacheKey)
    if (cached) return NextResponse.json(cached)

    const results = await getRecommendations(profile)

    // 分组并限制每层最多5个
    const tiers: Record<string, typeof results> = {}
    for (const r of results) {
      if (!tiers[r.tier]) tiers[r.tier] = []
      if (tiers[r.tier].length < 5) tiers[r.tier].push(r)
    }

    const response = {
      profile,
      tiers: Object.entries(tiers).map(([tier, items]) => ({
        tier,
        count: items.length,
        items,
      })),
      totalResults: results.length,
      dataYear: profile.admissionYear,
      isDemoData: false,
      dataGranularity: '院校专业组投档（非具体专业录取数据）',
      dataNote: '推荐结果基于院校专业组历史投档排位，组内各专业实际录取可能存在差异。最终招生专业和计划以目标年度官方招生专业目录为准。',
      availableHistoryYears: [profile.admissionYear - 2, profile.admissionYear - 1].filter(y => y >= 2023),
    }

    // 缓存5分钟
    setCache(cacheKey, response, 5 * 60 * 1000)

    return NextResponse.json(response)
  } catch (error) {
    console.error('Recommend API error:', error)
    return NextResponse.json({ error: '推荐计算失败，请稍后重试' }, { status: 500 })
  }
}
