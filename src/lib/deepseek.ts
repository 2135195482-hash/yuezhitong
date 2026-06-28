// DeepSeek API integration using direct fetch (no OpenAI SDK dependency)
// This avoids Turbopack ESM resolution issues with the openai package

interface ReportInput {
  profile: {
    admissionYear: number
    category: string
    score: number
    rank: number
    selectedSubjects: string[]
    preferredCities: string[]
    majorInterests: string[]
    excludedMajors: string[]
    priority: string
    careerGoals: string[]
    acceptTransfer: boolean
    acceptPrivate: boolean
    acceptSinoForeign: boolean
    maxTuition: number
  }
  recommendations: Array<{
    tier: string
    institutionName: string
    institutionType: string
    groupCode: string
    groupName: string
    majorDirection: string
    minimumScore: number | null
    minimumRank: number | null
    planCount: number | null
    rankHistory: Array<{ year: number; rank: number | null }>
    reason: string
    riskNotes: string[]
    verificationStatus: string
    is985: boolean
    is211: boolean
    isDoubleFirst: boolean
    city: string
  }>
  question?: string
  history?: Array<{ role: string; content: string }>
}

export async function generateReport(input: ReportInput): Promise<string | null> {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey || apiKey === 'sk-your-deepseek-api-key') return null

  const baseURL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com'
  const topRecs = input.recommendations.slice(0, 10)

  const systemPrompt = `你是"粤志通"的AI助手，服务于广东高考考生志愿填报咨询。你的职责：
1. 基于系统提供的录取数据，为用户生成个性化的志愿分析报告
2. 解释专业方向、就业前景、考研考公路径
3. 回答用户关于志愿填报策略的追问

重要约束：
- 你只能基于系统提供的数据进行分析，不得编造录取分数、排位或招生计划
- 不得猜测录取结果或给出"录取概率"
- 不得承诺录取
- 所有数据均已标注年份和来源，引用时必须保留标注
- 如果数据不足，诚实说明而不是编造
- 不得将不同年份数据混淆
- 语气：专业、清晰、可信，面向考生和家长
- 使用简体中文
- 回答控制在500字以内`

  const userPrompt = buildReportPrompt(input, topRecs)

  const messages = [
    { role: 'system', content: systemPrompt },
    ...(input.history || []).map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: userPrompt },
  ]

  try {
    const response = await fetch(`${baseURL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        max_tokens: 800,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      console.error('DeepSeek API HTTP error:', response.status, await response.text())
      return null
    }

    const data = await response.json()
    return data.choices?.[0]?.message?.content || null
  } catch (error) {
    console.error('DeepSeek API error:', error)
    return null
  }
}

function buildReportPrompt(input: ReportInput, recs: ReportInput['recommendations']): string {
  const { profile } = input

  let p = `用户档案：
- 目标年份：${profile.admissionYear}年
- 科类：${profile.category}
- 选科：${profile.selectedSubjects.join('、')}
- 分数：${profile.score}分
- 广东省排位：${profile.rank}
- 偏好城市：${profile.preferredCities.join('、') || '无限制'}
- 专业兴趣：${profile.majorInterests.join('、') || '未指定'}
- 排斥专业：${profile.excludedMajors.join('、') || '无'}
- 偏好：${profile.priority === 'school' ? '学校优先' : profile.priority === 'major' ? '专业优先' : '平衡考虑'}
- 职业规划：${profile.careerGoals.join('、') || '未指定'}
- 接受调剂：${profile.acceptTransfer ? '是' : '否'}
- 接受民办：${profile.acceptPrivate ? '是' : '否'}
- 接受中外合作：${profile.acceptSinoForeign ? '是' : '否'}
- 最高学费：${profile.maxTuition}元/年

系统筛选结果（基于广东${profile.admissionYear}年官方数据）：
`

  for (const r of recs) {
    const tags = []
    if (r.is985) tags.push('985')
    if (r.is211) tags.push('211')
    if (r.isDoubleFirst) tags.push('双一流')

    p += `\n【${r.tier}】${r.institutionName} ${tags.join('/')} - 专业组${r.groupCode} ${r.groupName}
  城市：${r.city}
  院校类型：${r.institutionType}
  近年最低排位：${r.rankHistory.map(h => `${h.year}年: ${h.rank || '无数据'}`).join(' | ')}
  招生计划：${r.planCount || '无数据'}
  验证状态：${r.verificationStatus}
  推荐理由：${r.reason}
  风险提示：${r.riskNotes.join('；')}
`
  }

  if (input.question) {
    p += `\n用户追问：${input.question}`
  } else {
    p += `\n请生成一份个性化分析报告，包括：
1. 总体评估（基于用户的排位和偏好）
2. 冲刺组分析要点
3. 稳妥组分析要点
4. 保底组分析要点
5. 专业方向和就业建议
6. 需要进一步核实的事项`
  }

  return p
}
