const TIERS = ['冲刺', '偏冲', '稳妥', '偏稳', '保底', '数据不足']

const PUBLIC_DISCLAIMER =
  '本系统内置的是广东省教育考试院公开发布的历史院校专业组投档数据，不是具体专业录取数据，也不是2026年招生计划。历史投档结果仅供研究参考，不构成录取预测或志愿填报承诺。2026年院校代码、院校专业组代码、招生专业、选科要求、招生计划、收费标准和录取规则，必须以广东省教育考试院志愿填报系统、《广东省2026年普通高等学校招生专业目录》及高校2026年招生章程为准。本工具不保证录取，不自动提交志愿，不收集志愿系统密码；用户输入默认保存在本机浏览器，清除浏览器数据可能导致方案丢失，建议导出备份。'

const OFFICIAL_CHECKLIST = [
  '是否来自《广东省2026年普通高等学校招生专业目录》',
  '院校代码是否为2026年代码',
  '专业组代码是否为2026年代码',
  '选科要求是否符合',
  '是否存在体检限制',
  '是否为中外合作、联合培养或高收费专业',
  '学费和住宿费是否确认',
  '校区是否确认',
  '专业录取规则是否确认',
  '是否存在单科成绩要求',
  '是否接受调剂',
  '是否阅读高校2026招生章程',
  '是否已在广东官方志愿系统验证代码',
  '是否完成网上最终确认',
]

function toText(value) {
  return value == null ? '' : String(value).trim()
}

function toNumberOrNull(value) {
  if (value == null || value === '') return null
  const text = String(value).replace(/[,，\s]/g, '')
  if (!text) return null
  const number = Number(text)
  return Number.isFinite(number) ? number : null
}

function normalizeCandidate(input) {
  const raw = input || {}
  return {
    id: toText(raw.id) || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    institutionName: toText(raw.institutionName),
    institutionCode: toText(raw.institutionCode),
    groupCode: toText(raw.groupCode),
    majors: toText(raw.majors || raw.majorNames || raw.majorName),
    obeyAdjustment: raw.obeyAdjustment !== false,
    schoolType: toText(raw.schoolType) || '公办',
    city: toText(raw.city),
    tuition: toNumberOrNull(raw.tuition),
    rank2023: toNumberOrNull(raw.rank2023),
    rank2024: toNumberOrNull(raw.rank2024),
    rank2025: toNumberOrNull(raw.rank2025),
    plan2026: toNumberOrNull(raw.plan2026),
    sourceUrl: toText(raw.sourceUrl),
    subjectRequirement: toText(raw.subjectRequirement),
    category: toText(raw.category),
    note: toText(raw.note),
  }
}

function getRankValues(candidate) {
  return [
    { year: 2023, rank: candidate.rank2023 },
    { year: 2024, rank: candidate.rank2024 },
    { year: 2025, rank: candidate.rank2025 },
  ].filter((item) => Number.isFinite(item.rank) && item.rank > 0)
}

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null
}

function calculateTier(userRank, candidate) {
  const ranks = getRankValues(candidate).map((item) => item.rank)
  if (!Number.isFinite(userRank) || userRank <= 0 || ranks.length < 2) return '数据不足'
  const avg = average(ranks)
  const ratio = userRank / avg
  if (ratio <= 0.78) return '保底'
  if (ratio <= 0.9) return '偏稳'
  if (ratio <= 1.03) return '稳妥'
  if (ratio <= 1.15) return '偏冲'
  return '冲刺'
}

function rankStats(candidate) {
  const ranks = getRankValues(candidate)
  const values = ranks.map((item) => item.rank)
  const avg = average(values)
  if (!avg) return { years: ranks, averageRank: null, fluctuation: null }
  const min = Math.min(...values)
  const max = Math.max(...values)
  return {
    years: ranks,
    averageRank: Math.round(avg),
    fluctuation: Math.round(((max - min) / avg) * 1000) / 10,
  }
}

function requirementMatches(profile, candidate) {
  const requirement = candidate.subjectRequirement
  if (!requirement) return true
  const subjects = new Set((profile.subjects || []).map((item) => String(item)))
  if (candidate.category && candidate.category !== profile.category) return false
  if (/物理/.test(requirement) && !subjects.has('物理')) return false
  if (/历史/.test(requirement) && !subjects.has('历史')) return false
  if (/化学/.test(requirement) && !subjects.has('化学')) return false
  if (/生物/.test(requirement) && !subjects.has('生物')) return false
  if (/政治|思想政治/.test(requirement) && !subjects.has('政治')) return false
  if (/地理/.test(requirement) && !subjects.has('地理')) return false
  return true
}

function includesAny(text, needles) {
  if (!text || !needles || needles.length === 0) return false
  return needles.some((needle) => needle && text.includes(needle))
}

function analyzeCandidate(profile, candidate, duplicateKeyCount) {
  const normalized = normalizeCandidate(candidate)
  const tier = calculateTier(Number(profile.rank), normalized)
  const stats = rankStats(normalized)
  const warnings = []
  const errors = []

  if (!normalized.institutionName) errors.push('院校名称为空，请回到官方资料核对后补充。')
  if (!normalized.institutionCode) errors.push('院校代码为空，请填写2026年院校代码。')
  if (!normalized.groupCode) errors.push('院校专业组代码为空，请填写2026年专业组代码。')
  if (stats.years.length === 0) warnings.push('近三年最低排位均为空，系统不会自动补造历史数据。')
  if (stats.years.length > 0 && stats.years.length < 2) warnings.push('历史最低排位少于2年，不得作为可靠保底判断。')
  if (!requirementMatches(profile, normalized)) warnings.push('候选项的选科要求与考生科类或选科组合可能不匹配，请回到官方系统核对。')
  if (normalized.tuition != null && Number(profile.maxTuition) > 0 && normalized.tuition > Number(profile.maxTuition)) {
    warnings.push(`预计学费 ${normalized.tuition} 元/年超过预算 ${profile.maxTuition} 元/年。`)
  }
  if (!profile.acceptPrivate && /民办|独立学院/.test(normalized.schoolType)) warnings.push('用户设置为不接受民办，该候选为民办或独立学院。')
  if (!profile.acceptSinoForeign && /中外|合作|联合培养|高收费/.test(`${normalized.schoolType} ${normalized.majors} ${normalized.note}`)) {
    warnings.push('用户设置为不接受中外合作/高收费，该候选可能涉及相关类型。')
  }
  if (profile.acceptAdjustment && !normalized.obeyAdjustment) warnings.push('该候选项不服从调剂，存在组内退档或专业满足风险。')
  if (!profile.acceptAdjustment && normalized.obeyAdjustment) warnings.push('考生总体不接受调剂，但该候选标记为服从调剂，请确认是否一致。')
  if (profile.preferredCities?.length && normalized.city && !profile.preferredCities.some((city) => normalized.city.includes(city))) {
    warnings.push('所在城市不在当前城市偏好中。')
  }
  if (includesAny(normalized.majors, profile.rejectedMajors || [])) warnings.push('组内拟报专业包含用户排斥专业关键词。')
  if (normalized.sourceUrl && !/^https?:\/\//i.test(normalized.sourceUrl)) warnings.push('官方来源链接格式可能不正确。')
  if (duplicateKeyCount > 1) warnings.push('该院校代码和专业组代码与其他候选重复，请检查是否重复添加。')
  if (stats.fluctuation != null && stats.fluctuation >= 18) warnings.push(`近三年最低排位波动约 ${stats.fluctuation}%，需要谨慎判断梯度。`)
  if (tier === '冲刺') warnings.push('该候选按当前阈值属于冲刺项，不应集中放置过多。')

  const reason = buildReason(profile, normalized, tier, stats)

  return {
    ...normalized,
    tier,
    rankStats: stats,
    warnings,
    errors,
    reason,
    score: tierScore(tier, warnings.length, errors.length),
  }
}

function buildReason(profile, candidate, tier, stats) {
  const rank = Number(profile.rank)
  const basis = stats.averageRank
    ? `近年最低排位平均约 ${stats.averageRank.toLocaleString()}，考生排位为 ${rank.toLocaleString()}。`
    : '历史排位数据不足，无法形成稳定梯度判断。'
  const text = {
    冲刺: '考生排位明显靠后于该组近年位置，建议只作为冲刺研究。',
    偏冲: '考生排位略靠后于该组近年位置，存在一定不确定性。',
    稳妥: '考生排位与该组近年位置接近，仍需结合2026计划和专业规则核实。',
    偏稳: '考生排位优于该组近年位置，但仍需确认2026招生计划、选科和专业规则。',
    保底: '考生排位明显优于该组近年位置，可作为保底研究对象之一。',
    数据不足: '近年排位数据不足，不能作为可靠保底或稳妥依据。',
  }[tier]
  return `${basis}${text}`
}

function tierScore(tier, warningCount, errorCount) {
  const base = { 冲刺: 10, 偏冲: 20, 稳妥: 30, 偏稳: 40, 保底: 50, 数据不足: 60 }[tier] || 70
  return base + warningCount * 2 + errorCount * 10
}

function analyzeVolunteerPlan(profileInput, candidateInputs) {
  const profile = {
    ...profileInput,
    subjects: profileInput.subjects || profileInput.selectedSubjects || [],
    preferredCities: profileInput.preferredCities || [],
    rejectedMajors: profileInput.rejectedMajors || profileInput.excludedMajors || [],
  }
  const candidates = (candidateInputs || []).map(normalizeCandidate)
  const keyCounts = new Map()
  for (const item of candidates) {
    const key = `${item.institutionCode || '空'}|${item.groupCode || '空'}`
    keyCounts.set(key, (keyCounts.get(key) || 0) + 1)
  }

  const items = candidates.map((item) => {
    const key = `${item.institutionCode || '空'}|${item.groupCode || '空'}`
    return analyzeCandidate(profile, item, keyCounts.get(key) || 0)
  })

  const distribution = TIERS.reduce((acc, tier) => {
    acc[tier] = items.filter((item) => item.tier === tier).length
    return acc
  }, {})
  const globalWarnings = []
  const repeated = [...keyCounts.entries()].filter(([key, count]) => key !== '空|空' && count > 1)
  if (repeated.length) globalWarnings.push('存在重复院校代码和专业组代码，请合并或删除重复候选项。')
  if (distribution['保底'] < 2) globalWarnings.push('保底数量不足，建议至少准备2个经官方核实且历史数据较完整的保底候选。')
  if (distribution['冲刺'] + distribution['偏冲'] > Math.max(4, Math.ceil(items.length * 0.45))) {
    globalWarnings.push('冲刺项偏多，整体梯度可能过于集中。')
  }
  if (items.some((item) => item.rankStats.years.length < 2)) globalWarnings.push('部分候选历史数据缺失，不能用AI或系统自动补齐。')
  if (items.some((item) => item.errors.length)) globalWarnings.push('存在院校代码或专业组代码等关键字段缺失，提交官方系统前必须补齐。')

  return {
    profile,
    items,
    distribution,
    globalWarnings,
    suggestedOrder: [...items].sort((a, b) => a.score - b.score),
    checklist: OFFICIAL_CHECKLIST,
    disclaimer: PUBLIC_DISCLAIMER,
  }
}

function splitCsvLine(line, delimiter) {
  const cells = []
  let current = ''
  let quoted = false
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"'
        index += 1
      } else {
        quoted = !quoted
      }
    } else if (char === delimiter && !quoted) {
      cells.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  cells.push(current.trim())
  return cells
}

function detectDelimiter(text) {
  const firstLine = text.split(/\r?\n/).find((line) => line.trim()) || ''
  return firstLine.includes('\t') ? '\t' : ','
}

function headerKey(header) {
  const text = header.replace(/\s/g, '')
  if (/院校名称|学校名称/.test(text)) return 'institutionName'
  if (/院校代码|学校代码/.test(text)) return 'institutionCode'
  if (/专业组代码|院校专业组代码|组代码/.test(text)) return 'groupCode'
  if (/专业名称|拟报专业|组内.*专业/.test(text)) return 'majors'
  if (/服从|调剂/.test(text)) return 'obeyAdjustment'
  if (/办学性质|院校性质|性质/.test(text)) return 'schoolType'
  if (/城市|所在地|地区/.test(text)) return 'city'
  if (/学费|收费/.test(text)) return 'tuition'
  if (/2023.*排位|23.*排位/.test(text)) return 'rank2023'
  if (/2024.*排位|24.*排位/.test(text)) return 'rank2024'
  if (/2025.*排位|25.*排位/.test(text)) return 'rank2025'
  if (/2026.*计划|招生计划|计划数/.test(text)) return 'plan2026'
  if (/来源|链接|网址/.test(text)) return 'sourceUrl'
  if (/选科/.test(text)) return 'subjectRequirement'
  if (/备注/.test(text)) return 'note'
  return null
}

function parseCandidatePaste(text) {
  const lines = String(text || '').split(/\r?\n/).filter((line) => line.trim())
  if (!lines.length) return { validRows: [], errors: [{ row: 0, message: '粘贴内容为空' }] }
  const delimiter = detectDelimiter(text)
  const header = splitCsvLine(lines[0], delimiter)
  const keys = header.map(headerKey)
  const validRows = []
  const errors = []

  lines.slice(1).forEach((line, index) => {
    const rowNumber = index + 2
    const cells = splitCsvLine(line, delimiter)
    const raw = {}
    cells.forEach((cell, cellIndex) => {
      const key = keys[cellIndex]
      if (key) raw[key] = cell
    })
    const item = normalizeCandidate({
      ...raw,
      obeyAdjustment: raw.obeyAdjustment ? !/否|不|no/i.test(raw.obeyAdjustment) : true,
    })
    const rowErrors = []
    if (!item.institutionName) rowErrors.push('院校名称为空')
    if (!item.groupCode) rowErrors.push('专业组代码为空')
    ;['rank2023', 'rank2024', 'rank2025', 'tuition', 'plan2026'].forEach((field) => {
      if (raw[field] && item[field] == null) rowErrors.push(`${field} 不是有效数字`)
    })
    if (rowErrors.length) errors.push({ row: rowNumber, message: rowErrors.join('；'), raw: line })
    else validRows.push(item)
  })

  return { validRows, errors, delimiter }
}

function serializeForCsv(items) {
  const header = ['院校名称', '院校代码', '专业组代码', '组内拟报专业', '分层', '城市', '学费', '2023排位', '2024排位', '2025排位', '2026计划', '风险提示']
  const rows = items.map((item) => [
    item.institutionName,
    item.institutionCode,
    item.groupCode,
    item.majors,
    item.tier,
    item.city,
    item.tuition ?? '',
    item.rank2023 ?? '',
    item.rank2024 ?? '',
    item.rank2025 ?? '',
    item.plan2026 ?? '',
    [...item.errors, ...item.warnings].join('；'),
  ])
  return [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
}

module.exports = {
  TIERS,
  PUBLIC_DISCLAIMER,
  OFFICIAL_CHECKLIST,
  normalizeCandidate,
  analyzeVolunteerPlan,
  parseCandidatePaste,
  serializeForCsv,
}
