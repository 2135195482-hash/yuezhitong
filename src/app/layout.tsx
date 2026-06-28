import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '粤志通 - 广东高考志愿与专业方向咨询',
  description: '基于广东省教育考试院官方公开招生信息，为广东高考考生提供院校专业组筛选、专业方向分析和个性化志愿咨询。',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-[var(--color-bg)]">
        <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <div>
              <a href="/" className="text-xl font-bold text-[var(--color-primary)] no-underline">粤志通</a>
              <span className="text-xs text-[var(--color-text-muted)] ml-2">广东高考志愿咨询</span>
            </div>
            <nav className="flex gap-4 text-sm">
              <a href="/sources" className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)] no-underline">数据来源</a>
              <a href="/disclaimer" className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)] no-underline">免责声明</a>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="border-t border-[var(--color-border)] mt-12 py-6 text-center text-xs text-[var(--color-text-muted)]">
          <p>本系统仅面向广东省普通高考考生，依据官方公开招生信息提供初步分析参考，不构成录取预测或志愿填报承诺。</p>
          <p className="mt-1">最终填报请以广东省教育考试院、广东省官方志愿填报系统及高校招生章程为准。</p>
        </footer>
      </body>
    </html>
  )
}
