import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '粤志通 2026 志愿方案复核公测版',
  description: '对广东高考考生自行录入的院校专业组候选方案进行梯度、费用、专业方向和调剂风险复核。',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-[var(--color-bg)]">
        <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <a href="/" className="text-xl font-bold text-[var(--color-primary)] no-underline">粤志通</a>
              <span className="text-xs text-[var(--color-text-muted)] ml-2">2026志愿方案复核</span>
            </div>
            <nav className="flex gap-3 text-sm">
              <a href="/questionnaire" className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)] no-underline">方案复核</a>
              <a href="/sources" className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)] no-underline">数据说明</a>
              <a href="/disclaimer" className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)] no-underline">免责声明</a>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="border-t border-[var(--color-border)] mt-12 py-6 text-center text-xs text-[var(--color-text-muted)]">
          <p>本工具仅对用户自行录入的志愿候选方案进行整理和辅助分析，不提供官方招生数据，不构成录取预测或志愿填报承诺。</p>
          <p className="mt-1">最终填报请以《广东省2026年普通高等学校招生专业目录》、广东省教育考试院志愿填报系统及高校招生章程为准。</p>
        </footer>
      </body>
    </html>
  )
}
