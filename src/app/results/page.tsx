// @ts-nocheck
'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  PUBLIC_DISCLAIMER,
  analyzeVolunteerPlan,
  serializeForCsv,
} from '@/lib/plan-review'

const STORAGE_KEY = 'yzt-plan-review-v1'

export default function ResultsPage() {
  const [payload, setPayload] = useState(null)
  const [checklist, setChecklist] = useState({})
  const [order, setOrder] = useState([])
  const [dragIndex, setDragIndex] = useState(null)
  const [aiText, setAiText] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiUnavailable, setAiUnavailable] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setPayload(parsed)
      } catch {}
    }
    try {
      setChecklist(JSON.parse(localStorage.getItem(`${STORAGE_KEY}-checklist`) || '{}'))
    } catch {}
  }, [])

  const analysis = useMemo(() => {
    if (!payload?.profile || !payload?.candidates) return null
    const profile = toAnalysisProfile(payload.profile)
    return analyzeVolunteerPlan(profile, payload.candidates)
  }, [payload])

  useEffect(() => {
    if (analysis?.suggestedOrder) setOrder(analysis.suggestedOrder)
  }, [analysis])

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}-checklist`, JSON.stringify(checklist))
  }, [checklist])

  if (!analysis) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12 text-center">
        <h1 className="text-xl font-bold">暂无方案数据</h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">请先录入考生信息和候选院校专业组。</p>
        <Link href="/questionnaire" className="mt-5 inline-block rounded bg-[var(--color-primary)] px-5 py-2 text-sm text-white">开始录入</Link>
      </main>
    )
  }

  const profile = analysis.profile
  const highCostItems = analysis.items.filter((item) => item.warnings.some((warning) => warning.includes('超过预算')))
  const adjustmentItems = analysis.items.filter((item) => item.warnings.some((warning) => warning.includes('调剂')))
  const majorRiskItems = analysis.items.filter((item) => item.warnings.some((warning) => warning.includes('排斥专业') || warning.includes('专业')))
  const missingDataItems = analysis.items.filter((item) => item.rankStats.years.length < 2 || item.errors.length)

  const requestAi = async () => {
    setAiLoading(true)
    setAiUnavailable(false)
    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'plan-review',
          profile: compressProfile(profile),
          candidates: analysis.items.slice(0, 20).map(compressItem),
          localAnalysis: {
            distribution: analysis.distribution,
            globalWarnings: analysis.globalWarnings,
            checklistIncomplete: analysis.checklist.filter((_, index) => !checklist[index]),
          },
        }),
      })
      const data = await res.json()
      setAiText(data.report || 'AI解释暂不可用，本地规则分析仍可使用。')
      setAiUnavailable(Boolean(data.aiUnavailable))
    } catch {
      setAiText('AI解释暂不可用，本地规则分析仍可使用。')
      setAiUnavailable(true)
    } finally {
      setAiLoading(false)
    }
  }

  const moveOrder = (from, to) => {
    if (to < 0 || to >= order.length) return
    setOrder((current) => {
      const next = [...current]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return next
    })
  }

  const exportJson = () => downloadFile('yuezhitong-plan-review.json', JSON.stringify({ profile, analysis, order, checklist, disclaimer: PUBLIC_DISCLAIMER }, null, 2), 'application/json')
  const exportCsv = () => downloadFile('yuezhitong-plan-review.csv', `\ufeff${serializeForCsv(order)}`, 'text/csv;charset=utf-8')
  const exportText = () => {
    const lines = [
      '粤志通 2026 志愿方案复核公测版',
      `考生：${profile.category}，${profile.score || '-'}分，排位${profile.rank || '-'}`,
      '',
      '建议研究顺序：',
      ...order.map((item, index) => `${index + 1}. [${item.tier}] ${item.institutionName} ${item.groupCode} ${item.majors || ''} - ${item.reason}`),
      '',
      '必须核对：',
      ...analysis.checklist.map((item, index) => `${checklist[index] ? '[x]' : '[ ]'} ${item}`),
      '',
      PUBLIC_DISCLAIMER,
    ]
    downloadFile('yuezhitong-plan-review.txt', lines.join('\n'), 'text/plain;charset=utf-8')
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <section className="mb-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <p className="text-xs font-medium text-[var(--color-primary)]">粤志通 2026 志愿方案复核公测版</p>
        <h1 className="mt-1 text-2xl font-bold">方案分析结果</h1>
        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Summary label="科类/选科" value={`${profile.category} · ${(profile.subjects || []).join('、')}`} />
          <Summary label="分数与排位" value={`${profile.score || '-'}分 · ${profile.rank || '-'}名`} />
          <Summary label="候选数量" value={`${analysis.items.length} 个院校专业组`} />
          <Summary label="预算" value={`${profile.maxTuition || '-'} 元/年`} />
        </div>
      </section>

      <section className="mb-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Object.entries(analysis.distribution).map(([tier, count]) => (
          <div key={tier} className={`rounded-lg border bg-white p-3 tier-${tier}`}>
            <p className="text-xs text-[var(--color-text-muted)]">{tier}</p>
            <p className="mt-1 text-2xl font-bold">{count}</p>
          </div>
        ))}
      </section>

      {analysis.globalWarnings.length > 0 && (
        <section className="mb-4 rounded-lg border border-orange-200 bg-orange-50 p-4">
          <h2 className="text-sm font-semibold text-orange-900">梯度与完整性提醒</h2>
          {analysis.globalWarnings.map((warning) => <p key={warning} className="mt-1 text-sm text-orange-800">{warning}</p>)}
        </section>
      )}

      <section className="mb-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">每个候选院校专业组分析</h2>
          <div className="flex flex-wrap gap-2">
            <button onClick={exportCsv} className="rounded border px-3 py-1.5 text-xs">导出CSV</button>
            <button onClick={exportJson} className="rounded border px-3 py-1.5 text-xs">导出JSON</button>
            <button onClick={exportText} className="rounded border px-3 py-1.5 text-xs">导出文本</button>
            <button onClick={() => window.print()} className="rounded border px-3 py-1.5 text-xs">打印网页</button>
          </div>
        </div>
        <div className="mt-3 space-y-3">
          {analysis.items.map((item, index) => (
            <article key={item.id} className={`rounded-lg border border-[var(--color-border)] bg-white p-4 tier-${item.tier}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{item.institutionName || '未填写院校名称'} · 专业组 {item.groupCode || '未填写'}</h3>
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                    {item.institutionCode || '院校代码缺失'} · {item.schoolType} · {item.city || '城市未填'} · {item.majors || '拟报专业未填'}
                  </p>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[var(--color-primary)]">{item.tier}</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed">{item.reason}</p>
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-[var(--color-text-muted)]">
                <span>2023：{item.rank2023?.toLocaleString() || '-'}</span>
                <span>2024：{item.rank2024?.toLocaleString() || '-'}</span>
                <span>2025：{item.rank2025?.toLocaleString() || '-'}</span>
                <span>波动：{item.rankStats.fluctuation == null ? '-' : `${item.rankStats.fluctuation}%`}</span>
                <span>2026计划：{item.plan2026 || '-'}</span>
                <span>学费：{item.tuition || '-'} 元/年</span>
              </div>
              {[...item.errors, ...item.warnings].length > 0 && (
                <div className="mt-3 rounded border border-orange-200 bg-orange-50 p-3">
                  {[...item.errors, ...item.warnings].map((warning) => <p key={warning} className="text-xs leading-relaxed text-orange-800">• {warning}</p>)}
                </div>
              )}
              {item.sourceUrl && <a className="mt-2 block break-all text-xs text-[var(--color-primary)]" href={item.sourceUrl} target="_blank" rel="noreferrer">来源：{item.sourceUrl}</a>}
            </article>
          ))}
        </div>
      </section>

      <section className="mb-4 grid gap-4 lg:grid-cols-2">
        <RiskPanel title="学费和家庭成本风险" items={highCostItems} empty="暂无明显超预算项。" />
        <RiskPanel title="调剂风险" items={adjustmentItems} empty="暂无明显调剂冲突。" />
        <RiskPanel title="专业方向风险" items={majorRiskItems} empty="暂无明显专业方向冲突。" />
        <RiskPanel title="数据缺失项" items={missingDataItems} empty="关键历史排位和代码较完整。" />
      </section>

      <section className="mb-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">建议研究顺序</h2>
          <p className="text-xs text-[var(--color-text-muted)]">可拖动调整，仅作为研究草稿，不是最终填报方案。</p>
        </div>
        <div className="mt-3 space-y-2">
          {order.map((item, index) => (
            <div
              key={item.id}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (dragIndex !== null) moveOrder(dragIndex, index)
                setDragIndex(null)
              }}
              className="flex items-center justify-between gap-3 rounded border border-[var(--color-border)] bg-white p-3 text-sm"
            >
              <span>{index + 1}. [{item.tier}] {item.institutionName || '未填写院校'} 专业组{item.groupCode || '-'}</span>
              <span className="flex gap-2 text-xs">
                <button onClick={() => moveOrder(index, index - 1)} className="rounded border px-2 py-1">上移</button>
                <button onClick={() => moveOrder(index, index + 1)} className="rounded border px-2 py-1">下移</button>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <h2 className="text-base font-semibold">官方核对清单</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {analysis.checklist.map((item, index) => (
            <label key={item} className="flex items-start gap-2 rounded border border-[var(--color-border)] bg-white p-2 text-sm">
              <input type="checkbox" checked={Boolean(checklist[index])} onChange={(event) => setChecklist((current) => ({ ...current, [index]: event.target.checked }))} className="mt-1" />
              <span>{item}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="mb-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">AI通俗解释</h2>
          <button onClick={requestAi} disabled={aiLoading} className="rounded bg-[var(--color-primary)] px-4 py-2 text-sm text-white disabled:opacity-50">{aiLoading ? '生成中...' : '生成解释与核对提示'}</button>
        </div>
        <p className="mt-2 text-xs text-[var(--color-text-muted)]">AI只解释本地规则结果和专业方向，不创建代码、计划、分数或排位。AI失败时，本页本地规则结果仍完整可用。</p>
        {aiText && (
          <div className="mt-3 whitespace-pre-wrap rounded border border-blue-100 bg-blue-50 p-3 text-sm leading-relaxed">
            {aiUnavailable && <p className="mb-2 text-xs text-orange-700">AI服务不可用，以下为降级提示。</p>}
            {aiText}
          </div>
        )}
      </section>

      <section className="mb-8 rounded-lg border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 p-4 text-xs leading-relaxed text-[var(--color-text-muted)]">
        {PUBLIC_DISCLAIMER}
      </section>
    </main>
  )
}

function toAnalysisProfile(profile) {
  return {
    category: profile.category,
    subjects: profile.selectedSubjects || [],
    selectedSubjects: profile.selectedSubjects || [],
    score: Number(profile.score) || 0,
    rank: Number(profile.rank) || 0,
    maxTuition: Number(profile.maxTuition) || 0,
    preferredCities: splitWords(profile.preferredCitiesText),
    acceptPrivate: Boolean(profile.acceptPrivate),
    acceptSinoForeign: Boolean(profile.acceptSinoForeign),
    acceptAdjustment: Boolean(profile.acceptAdjustment),
    interests: splitWords(profile.majorInterestsText),
    rejectedMajors: splitWords(profile.excludedMajorsText),
    priority: profile.priority,
  }
}

function splitWords(text) {
  return String(text || '').split(/[、,，;；\s]+/).map((item) => item.trim()).filter(Boolean)
}

function Summary({ label, value }) {
  return <div className="rounded border border-[var(--color-border)] bg-white p-3"><p className="text-xs text-[var(--color-text-muted)]">{label}</p><p className="mt-1 font-semibold">{value}</p></div>
}

function RiskPanel({ title, items, empty }) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      {items.length === 0 ? <p className="mt-2 text-sm text-[var(--color-text-muted)]">{empty}</p> : (
        <ul className="mt-2 space-y-1 text-sm text-[var(--color-text-muted)]">
          {items.map((item) => <li key={`${item.id}-${title}`}>• {item.institutionName || '未填写院校'} 专业组{item.groupCode || '-'}</li>)}
        </ul>
      )}
    </div>
  )
}

function compressProfile(profile) {
  return {
    category: profile.category,
    subjects: profile.subjects,
    score: profile.score,
    rank: profile.rank,
    maxTuition: profile.maxTuition,
    preferredCities: profile.preferredCities,
    acceptPrivate: profile.acceptPrivate,
    acceptSinoForeign: profile.acceptSinoForeign,
    acceptAdjustment: profile.acceptAdjustment,
    interests: profile.interests,
    rejectedMajors: profile.rejectedMajors,
    priority: profile.priority,
  }
}

function compressItem(item) {
  return {
    tier: item.tier,
    institutionName: item.institutionName,
    institutionCode: item.institutionCode,
    groupCode: item.groupCode,
    majors: item.majors,
    city: item.city,
    schoolType: item.schoolType,
    tuition: item.tuition,
    ranks: { 2023: item.rank2023, 2024: item.rank2024, 2025: item.rank2025 },
    plan2026: item.plan2026,
    reason: item.reason,
    warnings: item.warnings,
    errors: item.errors,
  }
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
