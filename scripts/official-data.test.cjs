const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const publicDir = path.join(root, 'public', 'data', 'official')

const expectedFiles = {
  '2023-history.json': { year: 2023, category: '历史类', count: 1511, first: ['10001', '北京大学', '202', 670, 31] },
  '2023-physics.json': { year: 2023, category: '物理类', count: 2666, first: ['10001', '北京大学', '203', 694, 84] },
  '2024-history.json': { year: 2024, category: '历史类', count: 1560, first: ['10001', '北京大学', '201', 662, 32] },
  '2024-physics.json': { year: 2024, category: '物理类', count: 3121, first: ['10001', '北京大学', '203', 689, 85] },
  '2025-history.json': { year: 2025, category: '历史类', count: 1637, first: ['10001', '北京大学', '205', 669, 28] },
  '2025-physics.json': { year: 2025, category: '物理类', count: 3503, first: ['10001', '北京大学', '206', 689, 99] },
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(publicDir, file), 'utf8'))
}

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

test('publishes six split official data files with verified counts', () => {
  for (const [file, expected] of Object.entries(expectedFiles)) {
    const records = readJson(file)
    assert.strictEqual(records.length, expected.count, `${file} record count`)
    const first = records[0]
    assert.deepStrictEqual(
      [first.institutionCode, first.institutionName, first.groupCode, first.minimumScore, first.minimumRank],
      expected.first,
      `${file} first row`
    )
    assert(records.every((row) => row.admissionYear === expected.year), `${file} year isolation`)
    assert(records.every((row) => row.category === expected.category), `${file} category isolation`)
    assert(records.every((row) => row.batch === '本科批'), `${file} batch isolation`)
  }
})

test('official data records are source-backed and never demo data', () => {
  let total = 0
  for (const file of Object.keys(expectedFiles)) {
    const records = readJson(file)
    total += records.length
    for (const row of records) {
      assert.strictEqual(row.province, '广东')
      assert.strictEqual(row.sourceOrganization, '广东省教育考试院')
      assert(row.sourcePageUrl.startsWith('https://eea.gd.gov.cn/'), row.sourcePageUrl)
      assert(row.sourceAttachmentName)
      assert.match(row.sourceFileHash, /^[a-f0-9]{64}$/)
      assert.strictEqual(row.dataGranularity, '院校专业组投档')
      assert.strictEqual(row.isMajorAdmissionScore, false)
      assert.strictEqual(row.isDemo, false)
      assert.notStrictEqual(row.sourcePageUrl, 'https://eea.gd.gov.cn/')
    }
  }
  assert.strictEqual(total, 13998)
})

test('official data has no duplicate unique keys or invalid numeric fields', () => {
  for (const file of Object.keys(expectedFiles)) {
    const seen = new Set()
    for (const row of readJson(file)) {
      const key = `${row.admissionYear}|${row.category}|${row.institutionCode}|${row.groupCode}`
      assert(!seen.has(key), `duplicate key ${key}`)
      seen.add(key)
      assert(row.institutionName && row.institutionName.trim())
      assert(row.groupCode && row.groupCode.trim())
      assert(row.minimumScore === null || (Number.isInteger(row.minimumScore) && row.minimumScore >= 100 && row.minimumScore <= 750))
      assert(row.minimumRank === null || (Number.isInteger(row.minimumRank) && row.minimumRank > 0))
      assert(row.planCount === null || (Number.isInteger(row.planCount) && row.planCount >= 0))
      assert(row.submittedCount === null || (Number.isInteger(row.submittedCount) && row.submittedCount >= 0))
    }
  }
})

test('catalog and public manifest describe only published official records', () => {
  const catalog = readJson('catalog.json')
  assert.strictEqual(catalog.version, 'guangdong-undergraduate-group-filing-2023-2025')
  assert.strictEqual(catalog.totalRecords, 13998)
  assert.strictEqual(catalog.demoRecords, 0)
  assert.strictEqual(catalog.placeholderSources, 0)
  assert.strictEqual(catalog.reviewRecords, 0)
  assert.strictEqual(catalog.rejectedRecords, 0)
  assert.strictEqual(Object.keys(catalog.files).length, 6)

  const manifest = readJson('source-manifest.public.json')
  assert.strictEqual(manifest.length, 4)
  assert(manifest.every((entry) => entry.sourceAttachmentUrl.startsWith('https://eea.gd.gov.cn/')))
  assert(manifest.every((entry) => entry.sha256 && /^[a-f0-9]{64}$/.test(entry.sha256)))
})

test('sample verification records sixty perfect source matches', () => {
  const doc = fs.readFileSync(path.join(root, 'docs', 'OFFICIAL_DATA_SAMPLE_VERIFICATION.md'), 'utf8')
  assert(doc.includes('抽样数量：60'))
  assert(doc.includes('完全一致数量：60'))
  assert(doc.includes('不一致数量：0'))
})

if (process.exitCode) process.exit(process.exitCode)
