import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'

export const metadata: Metadata = {
  title: '粤志通 2026 官方历史数据静态测试版',
  description: '查询广东省教育考试院历史院校专业组投档数据，并对用户录入的2026候选方案进行本地复核。',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-[var(--color-bg)]">
        <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <Link href="/" className="text-xl font-bold text-[var(--color-primary)] no-underline">粤志通</Link>
              <span className="text-xs text-[var(--color-text-muted)] ml-2">历史数据查询 + 方案复核</span>
            </div>
            <nav className="flex gap-3 text-sm">
              <Link href="/official" className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)] no-underline">官方历史数据</Link>
              <Link href="/questionnaire" className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)] no-underline">方案复核</Link>
              <Link href="/sources" className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)] no-underline">数据说明</Link>
              <Link href="/disclaimer" className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)] no-underline">免责声明</Link>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="border-t border-[var(--color-border)] mt-12 py-6 text-center text-xs text-[var(--color-text-muted)]">
          <p>内置数据为广东省教育考试院公开发布的历史院校专业组投档数据，不是具体专业录取数据，也不是2026年招生计划。</p>
          <p className="mt-1">最终填报请以广东省教育考试院官方志愿系统、《广东省2026年普通高等学校招生专业目录》及高校招生章程为准。</p>
        </footer>
      </body>
    </html>
  )
}
