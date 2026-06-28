interface PlanReviewAiInput {
  profile: Record<string, unknown>
  candidates: Array<Record<string, unknown>>
  localAnalysis: Record<string, unknown>
}

export async function generatePlanReviewExplanation(input: PlanReviewAiInput): Promise<string | null> {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey || apiKey === 'sk-your-deepseek-api-key') return null

  const baseURL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com'
  const candidates = (input.candidates || []).slice(0, 20)

  const systemPrompt = `你是"粤志通 2026 志愿方案复核公测版"的AI解释助手。
你只能解释本地规则分析结果，不能创建、猜测或修改院校代码、专业组代码、招生计划、最低分、最低排位、录取概率或官方政策。
你不得声称已经读取广东官方系统，不得保证录取，不得替用户提交志愿。
你需要提醒用户回到《广东省2026年普通高等学校招生专业目录》、广东省教育考试院志愿填报系统和高校2026年招生章程核实。
输出使用简体中文，约800到1200中文字符，结构清晰，语气稳健。`

  const userPrompt = `考生信息：
${JSON.stringify(input.profile, null, 2)}

本地规则结果摘要：
${JSON.stringify(input.localAnalysis, null, 2)}

候选项摘要（最多20项）：
${JSON.stringify(candidates, null, 2)}

请输出：
1. 总体梯度评价；
2. 学校、专业、城市、成本的取舍提示；
3. 调剂、民办/中外合作、数据缺失等风险；
4. 考研、考公、就业方向的温和提醒；
5. 最终核对清单重点。
不得生成新的数字或代码。`

  try {
    const response = await fetch(`${baseURL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 1500,
        temperature: 0.4,
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

export function buildLocalFallbackExplanation(): string {
  return [
    'AI解释当前不可用，但本地规则复核结果仍然完整可用。',
    '请优先查看冲稳保分布、每个候选项的风险提示、数据缺失项和官方核对清单。',
    '凡是院校代码、专业组代码、选科要求、招生计划、收费标准、校区、体检限制、单科要求、调剂规则等信息，都必须回到《广东省2026年普通高等学校招生专业目录》、广东省教育考试院志愿填报系统及高校2026年招生章程核实。',
    '本工具不会生成录取概率，也不保证录取；建议把结果当作二次检查清单和家庭讨论草稿使用。',
  ].join('\n')
}
