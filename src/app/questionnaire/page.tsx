'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Step = 1 | 2 | 3 | 4

const CATEGORIES = ['物理类', '历史类'] as const
const SUBJECTS_PHYSICS = ['物理', '化学', '生物', '地理', '政治']
const SUBJECTS_HISTORY = ['历史', '地理', '政治', '化学', '生物']
const CITIES = ['广州', '深圳', '珠海', '东莞', '佛山', '中山', '惠州', '江门', '肇庆', '汕头', '潮州', '揭阳', '汕尾', '湛江', '茂名', '阳江', '韶关', '清远', '梅州', '河源', '云浮', '省外']
const MAJOR_CATEGORIES = [
  '计算机/软件/人工智能', '电子信息/通信', '电气/自动化', '机械/车辆',
  '土木/建筑', '数学/统计', '物理/化学', '生物/医学',
  '临床医学', '口腔医学', '药学', '护理',
  '经济学/金融', '会计/审计', '工商管理', '法学',
  '汉语言文学', '外语', '新闻传播', '历史/哲学',
  '教育学', '心理学', '师范类', '艺术类',
  '农林', '地矿/石油', '材料/化工', '环境/海洋',
]
const GOALS = [
  { value: 'employment', label: '高就业率' },
  { value: 'income', label: '高收入' },
  { value: 'postgraduate', label: '考研深造' },
  { value: 'civil_service', label: '考公考编' },
  { value: 'stable', label: '稳定工作' },
  { value: 'interest', label: '兴趣爱好' },
]

export default function QuestionnairePage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  
  // Step 1: Basic info
  const [admissionYear, setAdmissionYear] = useState(2025)
  const [category, setCategory] = useState<string>('物理类')
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(['物理', '化学', '生物'])
  
  // Step 2: Scores
  const [score, setScore] = useState('')
  const [rank, setRank] = useState('')
  
  // Step 3: Preferences
  const [preferredCities, setPreferredCities] = useState<string[]>([])
  const [excludedCities, setExcludedCities] = useState<string[]>([])
  const [majorInterests, setMajorInterests] = useState<string[]>([])
  const [excludedMajors, setExcludedMajors] = useState<string[]>([])
  const [priority, setPriority] = useState('balanced')
  const [careerGoals, setCareerGoals] = useState<string[]>([])
  
  // Step 4: Constraints
  const [acceptTransfer, setAcceptTransfer] = useState(true)
  const [acceptPrivate, setAcceptPrivate] = useState(false)
  const [acceptSinoForeign, setAcceptSinoForeign] = useState(false)
  const [maxTuition, setMaxTuition] = useState('20000')
  const [acceptSpecialIndustry, setAcceptSpecialIndustry] = useState(false)

  const availableSubjects = category === '物理类' ? SUBJECTS_PHYSICS : SUBJECTS_HISTORY

  const toggleArray = (arr: string[], setArr: (v: string[]) => void, item: string, max?: number) => {
    if (arr.includes(item)) {
      setArr(arr.filter(i => i !== item))
    } else {
      if (max && arr.length >= max) return
      setArr([...arr, item])
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    const profile = {
      admissionYear,
      category,
      selectedSubjects,
      score: parseInt(score),
      rank: parseInt(rank),
      preferredCities,
      excludedCities,
      majorInterests,
      excludedMajors,
      priority,
      careerGoals,
      acceptTransfer,
      acceptPrivate,
      acceptSinoForeign,
      maxTuition: parseInt(maxTuition) || 20000,
      acceptSpecialIndustry,
    }

    sessionStorage.setItem('userProfile', JSON.stringify(profile))

    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      })
      const data = await res.json()
      sessionStorage.setItem('recommendResults', JSON.stringify(data))
      router.push('/results')
    } catch (e) {
      alert('请求失败，请重试')
      setLoading(false)
    }
  }

  const Step1Valid = category && selectedSubjects.length >= 1
  const Step2Valid = score && parseInt(score) >= 100 && parseInt(score) <= 750 && rank && parseInt(rank) > 0
  const Step3Valid = true // Optional
  const Step4Valid = true // Optional

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold mb-2">志愿填报咨询</h1>
      <p className="text-sm text-[var(--color-text-muted)] mb-6">请如实填写以下信息，我们将基于广东省官方公布的院校专业组投档数据为您提供分析参考</p>

      {/* Progress */}
      <div className="flex gap-2 mb-8">
        {([1, 2, 3, 4] as const).map(s => (
          <div key={s} className={`flex-1 h-1 rounded ${s <= step ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}`} />
        ))}
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1">目标招生年份</label>
            <select value={admissionYear} onChange={e => setAdmissionYear(parseInt(e.target.value))}
              className="w-full border border-[var(--color-border)] rounded p-2 text-sm bg-white">
              <option value={2025}>2025年</option>
              <option value={2024}>2024年</option>
              <option value={2023}>2023年</option>
            </select>
            {admissionYear === 2025 && (
              <p className="text-xs text-[var(--color-warning)] mt-1">注意：2025年度部分官方数据可能尚未完整发布。未发布数据不会由AI推测。</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">科类</label>
            <div className="flex gap-3">
              {CATEGORIES.map(c => (
                <button key={c} onClick={() => { setCategory(c); setSelectedSubjects(c === '物理类' ? ['物理', '化学', '生物'] : ['历史', '地理', '政治']) }}
                  className={`px-4 py-2 rounded border text-sm ${category === c ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' : 'bg-white border-[var(--color-border)]'}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">选科组合（可多选）</label>
            <div className="flex flex-wrap gap-2">
              {availableSubjects.map(s => (
                <button key={s} onClick={() => toggleArray(selectedSubjects, setSelectedSubjects, s)}
                  className={`px-3 py-1.5 rounded border text-xs ${selectedSubjects.includes(s) ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' : 'bg-white border-[var(--color-border)]'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="pt-4">
            <button disabled={!Step1Valid} onClick={() => setStep(2)}
              className="w-full bg-[var(--color-primary)] text-white py-2.5 rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">
              下一步
            </button>
          </div>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1">高考分数</label>
            <input type="number" value={score} onChange={e => setScore(e.target.value)}
              placeholder="例：580" min={100} max={750}
              className="w-full border border-[var(--color-border)] rounded p-2 text-sm" />
            <p className="text-xs text-[var(--color-text-muted)] mt-1">广东高考满分750分</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">广东省排位</label>
            <input type="number" value={rank} onChange={e => setRank(e.target.value)}
              placeholder="例：28500" min={1}
              className="w-full border border-[var(--color-border)] rounded p-2 text-sm" />
            <p className="text-xs text-[var(--color-text-muted)] mt-1">排位是志愿填报的核心依据。可在广东省教育考试院公布的一分一段表中查询。例：物理类580分约对应排位28000名（每年不同）。</p>
          </div>
          <div className="flex gap-3 pt-4">
            <button onClick={() => setStep(1)} className="flex-1 border border-[var(--color-border)] bg-white py-2.5 rounded text-sm">上一步</button>
            <button disabled={!Step2Valid} onClick={() => setStep(3)}
              className="flex-1 bg-[var(--color-primary)] text-white py-2.5 rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">
              下一步
            </button>
          </div>
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1">想去的城市或地区（可多选，不选表示不限）</label>
            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
              {CITIES.map(c => (
                <button key={c} onClick={() => toggleArray(preferredCities, setPreferredCities, c)}
                  className={`px-2.5 py-1 rounded border text-xs ${preferredCities.includes(c) ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' : 'bg-white border-[var(--color-border)]'}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">不接受的地区（可多选）</label>
            <div className="flex flex-wrap gap-1.5">
              {CITIES.map(c => (
                <button key={c} onClick={() => toggleArray(excludedCities, setExcludedCities, c)}
                  className={`px-2.5 py-1 rounded border text-xs ${excludedCities.includes(c) ? 'bg-red-500 text-white border-red-500' : 'bg-white border-[var(--color-border)]'}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">专业兴趣（可多选，最多5项）</label>
            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
              {MAJOR_CATEGORIES.map(m => (
                <button key={m} onClick={() => toggleArray(majorInterests, setMajorInterests, m, 5)}
                  className={`px-2.5 py-1 rounded border text-xs ${majorInterests.includes(m) ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' : 'bg-white border-[var(--color-border)]'}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">排斥专业（可多选）</label>
            <div className="flex flex-wrap gap-1.5">
              {MAJOR_CATEGORIES.map(m => (
                <button key={m} onClick={() => toggleArray(excludedMajors, setExcludedMajors, m)}
                  className={`px-2.5 py-1 rounded border text-xs ${excludedMajors.includes(m) ? 'bg-red-500 text-white border-red-500' : 'bg-white border-[var(--color-border)]'}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">偏好倾向</label>
            <div className="flex gap-3">
              {[
                { value: 'school', label: '学校优先' },
                { value: 'balanced', label: '平衡' },
                { value: 'major', label: '专业优先' },
              ].map(p => (
                <button key={p.value} onClick={() => setPriority(p.value)}
                  className={`px-4 py-2 rounded border text-sm flex-1 ${priority === p.value ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' : 'bg-white border-[var(--color-border)]'}`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">职业与人生规划（可多选）</label>
            <div className="flex flex-wrap gap-2">
              {GOALS.map(g => (
                <button key={g.value} onClick={() => toggleArray(careerGoals, setCareerGoals, g.value)}
                  className={`px-3 py-1.5 rounded border text-xs ${careerGoals.includes(g.value) ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' : 'bg-white border-[var(--color-border)]'}`}>
                  {g.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button onClick={() => setStep(2)} className="flex-1 border border-[var(--color-border)] bg-white py-2.5 rounded text-sm">上一步</button>
            <button onClick={() => setStep(4)} className="flex-1 bg-[var(--color-primary)] text-white py-2.5 rounded text-sm font-medium">
              下一步
            </button>
          </div>
        </div>
      )}

      {/* Step 4 */}
      {step === 4 && (
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1">是否接受专业调剂</label>
            <div className="flex gap-3">
              <button onClick={() => setAcceptTransfer(true)} className={`px-4 py-2 rounded border text-sm flex-1 ${acceptTransfer ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' : 'bg-white border-[var(--color-border)]'}`}>接受</button>
              <button onClick={() => setAcceptTransfer(false)} className={`px-4 py-2 rounded border text-sm flex-1 ${!acceptTransfer ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' : 'bg-white border-[var(--color-border)]'}`}>不接受</button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">是否接受民办院校</label>
            <div className="flex gap-3">
              <button onClick={() => setAcceptPrivate(true)} className={`px-4 py-2 rounded border text-sm flex-1 ${acceptPrivate ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' : 'bg-white border-[var(--color-border)]'}`}>接受</button>
              <button onClick={() => setAcceptPrivate(false)} className={`px-4 py-2 rounded border text-sm flex-1 ${!acceptPrivate ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' : 'bg-white border-[var(--color-border)]'}`}>不接受</button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">是否接受中外合作办学</label>
            <div className="flex gap-3">
              <button onClick={() => setAcceptSinoForeign(true)} className={`px-4 py-2 rounded border text-sm flex-1 ${acceptSinoForeign ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' : 'bg-white border-[var(--color-border)]'}`}>接受</button>
              <button onClick={() => setAcceptSinoForeign(false)} className={`px-4 py-2 rounded border text-sm flex-1 ${!acceptSinoForeign ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' : 'bg-white border-[var(--color-border)]'}`}>不接受</button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">可接受最高学费（元/年）</label>
            <input type="number" value={maxTuition} onChange={e => setMaxTuition(e.target.value)}
              placeholder="20000" min={0}
              className="w-full border border-[var(--color-border)] rounded p-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">是否接受特殊行业或培养方向（农林、地矿、航海等）</label>
            <div className="flex gap-3">
              <button onClick={() => setAcceptSpecialIndustry(true)} className={`px-4 py-2 rounded border text-sm flex-1 ${acceptSpecialIndustry ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' : 'bg-white border-[var(--color-border)]'}`}>接受</button>
              <button onClick={() => setAcceptSpecialIndustry(false)} className={`px-4 py-2 rounded border text-sm flex-1 ${!acceptSpecialIndustry ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' : 'bg-white border-[var(--color-border)]'}`}>不接受</button>
            </div>
          </div>

          {/* Disclaimer before submission */}
          <div className="bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/30 rounded p-3 text-xs text-[var(--color-text-muted)]">
            <strong>提交前请注意：</strong>本系统仅根据官方公开招生信息和您提供的信息进行初步分析，结果仅供志愿研究参考，不构成录取预测或志愿填报承诺。最终填报请以广东省教育考试院和高校招生章程为准。
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => setStep(3)} className="flex-1 border border-[var(--color-border)] bg-white py-2.5 rounded text-sm">上一步</button>
            <button onClick={handleSubmit} disabled={loading}
              className="flex-1 bg-[var(--color-primary)] text-white py-2.5 rounded text-sm font-medium disabled:opacity-50">
              {loading ? '正在分析...' : '提交分析'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
