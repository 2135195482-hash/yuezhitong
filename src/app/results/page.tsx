'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface ResultData {
  profile: Record<string, unknown>
  tiers: Array<{
    tier: string
    count: number
    items: Array<{
      tier: string
      record: {
        institutionName: string
        institutionCode: string
        groupCode: string
        groupName: string
        majorName: string
        subjectRequirements: string
        planCount: number | null
        minimumScore: number | null
        minimumRank: number | null
        sourceLevel: string
        sourceName: string
        sourceUrl: string
        officialTitle: string
        officialPublishedAt: string
        verificationStatus: string
        dataType: string
      }
      institution: {
        type: string
        is985: boolean
        is211: boolean
        isDoubleFirst: boolean
        city: string
        province: string
      } | null
      reason: string
      riskNotes: string[]
      rankHistory: Array<{ year: number; rank: number | null; score: number | null }>
    }>
  }>
  totalResults: number
  dataYear: number
  availableHistoryYears: number[]
}

export default function ResultsPage() {
  const router = useRouter()
  const [data, setData] = useState<ResultData | null>(null)
  const [loading, setLoading] = useState(true)
  const [aiReport, setAiReport] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiUnavailable, setAiUnavailable] = useState(false)
  const [activeTab, setActiveTab] = useState<string>('')

  useEffect(() => {
    const stored = sessionStorage.getItem('recommendResults')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setData(parsed)
        if (parsed.tiers.length > 0) setActiveTab(parsed.tiers[0].tier)
      } catch { router.push('/') }
    } else {
      router.push('/')
    }
    setLoading(false)
  }, [router])

  useEffect(() => {
    if (!data) return
    const profile = sessionStorage.getItem('userProfile')
    if (!profile) return

    setAiLoading(true)
    const allItems = data.tiers.flatMap(t => t.items.slice(0, 4))
    fetch('/api/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profile: JSON.parse(profile),
        recommendations: allItems.map(item => ({
          tier: item.tier,
          institutionName: item.record.institutionName,
          institutionType: item.institution?.type || '公办',
          groupCode: item.record.groupCode,
          groupName: item.record.groupName,
          majorDirection: item.record.majorName || '未指定',
          minimumScore: item.record.minimumScore,
          minimumRank: item.record.minimumRank,
          planCount: item.record.planCount,
          rankHistory: item.rankHistory,
          reason: item.reason,
          riskNotes: item.riskNotes,
          verificationStatus: item.record.verificationStatus,
          is985: item.institution?.is985 || false,
          is211: item.institution?.is211 || false,
          isDoubleFirst: item.institution?.isDoubleFirst || false,
          city: item.institution?.city || '',
        })),
      }),
    }).then(r => r.json()).then(d => {
      setAiReport(d.report)
      if (d.aiUnavailable) setAiUnavailable(true)
    }).catch(() => {
      setAiReport('AI报告生成遇到问题，基础推荐结果已就绪。')
      setAiUnavailable(true)
    }).finally(() => setAiLoading(false))
  }, [data])

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-12 text-center text-[var(--color-text-muted)]">加载中...</div>
  if (!data) return null

  const tierColors: Record<string, string> = {
    '冲刺': 'border-l-red-500 bg-red-50',
    '偏冲': 'border-l-orange-500 bg-orange-50',
    '稳妥': 'border-l-green-500 bg-green-50',
    '偏稳': 'border-l-blue-500 bg-blue-50',
    '保底': 'border-l-indigo-500 bg-indigo-50',
    '数据不足': 'border-l-gray-400 bg-gray-50',
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Profile Summary */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4 mb-4">
        <h1 className="text-lg font-bold mb-2">分析结果</h1>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-[var(--color-text-muted)]">
          <span>数据年份：<strong className="text-[var(--color-text)]">{data.dataYear}年</strong></span>
          {data.availableHistoryYears.length > 0 && (
            <span>历史参考：<strong className="text-[var(--color-text)]">{data.availableHistoryYears.join('、')}年</strong></span>
          )}
          <span>匹配结果：<strong className="text-[var(--color-text)]">{data.totalResults}个</strong>院校专业组</span>
        </div>
      </div>

      {/* AI Report */}
      {aiLoading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 text-sm text-[var(--color-text-muted)]">
          正在生成个性化分析报告...
        </div>
      )}
      {aiReport && (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold">AI个性化分析报告</h2>
            {aiUnavailable && <span className="text-xs text-[var(--color-warning)]">AI服务暂时不可用，以下为基础报告</span>}
          </div>
          <div className="text-sm whitespace-pre-wrap leading-relaxed text-[var(--color-text-muted)]">{aiReport}</div>
          <div className="mt-3 text-xs text-[var(--color-text-muted)] border-t pt-2">
            此报告基于系统筛选的录取数据生成，仅供参考。AI不编造分数、排位或招生计划。
          </div>
        </div>
      )}

      {/* Tier Tabs */}
      {data.tiers.length > 0 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {data.tiers.map(t => (
            <button key={t.tier} onClick={() => setActiveTab(t.tier)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border ${activeTab === t.tier ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' : 'bg-white border-[var(--color-border)]'}`}>
              {t.tier}（{t.count}）
            </button>
          ))}
        </div>
      )}

      {/* Results List */}
      {data.tiers.filter(t => t.tier === activeTab).map(tier => (
        <div key={tier.tier} className="space-y-3">
          {tier.items.map((item, idx) => (
            <div key={idx} className={`bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4 border-l-4 ${tierColors[item.tier] || 'border-l-gray-300'}`}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-sm font-semibold">
                    {item.record.institutionName}
                    {item.institution?.is985 && <span className="ml-1 px-1.5 py-0.5 bg-red-100 text-red-700 text-xs rounded">985</span>}
                    {item.institution?.is211 && <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">211</span>}
                    {item.institution?.isDoubleFirst && <span className="ml-1 px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded">双一流</span>}
                  </h3>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {item.institution?.type || ''} · {item.institution?.city || ''} · 专业组{item.record.groupCode} {item.record.groupName}
                  </p>
                </div>
                <span className="text-xs font-bold text-[var(--color-primary)] whitespace-nowrap">{item.tier}</span>
              </div>

              {/* Score History */}
              {item.rankHistory.length > 0 && (
                <div className="flex gap-3 mb-2 text-xs">
                  {item.rankHistory.map(h => (
                    <span key={h.year} className="text-[var(--color-text-muted)]">
                      {h.year}年: <strong className="text-[var(--color-text)]">{h.rank?.toLocaleString() || '-'}名</strong>
                      {h.score && <span className="ml-0.5">/{h.score}分</span>}
                    </span>
                  ))}
                  {item.record.minimumRank && (
                    <span className="text-[var(--color-text-muted)]">
                      {data.dataYear}年: <strong className="text-[var(--color-text)]">{item.record.minimumRank.toLocaleString()}名</strong>
                      {item.record.minimumScore && <span className="ml-0.5">/{item.record.minimumScore}分</span>}
                    </span>
                  )}
                </div>
              )}

              {/* Plan count */}
              {item.record.planCount && (
                <p className="text-xs text-[var(--color-text-muted)] mb-1">招生计划：{item.record.planCount}人</p>
              )}

              {/* Subject requirements */}
              {item.record.subjectRequirements && (
                <p className="text-xs text-[var(--color-text-muted)] mb-1">
                  选科要求：{(() => { try { return JSON.parse(item.record.subjectRequirements).join('、') } catch { return item.record.subjectRequirements } })()}
                </p>
              )}

              {/* Reason */}
              <p className="text-xs text-[var(--color-text-muted)] mb-2 leading-relaxed">{item.reason}</p>

              {/* Risk notes */}
              {item.riskNotes.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-2">
                  {item.riskNotes.map((note, i) => (
                    <p key={i} className="text-xs text-[var(--color-text-muted)] leading-relaxed">⚠ {note}</p>
                  ))}
                </div>
              )}

              {/* Source */}
              <div className="text-[10px] text-[var(--color-text-muted)] border-t pt-2 mt-2">
                <span className="mr-3">验证状态：{item.record.verificationStatus === 'verified' ? '✅ 已双重验证' : item.record.verificationStatus === 'single-source' ? '📋 单一官方来源' : item.record.verificationStatus}</span>
                <span>数据来源：{item.record.sourceLevel}级 · {item.record.sourceName}</span>
                {item.record.officialPublishedAt && <span className="ml-2">发布于：{item.record.officialPublishedAt}</span>}
              </div>

              {/* Data type warning */}
              {item.record.dataType === 'group' && (
                <p className="text-[10px] text-orange-600 mt-1">此为院校专业组投档最低排位，非具体专业录取数据。组内专业可能存在差异，最终以官方招生专业目录为准。</p>
              )}
            </div>
          ))}
        </div>
      ))}

      {/* Empty state */}
      {data.totalResults === 0 && (
        <div className="text-center py-12 text-[var(--color-text-muted)]">
          <p className="text-lg mb-2">未找到匹配的院校专业组</p>
          <p className="text-sm">该年度官方数据可能尚未发布或尚未收录。请尝试选择其他年份，或调整筛选条件。</p>
          <Link href="/questionnaire" className="inline-block mt-4 text-[var(--color-primary)] text-sm">重新填写 →</Link>
        </div>
      )}

      {/* Bottom actions */}
      <div className="flex gap-3 mt-6 pb-8">
        <Link href="/questionnaire" className="flex-1 text-center border border-[var(--color-border)] bg-white py-2.5 rounded text-sm no-underline">重新填写</Link>
        <Link href="/sources" className="flex-1 text-center border border-[var(--color-border)] bg-white py-2.5 rounded text-sm no-underline">查看数据来源</Link>
      </div>

      {/* Disclaimer */}
      <div className="bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/30 rounded p-3 text-xs text-[var(--color-text-muted)]">
        <strong>重要提示：</strong>以上推荐仅基于广东省官方公开招生数据和您提供的信息进行初步分析。招生计划、专业组划分、选科要求和录取规则可能发生变化。本系统不保证录取，不替代广东省官方志愿填报系统。请务必以目标招生年度广东省教育考试院和高校招生章程为准。
      </div>
    </div>
  )
}
