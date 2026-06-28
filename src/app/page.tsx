import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <section className="text-center py-8">
        <h1 className="text-3xl font-bold text-[var(--color-primary)] mb-3">粤志通</h1>
        <p className="text-lg text-[var(--color-text)] max-w-2xl mx-auto mb-2">
          根据广东省排位、选科和个人偏好，基于院校专业组历史投档数据初步筛选与方向分析
        </p>
        <p className="text-sm text-[var(--color-text-muted)] max-w-xl mx-auto">
          基于广东省教育考试院官方公布的院校专业组投档数据和升学规划方法论的智能辅助工具
        </p>
      </section>

      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-5 mb-6">
        <h2 className="text-base font-semibold mb-3">服务范围</h2>
        <ul className="text-sm space-y-2 text-[var(--color-text-muted)]">
          <li>✅ 仅服务<strong className="text-[var(--color-text)]">广东省普通高考考生</strong></li>
          <li>✅ 覆盖<strong className="text-[var(--color-text)]">物理类与历史类</strong>本科批</li>
          <li>✅ 基于<strong className="text-[var(--color-text)]">广东省排位</strong>进行分析</li>
          <li>✅ 参考<strong className="text-[var(--color-text)]">2023、2024、2025</strong>年院校专业组投档数据</li>
          <li>❌ 本系统<strong className="text-[var(--color-text)]">不覆盖</strong>其他省份、专科批、艺术体育类、特殊类型招生</li>
        </ul>
      </section>

      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-5 mb-6">
        <h2 className="text-base font-semibold mb-3">为什么优先参考排位？</h2>
        <p className="text-sm text-[var(--color-text-muted)]">
          广东新高考实行院校专业组模式，每年试题难度不同，分数波动较大。
          但各院校专业组在广东省的录取排位相对稳定。因此，<strong className="text-[var(--color-text)]">广东省排位是判断录取可能性的最重要依据</strong>，
          分数仅作为辅助参考。
        </p>
      </section>

      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-5 mb-6">
        <h2 className="text-base font-semibold mb-3">数据来源</h2>
        <p className="text-sm text-[var(--color-text-muted)]">
          数据来自<strong className="text-[var(--color-text)]">广东省教育考试院</strong>发布的正式投档数据、
          分数段统计和招生专业目录，以及<strong className="text-[var(--color-text)]">教育部</strong>公布的普通高等学校名单。
          所有数据均标注年份和来源，可追溯至原始官方文件。
          <Link href="/sources" className="text-[var(--color-primary)] ml-1">查看数据来源 →</Link>
        </p>
      </section>

      <section className="bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/30 rounded-lg p-4 mb-6">
        <p className="text-xs text-[var(--color-text-muted)]">
          <strong>免责声明：</strong>本系统仅面向广东省普通高考考生，根据官方公开招生信息和用户提供的信息进行初步分析，
          仅供志愿研究与信息整理参考，不构成官方录取预测、志愿填报承诺或专业决策建议。
          招生计划、院校专业组、选科要求、收费标准和录取规则可能发生变化，
          请务必以目标招生年度广东省教育考试院、广东省官方志愿填报系统及高校招生章程为准。
        </p>
      </section>

      <div className="text-center py-4">
        <Link
          href="/questionnaire"
          className="inline-block bg-[var(--color-primary)] text-white px-8 py-3 rounded-lg text-base font-medium no-underline hover:bg-[var(--color-primary-dark)] transition-colors"
        >
          开始咨询
        </Link>
      </div>
    </div>
  )
}
