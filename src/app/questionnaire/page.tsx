// @ts-nocheck
'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  PUBLIC_DISCLAIMER,
  analyzeVolunteerPlan,
  normalizeCandidate,
  parseCandidatePaste,
} from '@/lib/plan-review'

const STORAGE_KEY = 'yzt-plan-review-v1'
const SUBJECTS = ['物理', '历史', '化学', '生物', '政治', '地理']
const PRIORITIES = ['学校', '专业', '城市', '就业', '考研', '考公']

const emptyCandidate = () => normalizeCandidate({
  id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  institutionName: '',
  institutionCode: '',
  groupCode: '',
  majors: '',
  obeyAdjustment: true,
  schoolType: '公办',
  city: '',
  tuition: null,
  rank2023: null,
  rank2024: null,
  rank2025: null,
  plan2026: null,
  sourceUrl: '',
  subjectRequirement: '',
  note: '',
})

export default function QuestionnairePage() {
  const router = useRouter()
  const [profile, setProfile] = useState({
    category: '物理类',
    selectedSubjects: ['物理', '化学'],
    score: '',
    rank: '',
    maxTuition: '20000',
    preferredCitiesText: '',
    acceptPrivate: false,
    acceptSinoForeign: false,
    acceptAdjustment: true,
    majorInterestsText: '',
    excludedMajorsText: '',
    priority: '专业',
  })
  const [candidates, setCandidates] = useState([emptyCandidate()])
  const [pasteText, setPasteText] = useState('')
  const [pastePreview, setPastePreview] = useState(null)
  const [dragIndex, setDragIndex] = useState(null)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return
    try {
      const parsed = JSON.parse(stored)
      if (parsed.profile) setProfile(parsed.profile)
      if (Array.isArray(parsed.candidates) && parsed.candidates.length) {
        setCandidates(parsed.candidates.map(normalizeCandidate))
      }
    } catch {}
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ profile, candidates }))
  }, [profile, candidates])

  const parsedProfile = useMemo(() => ({
    category: profile.category,
    subjects: profile.selectedSubjects,
    selectedSubjects: profile.selectedSubjects,
    score: Number(profile.score) || 0,
    rank: Number(profile.rank) || 0,
    maxTuition: Number(profile.maxTuition) || 0,
    preferredCities: splitWords(profile.preferredCitiesText),
    acceptPrivate: profile.acceptPrivate,
    acceptSinoForeign: profile.acceptSinoForeign,
    acceptAdjustment: profile.acceptAdjustment,
    interests: splitWords(profile.majorInterestsText),
    majorInterests: splitWords(profile.majorInterestsText),
    rejectedMajors: splitWords(profile.excludedMajorsText),
    excludedMajors: splitWords(profile.excludedMajorsText),
    priority: profile.priority,
  }), [profile])

  const analysis = useMemo(() => analyzeVolunteerPlan(parsedProfile, candidates), [parsedProfile, candidates])
  const canAnalyze = parsedProfile.rank > 0 && parsedProfile.score > 0 && candidates.some((item) => item.institutionName || item.groupCode)

  const updateProfile = (key, value) => setProfile((current) => ({ ...current, [key]: value }))
  const updateCandidate = (index, key, value) => {
    setCandidates((current) => current.map((item, itemIndex) => itemIndex === index ? normalizeCandidate({ ...item, [key]: value }) : item))
  }
  const addCandidate = () => setCandidates((current) => [...current, emptyCandidate()])
  const removeCandidate = (index) => setCandidates((current) => current.length === 1 ? [emptyCandidate()] : current.filter((_, itemIndex) => itemIndex !== index))
  const moveCandidate = (from, to) => {
    if (to < 0 || to >= candidates.length) return
    setCandidates((current) => {
      const next = [...current]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return next
    })
  }

  const runPastePreview = () => {
    setPastePreview(parseCandidatePaste(pasteText))
  }
  const confirmPaste = () => {
    if (!pastePreview?.validRows?.length) return
    setCandidates((current) => [...current.filter((item) => item.institutionName || item.groupCode), ...pastePreview.validRows])
    setPasteText('')
    setPastePreview(null)
  }

  const startAnalysis = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ profile, candidates, analysis }))
    router.push('/results')
  }
  const exportBackup = () => {
    const backup = JSON.stringify({ profile, candidates, exportedAt: new Date().toISOString() }, null, 2)
    const blob = new Blob([backup], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'yuezhitong-local-backup.json'
    link.click()
    URL.revokeObjectURL(url)
  }
  const clearLocalPlan = () => {
    if (!window.confirm('确认清空本机浏览器中保存的考生信息和候选方案？清空后不可恢复，建议先导出备份。')) return
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(`${STORAGE_KEY}-checklist`)
    setProfile({
      category: '物理类',
      selectedSubjects: ['物理', '化学'],
      score: '',
      rank: '',
      maxTuition: '20000',
      preferredCitiesText: '',
      acceptPrivate: false,
      acceptSinoForeign: false,
      acceptAdjustment: true,
      majorInterestsText: '',
      excludedMajorsText: '',
      priority: '专业',
    })
    setCandidates([emptyCandidate()])
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-5">
        <p className="text-xs font-medium text-[var(--color-primary)]">粤志通 2026 志愿方案复核公测版</p>
        <h1 className="mt-1 text-2xl font-bold">候选志愿方案复核</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--color-text-muted)]">
          请先通过广东省官方辅助系统、招生专业目录和高校招生章程筛选候选院校专业组，再把方案录入这里。本工具只做梯度、费用、调剂、专业方向和核对清单分析。
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/official" className="rounded border border-[var(--color-primary)] px-3 py-2 text-sm text-[var(--color-primary)] no-underline">查询官方历史数据</Link>
          <button type="button" onClick={exportBackup} className="rounded border border-[var(--color-border)] px-3 py-2 text-sm">导出本地备份</button>
          <button type="button" onClick={clearLocalPlan} className="rounded border border-red-200 px-3 py-2 text-sm text-red-600">清空本地方案</button>
        </div>
      </div>

      <section className="mb-5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <h2 className="text-base font-semibold">第一步：考生信息</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <label className="text-sm">
            科类
            <select value={profile.category} onChange={(event) => {
              const next = event.target.value
              updateProfile('category', next)
              updateProfile('selectedSubjects', next === '物理类' ? ['物理', '化学'] : ['历史'])
            }} className="mt-1 w-full rounded border border-[var(--color-border)] bg-white p-2">
              <option>物理类</option>
              <option>历史类</option>
            </select>
          </label>
          <label className="text-sm">
            高考分数
            <input inputMode="numeric" value={profile.score} onChange={(event) => updateProfile('score', event.target.value)} className="mt-1 w-full rounded border border-[var(--color-border)] p-2" placeholder="例：598" />
          </label>
          <label className="text-sm">
            广东省排位
            <input inputMode="numeric" value={profile.rank} onChange={(event) => updateProfile('rank', event.target.value)} className="mt-1 w-full rounded border border-[var(--color-border)] p-2" placeholder="例：21800" />
          </label>
        </div>

        <div className="mt-4">
          <p className="mb-2 text-sm font-medium">选科组合</p>
          <div className="flex flex-wrap gap-2">
            {SUBJECTS.map((subject) => (
              <button key={subject} type="button" onClick={() => {
                const selected = profile.selectedSubjects.includes(subject)
                  ? profile.selectedSubjects.filter((item) => item !== subject)
                  : [...profile.selectedSubjects, subject]
                updateProfile('selectedSubjects', selected)
              }} className={`rounded border px-3 py-1.5 text-sm ${profile.selectedSubjects.includes(subject) ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white' : 'border-[var(--color-border)] bg-white'}`}>
                {subject}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <label className="text-sm">
            学费承受范围（元/年）
            <input inputMode="numeric" value={profile.maxTuition} onChange={(event) => updateProfile('maxTuition', event.target.value)} className="mt-1 w-full rounded border border-[var(--color-border)] p-2" />
          </label>
          <label className="text-sm">
            地区偏好
            <input value={profile.preferredCitiesText} onChange={(event) => updateProfile('preferredCitiesText', event.target.value)} className="mt-1 w-full rounded border border-[var(--color-border)] p-2" placeholder="广州、深圳、珠海" />
          </label>
          <label className="text-sm">
            更看重
            <select value={profile.priority} onChange={(event) => updateProfile('priority', event.target.value)} className="mt-1 w-full rounded border border-[var(--color-border)] bg-white p-2">
              {PRIORITIES.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="text-sm">
            专业兴趣
            <input value={profile.majorInterestsText} onChange={(event) => updateProfile('majorInterestsText', event.target.value)} className="mt-1 w-full rounded border border-[var(--color-border)] p-2" placeholder="计算机、电子信息、法学" />
          </label>
          <label className="text-sm">
            排斥专业
            <input value={profile.excludedMajorsText} onChange={(event) => updateProfile('excludedMajorsText', event.target.value)} className="mt-1 w-full rounded border border-[var(--color-border)] p-2" placeholder="护理、土木、化工" />
          </label>
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-4">
          <Toggle label="接受民办" checked={profile.acceptPrivate} onChange={(value) => updateProfile('acceptPrivate', value)} />
          <Toggle label="接受中外合作/高收费" checked={profile.acceptSinoForeign} onChange={(value) => updateProfile('acceptSinoForeign', value)} />
          <Toggle label="整体接受调剂" checked={profile.acceptAdjustment} onChange={(value) => updateProfile('acceptAdjustment', value)} />
        </div>
      </section>

      <section className="mb-5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">第二步：录入候选院校专业组</h2>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">所有数字均由你根据官方辅助系统、招生专业目录或高校招生章程填写。系统不会自动补造缺失字段。</p>
          </div>
          <button type="button" onClick={addCandidate} className="rounded bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white">新增候选</button>
        </div>

        <div className="mt-4 space-y-3">
          {candidates.map((item, index) => (
            <div
              key={item.id}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (dragIndex !== null) moveCandidate(dragIndex, index)
                setDragIndex(null)
              }}
              className="rounded-lg border border-[var(--color-border)] bg-white p-3"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <strong className="text-sm">候选 {index + 1}</strong>
                <div className="flex gap-2 text-xs">
                  <button type="button" onClick={() => moveCandidate(index, index - 1)} className="rounded border px-2 py-1">上移</button>
                  <button type="button" onClick={() => moveCandidate(index, index + 1)} className="rounded border px-2 py-1">下移</button>
                  <button type="button" onClick={() => removeCandidate(index)} className="rounded border border-red-200 px-2 py-1 text-red-600">删除</button>
                </div>
              </div>

              <div className="grid gap-2 md:grid-cols-4">
                <Input label="院校名称" value={item.institutionName} onChange={(value) => updateCandidate(index, 'institutionName', value)} />
                <Input label="2026院校代码" value={item.institutionCode} onChange={(value) => updateCandidate(index, 'institutionCode', value)} />
                <Input label="2026专业组代码" value={item.groupCode} onChange={(value) => updateCandidate(index, 'groupCode', value)} />
                <Input label="所在城市" value={item.city} onChange={(value) => updateCandidate(index, 'city', value)} />
              </div>
              <div className="mt-2 grid gap-2 md:grid-cols-4">
                <Input label="组内拟报专业" value={item.majors} onChange={(value) => updateCandidate(index, 'majors', value)} />
                <Select label="办学性质" value={item.schoolType} onChange={(value) => updateCandidate(index, 'schoolType', value)} options={['公办', '民办', '中外合作', '联合培养', '独立学院']} />
                <Input label="预计学费" value={item.tuition ?? ''} onChange={(value) => updateCandidate(index, 'tuition', value)} inputMode="numeric" />
                <Input label="选科要求" value={item.subjectRequirement} onChange={(value) => updateCandidate(index, 'subjectRequirement', value)} placeholder="物理+化学" />
              </div>
              <div className="mt-2 grid gap-2 md:grid-cols-4">
                <Input label="2023最低排位" value={item.rank2023 ?? ''} onChange={(value) => updateCandidate(index, 'rank2023', value)} inputMode="numeric" />
                <Input label="2024最低排位" value={item.rank2024 ?? ''} onChange={(value) => updateCandidate(index, 'rank2024', value)} inputMode="numeric" />
                <Input label="2025最低排位" value={item.rank2025 ?? ''} onChange={(value) => updateCandidate(index, 'rank2025', value)} inputMode="numeric" />
                <Input label="2026招生计划数" value={item.plan2026 ?? ''} onChange={(value) => updateCandidate(index, 'plan2026', value)} inputMode="numeric" />
              </div>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                <Input label="官方来源链接" value={item.sourceUrl} onChange={(value) => updateCandidate(index, 'sourceUrl', value)} />
                <Input label="用户备注" value={item.note} onChange={(value) => updateCandidate(index, 'note', value)} />
              </div>
              <div className="mt-2">
                <Toggle label="该候选服从调剂" checked={item.obeyAdjustment} onChange={(value) => updateCandidate(index, 'obeyAdjustment', value)} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <h2 className="text-base font-semibold">第三步：批量粘贴导入</h2>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">支持制表符表格和CSV。请包含表头，例如：院校名称、专业组代码、专业名称、2023排位、2024排位、2025排位、学费。</p>
        <textarea value={pasteText} onChange={(event) => setPasteText(event.target.value)} className="mt-3 min-h-28 w-full rounded border border-[var(--color-border)] p-2 text-sm" placeholder={'院校名称\t专业组代码\t专业名称\t2023排位\t2024排位\t2025排位\t学费\n某大学\t201\t计算机类\t18000\t17500\t16800\t6850'} />
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={runPastePreview} className="rounded border border-[var(--color-primary)] px-4 py-2 text-sm text-[var(--color-primary)]">解析预览</button>
          <button type="button" disabled={!pastePreview?.validRows?.length} onClick={confirmPaste} className="rounded bg-[var(--color-primary)] px-4 py-2 text-sm text-white disabled:opacity-40">确认导入</button>
        </div>
        {pastePreview && (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="rounded border border-green-200 bg-green-50 p-3 text-sm">可导入 {pastePreview.validRows.length} 行</div>
            <div className="rounded border border-orange-200 bg-orange-50 p-3 text-sm">错误 {pastePreview.errors.length} 行</div>
            {pastePreview.errors.length > 0 && (
              <div className="md:col-span-2">
                {pastePreview.errors.slice(0, 5).map((error) => (
                  <p key={`${error.row}-${error.message}`} className="text-xs text-orange-700">第 {error.row} 行：{error.message}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <section className="mb-5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <h2 className="text-base font-semibold">本地规则复核预览</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {Object.entries(analysis.distribution).map(([tier, count]) => (
            <div key={tier} className="rounded border border-[var(--color-border)] p-3">
              <p className="text-xs text-[var(--color-text-muted)]">{tier}</p>
              <p className="text-xl font-bold">{count}</p>
            </div>
          ))}
        </div>
        {analysis.globalWarnings.length > 0 && (
          <div className="mt-3 rounded border border-orange-200 bg-orange-50 p-3">
            {analysis.globalWarnings.map((warning) => <p key={warning} className="text-xs text-orange-800">{warning}</p>)}
          </div>
        )}
      </section>

      <div className="mb-8 rounded-lg border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 p-3 text-xs leading-relaxed text-[var(--color-text-muted)]">
        {PUBLIC_DISCLAIMER}
      </div>

      <div className="sticky bottom-0 -mx-4 border-t border-[var(--color-border)] bg-white/95 px-4 py-3 backdrop-blur">
        <button type="button" disabled={!canAnalyze} onClick={startAnalysis} className="w-full rounded bg-[var(--color-primary)] py-3 text-sm font-semibold text-white disabled:opacity-40">
          生成方案分析结果
        </button>
      </div>
    </main>
  )
}

function splitWords(text) {
  return String(text || '').split(/[、,，;；\s]+/).map((item) => item.trim()).filter(Boolean)
}

function Toggle({ label, checked, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className={`rounded border px-3 py-2 text-left text-sm ${checked ? 'border-[var(--color-primary)] bg-blue-50 text-[var(--color-primary)]' : 'border-[var(--color-border)] bg-white'}`}>
      {checked ? '✓ ' : ''}{label}
    </button>
  )
}

function Input({ label, value, onChange, placeholder = '', inputMode = 'text' }) {
  return (
    <label className="text-xs text-[var(--color-text-muted)]">
      {label}
      <input value={value} inputMode={inputMode} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-1 w-full rounded border border-[var(--color-border)] p-2 text-sm text-[var(--color-text)]" />
    </label>
  )
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="text-xs text-[var(--color-text-muted)]">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded border border-[var(--color-border)] bg-white p-2 text-sm text-[var(--color-text)]">
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  )
}
