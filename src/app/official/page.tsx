// @ts-nocheck
'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  OFFICIAL_DATA_DISCLAIMER,
  buildHistoricalCandidate,
  buildHistoricalReferencePool,
  getReliableTrendRows,
  searchOfficialRecords,
} from '@/lib/official-data'

const STORAGE_KEY = 'yzt-plan-review-v1'
const YEARS = [2025, 2024, 2023]
const CATEGORIES = ['物理类', '历史类']

function dataBasePath() {
  if (typeof window === 'undefined') return ''
  const path = window.location.pathname
  for (const marker of ['/official', '/official/']) {
    const index = path.indexOf(marker)
    if (index >= 0) return path.slice(0, index)
  }
  return ''
}

async function fetchOfficialJson(file) {
  const response = await fetch(`${dataBasePath()}/data/official/${file}`)
  if (!response.ok) throw new Error(`无法加载 ${file}`)
  return response.json()
}

export default function OfficialDataPage() {
  const [catalog, setCatalog] = useState(null)
  const [year, setYear] = useState(2025)
  const [category, setCategory] = useState('物理类')
  const [query, setQuery] = useState('')
  const [records, setRecords] = useState([])
  const [allCategoryRecords, setAllCategoryRecords] = useState([])
  const [selected, setSelected] = useState(null)
  const [profile, setProfile] = useState(null)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchOfficialJson('catalog.json').then(setCatalog).catch((err) => setError(err.message))
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
      if (stored.profile) setProfile(stored.profile)
    } catch {}
  }, [])

  useEffect(() => {
    loadYearCategory(year, category)
  }, [year, category])

  const loadYearCategory = async (nextYear, nextCategory) => {
    setLoading(true)
    setError('')
    try {
      const file = `${nextYear}-${nextCategory === '物理类' ? 'physics' : 'history'}.json`
      const rows = await fetchOfficialJson(file)
      setRecords(rows)
      setSelected(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const searchResults = useMemo(() => searchOfficialRecords(records, { year, category, query, limit: 80 }), [records, year, category, query])
  const trendRows = useMemo(() => getReliableTrendRows(allCategoryRecords.length ? allCategoryRecords : records, selected), [allCategoryRecords, records, selected])
  const referencePool = useMemo(() => {
    if (!profile?.rank) return []
    return buildHistoricalReferencePool(allCategoryRecords.length ? allCategoryRecords : records, { category, rank: Number(profile.rank) })
  }, [allCategoryRecords, records, profile, category])

  const loadAllCategory = async () => {
    setLoading(true)
    setError('')
    try {
      const files = YEARS.map((item) => `${item}-${category === '物理类' ? 'physics' : 'history'}.json`)
      const parts = await Promise.all(files.map(fetchOfficialJson))
      setAllCategoryRecords(parts.flat())
      setStatus(`已加载${category} 2023-2025 历史数据，可生成历史参考候选。`)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const addToPlan = (row) => {
    const candidate = buildHistoricalCandidate(row)
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
      const candidates = Array.isArray(stored.candidates) ? stored.candidates : []
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...stored, candidates: [...candidates, candidate] }))
      setStatus(`${row.institutionName} 历史记录已加入研究方案。请到方案复核页手动补充2026院校代码、专业组代码、招生专业、计划、学费和调剂态度。`)
    } catch {
      setError('加入失败，请检查浏览器本地存储是否可用。')
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-5">
        <p className="text-xs font-medium text-[var(--color-primary)]">官方历史数据查询</p>
        <h1 className="mt-1 text-2xl font-bold">广东普通类本科批院校专业组投档数据</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--color-text-muted)]">
          查询广东省教育考试院公开发布的 2023-2025 年普通类本科批历史投档数据。页面按年份和科类加载，不包含 2026 招生计划。
        </p>
      </div>

      <section className="mb-5 rounded-lg border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 p-3 text-xs leading-relaxed text-[var(--color-text-muted)]">
        {OFFICIAL_DATA_DISCLAIMER}
        <span className="mt-1 block">本工具不保证录取，不自动提交志愿，不收集志愿系统密码；用户输入默认保存在本机浏览器，建议导出备份。</span>
      </section>

      <section className="mb-5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <div className="grid gap-3 md:grid-cols-[160px_160px_1fr_auto]">
          <label className="text-sm">
            科类
            <select value={category} onChange={(event) => {
              setCategory(event.target.value)
              setAllCategoryRecords([])
            }} className="mt-1 w-full rounded border border-[var(--color-border)] bg-white p-2">
              {CATEGORIES.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label className="text-sm">
            年份
            <select value={year} onChange={(event) => setYear(Number(event.target.value))} className="mt-1 w-full rounded border border-[var(--color-border)] bg-white p-2">
              {YEARS.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="text-sm">
            院校名称或代码
            <input value={query} onChange={(event) => setQuery(event.target.value)} className="mt-1 w-full rounded border border-[var(--color-border)] p-2" placeholder="例：深圳大学 / 10590 / 221" />
          </label>
          <button type="button" onClick={() => loadYearCategory(year, category)} className="self-end rounded bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white">
            重新加载
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]">
          {catalog && <span>数据版本：{catalog.version}，正式记录 {catalog.totalRecords} 条。</span>}
          {loading && <span>正在加载...</span>}
          {error && <span className="text-red-600">{error}</span>}
          {status && <span className="text-[var(--color-primary)]">{status}</span>}
        </div>
      </section>

      <section className="mb-5 grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold">查询结果</h2>
            <span className="text-xs text-[var(--color-text-muted)]">显示 {searchResults.length} / {records.length} 条</span>
          </div>
          <div className="space-y-2">
            {searchResults.map((row) => (
              <article key={`${row.admissionYear}-${row.category}-${row.institutionCode}-${row.groupCode}`} className="rounded border border-[var(--color-border)] bg-white p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">{row.institutionName}</h3>
                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                      院校代码 {row.institutionCode} · 历史专业组 {row.groupCode} · {row.admissionYear} {row.category}
                    </p>
                  </div>
                  <button type="button" onClick={() => setSelected(row)} className="rounded border border-[var(--color-primary)] px-3 py-1.5 text-xs text-[var(--color-primary)]">看趋势</button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                  <Metric label="计划数" value={row.planCount} />
                  <Metric label="投档人数" value={row.submittedCount} />
                  <Metric label="最低分" value={row.minimumScore} />
                  <Metric label="最低排位" value={row.minimumRank} />
                </div>
                <p className="mt-2 text-xs text-[var(--color-text-muted)]">数据粒度：{row.dataGranularity}。不是具体专业录取数据。</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a href={row.sourcePageUrl} className="rounded border border-[var(--color-border)] px-3 py-1.5 text-xs no-underline" target="_blank">官方来源</a>
                  <button type="button" onClick={() => addToPlan(row)} className="rounded bg-[var(--color-primary)] px-3 py-1.5 text-xs font-medium text-white">加入研究方案</button>
                </div>
              </article>
            ))}
          </div>
        </div>

        <aside className="space-y-4">
          <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <h2 className="text-base font-semibold">历史趋势</h2>
            {!selected && <p className="mt-2 text-sm text-[var(--color-text-muted)]">选择一条记录后查看。专业组每年可能变化，系统不会只凭组代码强行跨年连接。</p>}
            {selected && (
              <div className="mt-3">
                <p className="text-sm font-medium">{selected.institutionName} · 历史专业组 {selected.groupCode}</p>
                {trendRows.length < 2 && <p className="mt-2 text-xs text-orange-700">未找到可靠跨年映射，按年度独立展示。请以2026专业目录核验专业组设置。</p>}
                <div className="mt-2 space-y-2">
                  {trendRows.map((row) => (
                    <div key={`${row.admissionYear}-${row.groupCode}`} className="rounded border border-[var(--color-border)] bg-white p-2 text-xs">
                      {row.admissionYear}：最低分 {row.minimumScore}，最低排位 {row.minimumRank}，计划 {row.planCount}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <h2 className="text-base font-semibold">历史参考候选</h2>
            <p className="mt-2 text-xs leading-relaxed text-[var(--color-text-muted)]">根据你在方案复核页填写的省排位，从 2023-2025 历史投档数据中找接近排位的研究对象。它们不是2026官方可填志愿。</p>
            <button type="button" onClick={loadAllCategory} className="mt-3 w-full rounded border border-[var(--color-primary)] px-3 py-2 text-sm text-[var(--color-primary)]">
              加载三年{category}数据
            </button>
            {!profile?.rank && <p className="mt-2 text-xs text-orange-700">请先在方案复核页填写考生排位。</p>}
            <div className="mt-3 max-h-[520px] space-y-2 overflow-auto pr-1">
              {referencePool.slice(0, 20).map((row) => (
                <div key={`${row.admissionYear}-${row.institutionCode}-${row.groupCode}`} className="rounded border border-[var(--color-border)] bg-white p-2 text-xs">
                  <p className="font-medium">{row.institutionName} · {row.groupCode}</p>
                  <p className="mt-1 text-[var(--color-text-muted)]">{row.admissionYear} {row.category} · 最低排位 {row.minimumRank} · {row.tier}</p>
                  <button type="button" onClick={() => addToPlan(row)} className="mt-2 rounded bg-[var(--color-primary)] px-2 py-1 text-white">加入研究方案</button>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </main>
  )
}

function Metric({ label, value }) {
  return (
    <div className="rounded border border-[var(--color-border)] p-2">
      <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
      <p className="font-semibold">{value ?? '空'}</p>
    </div>
  )
}
