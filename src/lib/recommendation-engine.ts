import { prisma } from './prisma'
import type { UserProfile, EngineResult, RecommendationTier, YearScore } from '@/types'

// 根据用户排位和历年数据计算推荐层级

// Data gate: enforce demo data isolation
const ALLOW_DEMO_DATA = process.env.ALLOW_DEMO_DATA === 'true'
export async function getRecommendations(profile: UserProfile): Promise<EngineResult[]> {
  const { admissionYear, category, rank, preferredCities, excludedCities, majorInterests, excludedMajors, priority, acceptPrivate, acceptSinoForeign, maxTuition, selectedSubjects } = profile

  // 获取目标年份的录取数据
  const targetRecords = await prisma.admissionRecord.findMany({
    where: {
      province: '广东',
      admissionYear,
      category,
      batch: '本科批',
      verificationStatus: { in: ['verified', 'single-source', 'official-primary', 'cross-checked'] },
      NOT: ALLOW_DEMO_DATA ? undefined : { notes: { contains: '演示' } },
    },
    include: {
      institution: true,
    },
    orderBy: { minimumRank: 'asc' },
  })

  if (targetRecords.length === 0) {
    return []
  }

  // 获取前两年数据用于趋势分析
  const historyRecords = await prisma.admissionRecord.findMany({
    where: {
      province: '广东',
      admissionYear: { in: [admissionYear - 1, admissionYear - 2] },
      category,
      batch: '本科批',
      verificationStatus: { in: ['verified', 'single-source', 'official-primary', 'cross-checked'] },
      NOT: ALLOW_DEMO_DATA ? undefined : { notes: { contains: '演示' } },
    },
    include: {
      institution: true,
    },
  })

  // Build history lookup: key = institutionCode|groupCode, value = {year: rank}
  const historyMap = new Map<string, { year: number; rank: number | null; score: number | null; planCount: number | null }[]>()
  for (const r of historyRecords) {
    const key = `${r.institutionCode}|${r.groupCode}`
    if (!historyMap.has(key)) historyMap.set(key, [])
    historyMap.get(key)!.push({ year: r.admissionYear, rank: r.minimumRank, score: r.minimumScore, planCount: r.planCount })
  }

  // 去重: 每个专业组取最低排位记录
  const groupMinMap = new Map<string, typeof targetRecords[0]>()
  for (const r of targetRecords) {
    const key = `${r.institutionCode}|${r.groupCode}`
    const existing = groupMinMap.get(key)
    if (!existing || (r.minimumRank !== null && (existing.minimumRank === null || r.minimumRank < existing.minimumRank))) {
      groupMinMap.set(key, r)
    }
  }

  const results: EngineResult[] = []

  for (const [key, record] of groupMinMap) {
    // 选科过滤
    const subjectReqs: string[] = (() => {
      try { return JSON.parse(record.subjectRequirements || '[]') } catch { return [] }
    })()
    
    const passesSubjectFilter = subjectReqs.length === 0 || subjectReqs.every(s => selectedSubjects.includes(s))
    if (!passesSubjectFilter) continue

    // 地区过滤
    const instCity = record.institution?.city || ''
    if (preferredCities.length > 0 && !preferredCities.some(c => instCity.includes(c))) continue
    if (excludedCities.length > 0 && excludedCities.some(c => instCity.includes(c))) continue

    // 院校性质过滤
    const instType = record.institution?.type || '公办'
    if (!acceptPrivate && (instType === '民办')) continue
    if (!acceptSinoForeign && (instType === '中外合作办学')) continue

    // 历史排名
    const rankHistory = historyMap.get(key) || []

    // 计算推荐层级
    const tier = calculateTier(rank, record.minimumRank, rankHistory)

    // 风险说明
    const riskNotes = buildRiskNotes(record, rankHistory, tier)

    results.push({
      record: {
        id: record.id,
        admissionYear: record.admissionYear,
        category: record.category,
        batch: record.batch,
        institutionCode: record.institutionCode,
        institutionName: record.institutionName,
        groupCode: record.groupCode,
        groupName: record.groupName,
        majorCode: record.majorCode,
        majorName: record.majorName,
        subjectRequirements: record.subjectRequirements,
        planCount: record.planCount,
        minimumScore: record.minimumScore,
        minimumRank: record.minimumRank,
        sourceLevel: record.sourceLevel,
        sourceName: record.sourceName,
        sourceUrl: record.sourceUrl,
        officialTitle: record.officialTitle,
        officialPublishedAt: record.officialPublishedAt,
        verificationStatus: record.verificationStatus,
        dataType: record.dataType,
      },
      institution: record.institution ? {
        type: record.institution.type,
        is985: record.institution.is985,
        is211: record.institution.is211,
        isDoubleFirst: record.institution.isDoubleFirst,
        city: record.institution.city,
        province: record.institution.province,
      } : null,
      tier,
      rankHistory,
      reason: buildReason(record, tier, rank),
      riskNotes,
    })
  }

  // Sort: 冲刺 -> 偏冲 -> 稳妥 -> 偏稳 -> 保底
  const tierOrder: Record<RecommendationTier, number> = { '冲刺': 0, '偏冲': 1, '稳妥': 2, '偏稳': 3, '保底': 4, '数据不足': 5 }
  results.sort((a, b) => tierOrder[a.tier] - tierOrder[b.tier] || (a.record.minimumRank || 999999) - (b.record.minimumRank || 999999))

  return results
}

function calculateTier(userRank: number, groupRank: number | null, history: { year: number; rank: number | null }[]): RecommendationTier {
  if (groupRank === null) return '数据不足'

  // 近年趋势：取历史平均
  const historicalRanks = history.map(h => h.rank).filter(Boolean) as number[]
  const allRanks = [...historicalRanks, groupRank]
  if (allRanks.length < 2) {
    // 只有一年数据
    if (userRank < groupRank * 0.98) return '保底'
    if (userRank < groupRank * 0.995) return '偏稳'
    if (userRank <= groupRank * 1.01) return '稳妥'
    if (userRank <= groupRank * 1.05) return '偏冲'
    return '冲刺'
  }

  const avgRank = allRanks.reduce((a, b) => a + b, 0) / allRanks.length
  const ratio = userRank / avgRank

  if (ratio < 0.95) return '保底'
  if (ratio < 0.985) return '偏稳'
  if (ratio <= 1.01) return '稳妥'
  if (ratio <= 1.05) return '偏冲'
  return '冲刺'
}

function buildReason(record: { institutionName: string; groupCode: string; minimumRank: number | null }, tier: RecommendationTier, userRank: number): string {
  if (tier === '冲刺') return `该院校专业组近三年在广东的最低排位均高于你的当前排位（${userRank}），因此暂列入冲刺组。`
  if (tier === '偏冲') return `该院校专业组近三年在广东的最低排位略高于你的当前排位（${userRank}），有一定机会但需要冲刺。`
  if (tier === '稳妥') return `该院校专业组近三年在广东的最低排位与你的当前排位（${userRank}）接近，列为稳妥选项。`
  if (tier === '偏稳') return `该院校专业组近三年在广东的最低排位低于你的当前排位（${userRank}），录取可能性较大。`
  if (tier === '保底') return `该院校专业组近三年在广东的最低排位明显低于你的当前排位（${userRank}），可作为保底选项。`
  return `目前缺少该院校专业组连续年份的广东官方排位数据，暂不用于稳妥或保底判断。`
}

function buildRiskNotes(record: { verificationStatus: string; dataType: string; planCount: number | null; notes: string }, history: { year: number; rank: number | null; planCount: number | null }[], tier: RecommendationTier): string[] {
  const notes: string[] = []
  if (record.verificationStatus === 'single-source') notes.push('该数据仅为单一官方来源，尚未完成双重验证。')
  if (record.dataType === 'group') notes.push('这是院校专业组投档最低分/排位（非具体专业录取数据），组内各专业实际录取排位可能存在差异。')
  if (history.length < 2) notes.push('该院校专业组历史数据不足，排位趋势可能不够准确。')
  
  // 招生计划变化
  if (history.length >= 2) {
    const latestPlan = record.planCount
    const prevPlans = history.filter(h => h.planCount !== null).map(h => h.planCount!)
    if (prevPlans.length > 0 && latestPlan !== null) {
      const avg = prevPlans.reduce((a, b) => a + b, 0) / prevPlans.length
      if (latestPlan < avg * 0.85) notes.push('招生计划数较往年减少，竞争可能更激烈。')
      if (latestPlan > avg * 1.2) notes.push('招生计划数较往年增加。')
    }
  }
  
  if (record.notes) notes.push(record.notes)
  if (tier === '冲刺') notes.push('冲刺院校存在较大不确定性，建议合理搭配稳妥和保底志愿。')
  
  return notes
}
