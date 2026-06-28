const OFFICIAL_DATA_DISCLAIMER =
  '本系统内置的是广东省教育考试院公开发布的历史院校专业组投档数据，不是具体专业录取数据，也不是2026年招生计划。历史投档结果仅供研究参考。2026年院校代码、院校专业组代码、招生专业、选科要求、招生计划、收费标准和录取规则，必须以广东省教育考试院官方志愿系统、《广东省2026年普通高等学校招生专业目录》及高校2026年招生章程为准。'

function normalizeText(value) {
  return String(value ?? '').trim().toLowerCase()
}

function searchOfficialRecords(records, options = {}) {
  const year = Number(options.year) || 0
  const category = options.category || ''
  const query = normalizeText(options.query)
  const limit = Number(options.limit) || 80
  return (Array.isArray(records) ? records : [])
    .filter((row) => !year || Number(row.admissionYear) === year)
    .filter((row) => !category || row.category === category)
    .filter((row) => {
      if (!query) return true
      return normalizeText(row.institutionName).includes(query)
        || normalizeText(row.institutionCode).includes(query)
        || normalizeText(row.groupCode).includes(query)
    })
    .slice(0, limit)
}

function getReliableTrendRows(records, target) {
  if (!target) return []
  return (Array.isArray(records) ? records : [])
    .filter((row) => row.category === target.category)
    .filter((row) => row.institutionCode === target.institutionCode)
    .filter((row) => row.institutionName === target.institutionName)
    .filter((row) => row.groupCode === target.groupCode)
    .sort((a, b) => Number(a.admissionYear) - Number(b.admissionYear))
}

function rankTier(userRank, minimumRank) {
  if (!userRank || !minimumRank) return '数据不足'
  const diffRatio = (minimumRank - userRank) / userRank
  if (diffRatio < -0.18) return '冲刺'
  if (diffRatio < -0.05) return '偏冲'
  if (diffRatio <= 0.08) return '稳妥'
  if (diffRatio <= 0.22) return '偏稳'
  return '保底'
}

function buildHistoricalReferencePool(records, profile = {}) {
  const userRank = Number(profile.rank) || 0
  const category = profile.category || ''
  if (!userRank || !category) return []
  return (Array.isArray(records) ? records : [])
    .filter((row) => row.category === category)
    .filter((row) => Number.isInteger(row.minimumRank) && row.minimumRank > 0)
    .map((row) => {
      const distance = Math.abs(Number(row.minimumRank) - userRank)
      return {
        ...row,
        label: '历史参考候选',
        tier: rankTier(userRank, Number(row.minimumRank)),
        rankDistance: distance,
        requires2026Verification: true,
        warning: '这只是历史投档参考，不是2026官方可填志愿。请回到2026招生专业目录或官方系统核验。',
      }
    })
    .sort((a, b) => a.rankDistance - b.rankDistance)
    .slice(0, 120)
}

function buildHistoricalCandidate(row) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    institutionName: row?.institutionName || '',
    institutionCode: '',
    groupCode: '',
    majors: '',
    obeyAdjustment: true,
    schoolType: '',
    city: '',
    tuition: null,
    rank2023: row?.admissionYear === 2023 ? row.minimumRank : null,
    rank2024: row?.admissionYear === 2024 ? row.minimumRank : null,
    rank2025: row?.admissionYear === 2025 ? row.minimumRank : null,
    plan2026: null,
    sourceUrl: row?.sourcePageUrl || '',
    subjectRequirement: '',
    note: `历史参考：${row?.admissionYear || ''}年${row?.category || ''}，历史专业组${row?.groupCode || ''}，最低排位${row?.minimumRank ?? '空'}。2026院校代码、专业组代码、招生专业、计划和学费必须由用户按官方目录补充。`,
    sourceHistoricalYear: row?.admissionYear || null,
    sourceHistoricalCategory: row?.category || '',
    sourceHistoricalGroupCode: row?.groupCode || '',
    sourceHistoricalMinimumRank: row?.minimumRank ?? null,
    sourceHistoricalMinimumScore: row?.minimumScore ?? null,
    userMustFill2026Fields: true,
  }
}

module.exports = {
  OFFICIAL_DATA_DISCLAIMER,
  buildHistoricalCandidate,
  buildHistoricalReferencePool,
  getReliableTrendRows,
  searchOfficialRecords,
}
