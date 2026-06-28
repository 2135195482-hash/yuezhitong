const fs = require('fs')
const path = require('path')
const assert = require('assert')

const {
  analyzeVolunteerPlan,
  parseCandidatePaste,
  normalizeCandidate,
  OFFICIAL_CHECKLIST,
  PUBLIC_DISCLAIMER,
} = require('../src/lib/plan-review')

function baseProfile(overrides = {}) {
  return {
    category: '物理类',
    subjects: ['物理', '化学', '生物'],
    score: 600,
    rank: 20000,
    maxTuition: 20000,
    preferredCities: ['广州', '深圳'],
    acceptPrivate: false,
    acceptSinoForeign: false,
    acceptAdjustment: true,
    interests: ['计算机', '电子信息'],
    rejectedMajors: ['护理'],
    priority: '专业',
    ...overrides,
  }
}

function candidate(overrides = {}) {
  return normalizeCandidate({
    id: 'c1',
    institutionName: '广东测试大学',
    institutionCode: '12345',
    groupCode: '201',
    majors: '计算机类、软件工程',
    obeyAdjustment: true,
    schoolType: '公办',
    city: '广州',
    tuition: 6850,
    rank2023: 21000,
    rank2024: 20500,
    rank2025: 19800,
    plan2026: 80,
    sourceUrl: 'https://eea.gd.gov.cn/example',
    subjectRequirement: '物理+化学',
    note: '',
    ...overrides,
  })
}

function test(name, fn) {
  try {
    fn()
    console.log(`ok - ${name}`)
  } catch (error) {
    console.error(`not ok - ${name}`)
    throw error
  }
}

test('classifies candidates by user rank against three-year rank average', () => {
  const analysis = analyzeVolunteerPlan(baseProfile(), [
    candidate({ id: 'rush', institutionName: '冲刺大学', rank2023: 12000, rank2024: 13000, rank2025: 12500 }),
    candidate({ id: 'stable', institutionName: '稳妥大学', rank2023: 19800, rank2024: 20200, rank2025: 20000 }),
    candidate({ id: 'safe', institutionName: '保底大学', rank2023: 31000, rank2024: 32000, rank2025: 33000 }),
  ])
  assert.equal(analysis.items.find((i) => i.id === 'rush').tier, '冲刺')
  assert.equal(analysis.items.find((i) => i.id === 'stable').tier, '稳妥')
  assert.equal(analysis.items.find((i) => i.id === 'safe').tier, '保底')
})

test('does not mark candidates with fewer than two rank years as reliable safety choices', () => {
  const analysis = analyzeVolunteerPlan(baseProfile(), [
    candidate({ id: 'one-year', rank2023: null, rank2024: null, rank2025: 45000 }),
  ])
  const item = analysis.items[0]
  assert.equal(item.tier, '数据不足')
  assert(item.warnings.some((warning) => warning.includes('少于2年')))
})

test('flags private, tuition, adjustment, duplicate, empty group code and subject mismatch risks', () => {
  const analysis = analyzeVolunteerPlan(baseProfile({ acceptAdjustment: true }), [
    candidate({
      id: 'r1',
      institutionName: '高收费民办大学',
      institutionCode: '88888',
      groupCode: '',
      schoolType: '民办',
      city: '汕头',
      tuition: 58000,
      majors: '护理学',
      obeyAdjustment: false,
      subjectRequirement: '历史',
    }),
    candidate({ id: 'r2', institutionCode: '88888', groupCode: '', schoolType: '民办' }),
  ])
  const first = analysis.items[0]
  assert(first.warnings.some((warning) => warning.includes('不接受民办')))
  assert(first.warnings.some((warning) => warning.includes('超过预算')))
  assert(first.warnings.some((warning) => warning.includes('不服从调剂')))
  assert(first.warnings.some((warning) => warning.includes('排斥专业')))
  assert(first.warnings.some((warning) => warning.includes('选科要求')))
  assert(first.errors.some((error) => error.includes('专业组代码')))
  assert(analysis.globalWarnings.some((warning) => warning.includes('重复')))
})

test('reports too many rush candidates and missing safety candidates', () => {
  const rushes = Array.from({ length: 7 }, (_, index) =>
    candidate({
      id: `rush-${index}`,
      institutionName: `冲刺大学${index}`,
      institutionCode: `10${index}00`,
      groupCode: `${200 + index}`,
      rank2023: 10000,
      rank2024: 11000,
      rank2025: 12000,
    }),
  )
  const analysis = analyzeVolunteerPlan(baseProfile(), rushes)
  assert(analysis.globalWarnings.some((warning) => warning.includes('冲刺项偏多')))
  assert(analysis.globalWarnings.some((warning) => warning.includes('保底数量不足')))
})

test('parses tabular paste with preview rows and invalid-row errors', () => {
  const pasted = [
    '院校名称\t专业组代码\t专业名称\t2023排位\t2024排位\t2025排位\t学费',
    '某大学\t201\t计算机类\t18000\t17500\t16800\t6850',
    '\t202\t缺院校名\t100\t200\t300\t5000',
  ].join('\n')
  const parsed = parseCandidatePaste(pasted)
  assert.equal(parsed.validRows.length, 1)
  assert.equal(parsed.validRows[0].institutionName, '某大学')
  assert.equal(parsed.validRows[0].groupCode, '201')
  assert.equal(parsed.errors.length, 1)
  assert(parsed.errors[0].message.includes('院校名称'))
})

test('exports required checklist and disclaimer text', () => {
  assert(OFFICIAL_CHECKLIST.length >= 14)
  assert(PUBLIC_DISCLAIMER.includes('不构成录取预测或志愿填报承诺'))
  assert(PUBLIC_DISCLAIMER.includes('广东省教育考试院志愿填报系统'))
})
