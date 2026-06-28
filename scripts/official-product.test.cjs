const assert = require('assert')

const {
  buildHistoricalCandidate,
  buildHistoricalReferencePool,
  getReliableTrendRows,
  searchOfficialRecords,
} = require('../src/lib/official-data')

function test(name, fn) {
  try {
    fn()
    console.log(`ok - ${name}`)
  } catch (error) {
    console.error(`not ok - ${name}`)
    console.error(error.stack || error.message)
    process.exitCode = 1
  }
}

const records = [
  { admissionYear: 2023, category: '物理类', institutionCode: '10001', institutionName: '北京大学', groupCode: '203', minimumRank: 84, minimumScore: 694, planCount: 24, submittedCount: 30, sourcePageUrl: 'https://eea.gd.gov.cn/a', sourceAttachmentName: '2023.zip', dataGranularity: '院校专业组投档' },
  { admissionYear: 2024, category: '物理类', institutionCode: '10001', institutionName: '北京大学', groupCode: '203', minimumRank: 85, minimumScore: 689, planCount: 24, submittedCount: 28, sourcePageUrl: 'https://eea.gd.gov.cn/b', sourceAttachmentName: '2024.zip', dataGranularity: '院校专业组投档' },
  { admissionYear: 2025, category: '物理类', institutionCode: '10001', institutionName: '北京大学', groupCode: '206', minimumRank: 99, minimumScore: 689, planCount: 34, submittedCount: 35, sourcePageUrl: 'https://eea.gd.gov.cn/c', sourceAttachmentName: '2025.pdf', dataGranularity: '院校专业组投档' },
  { admissionYear: 2025, category: '历史类', institutionCode: '10001', institutionName: '北京大学', groupCode: '205', minimumRank: 28, minimumScore: 669, planCount: 24, submittedCount: 24, sourcePageUrl: 'https://eea.gd.gov.cn/d', sourceAttachmentName: '2025.pdf', dataGranularity: '院校专业组投档' },
  { admissionYear: 2025, category: '物理类', institutionCode: '10590', institutionName: '深圳大学', groupCode: '221', minimumRank: 22500, minimumScore: 605, planCount: 80, submittedCount: 80, sourcePageUrl: 'https://eea.gd.gov.cn/e', sourceAttachmentName: '2025.pdf', dataGranularity: '院校专业组投档' },
]

test('searches official records by year category name and code', () => {
  const byName = searchOfficialRecords(records, { year: 2025, category: '物理类', query: '深圳' })
  assert.strictEqual(byName.length, 1)
  assert.strictEqual(byName[0].institutionName, '深圳大学')

  const byCode = searchOfficialRecords(records, { year: 2025, category: '物理类', query: '10001' })
  assert.strictEqual(byCode.length, 1)
  assert.strictEqual(byCode[0].groupCode, '206')
})

test('does not connect trends by group code alone', () => {
  const trend = getReliableTrendRows(records, records[2])
  assert.deepStrictEqual(trend.map((row) => row.admissionYear), [2025])
})

test('connects trends only when institution code name group and category all match', () => {
  const trend = getReliableTrendRows(records, records[1])
  assert.deepStrictEqual(trend.map((row) => row.admissionYear), [2023, 2024])
})

test('builds historical reference pool without 2026 claims', () => {
  const pool = buildHistoricalReferencePool(records, { category: '物理类', rank: 24000 })
  assert(pool.length > 0)
  assert(pool.every((item) => item.label === '历史参考候选'))
  assert(pool.every((item) => item.requires2026Verification === true))
  assert(pool.every((item) => item.category === '物理类'))
  assert(pool.some((item) => item.institutionName === '深圳大学'))
})

test('converts official history row into a user-editable candidate shell', () => {
  const candidate = buildHistoricalCandidate(records[4])
  assert.strictEqual(candidate.institutionName, '深圳大学')
  assert.strictEqual(candidate.institutionCode, '')
  assert.strictEqual(candidate.groupCode, '')
  assert.strictEqual(candidate.sourceHistoricalGroupCode, '221')
  assert.strictEqual(candidate.sourceHistoricalYear, 2025)
  assert.strictEqual(candidate.userMustFill2026Fields, true)
  assert(candidate.note.includes('历史参考'))
})

if (process.exitCode) process.exit(process.exitCode)
