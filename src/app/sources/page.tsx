'use client'

import { useState, useEffect } from 'react'

interface Source {
  sourceName: string
  sourceUrl: string
  sourceLevel: string
  officialTitle: string
  officialPublishedAt: string
  admissionYear: number
  verificationStatus: string
}

export default function SourcesPage() {
  const [sources, setSources] = useState<Source[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/sources?year=0').then(r => r.json()).then(d => {
      setSources(d.sources || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold mb-2">数据来源</h1>
      <p className="text-sm text-[var(--color-text-muted)] mb-6">本系统采用的所有数据均可追溯至权威官方来源。以下是当前已收录的数据来源清单。</p>

      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4 mb-4">
        <h2 className="text-sm font-semibold mb-2">来源等级说明</h2>
        <ul className="text-xs text-[var(--color-text-muted)] space-y-1">
          <li><strong className="text-[var(--color-text)]">A级：</strong>广东省教育考试院、广东省教育厅、教育部、教育部阳光高考平台、高校招生官网 — 可作为推荐核心依据</li>
          <li><strong className="text-[var(--color-text)]">B级：</strong>高校官方微信公众号、官方新闻稿、政府开放数据平台 — 仅用于交叉核对，不与A级数据冲突</li>
        </ul>
      </div>

      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4 mb-4">
        <h2 className="text-sm font-semibold mb-2">双重验证规则</h2>
        <p className="text-xs text-[var(--color-text-muted)]">
          关键投档数据优先采用双重验证：广东省教育考试院数据与对应高校招生官网数据进行比对。
          一致则标记为「已双重验证」，仅有一方数据则标记为「单一官方来源」，存在冲突则暂不参与推荐。
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-[var(--color-text-muted)]">加载中...</p>
      ) : sources.length === 0 ? (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-8 text-center">
          <p className="text-sm text-[var(--color-text-muted)]">数据来源暂未加载。运行数据采集脚本后此处将显示完整来源清单。</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sources.map((s, i) => (
            <div key={i} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">{s.sourceName}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">{s.sourceLevel}级</span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)]">{s.officialTitle}</p>
              <div className="flex gap-4 mt-1 text-[10px] text-[var(--color-text-muted)]">
                <span>年份：{s.admissionYear}</span>
                <span>发布：{s.officialPublishedAt}</span>
                <span>验证：{s.verificationStatus === 'verified' ? '✅ 已双重验证' : s.verificationStatus === 'single-source' ? '📋 单一来源' : s.verificationStatus}</span>
              </div>
              {s.sourceUrl && (
                <a href={s.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-[var(--color-primary)] break-all">{s.sourceUrl}</a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
