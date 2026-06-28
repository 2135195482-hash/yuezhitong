import { PUBLIC_DISCLAIMER } from '@/lib/plan-review'

export default function SourcesPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="text-2xl font-bold">数据与核对说明</h1>
      <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">
        当前静态测试版内置广东省教育考试院公开发布的2023-2025年普通类本科批院校专业组历史投档数据，同时保留用户自行录入候选方案的复核流程。
      </p>

      <section className="mt-5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <h2 className="text-base font-semibold">内置历史数据来源</h2>
        <ul className="mt-3 space-y-2 text-sm text-[var(--color-text-muted)]">
          <li>2023年本科批次投档情况：广东省教育考试院公告及附件。</li>
          <li>2024年本科批次投档情况：广东省教育考试院公告及附件。</li>
          <li>2025年本科普通类（历史、物理）投档情况：广东省教育考试院公告及附件。</li>
          <li>只发布普通类本科批历史类与物理类；艺术类、体育类、提前批、专科批等不进入本静态数据集。</li>
        </ul>
      </section>

      <section className="mt-5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <h2 className="text-base font-semibold">系统会做什么</h2>
        <ul className="mt-3 space-y-2 text-sm text-[var(--color-text-muted)]">
          <li>按年份、科类、院校名称或代码查询历史院校专业组投档数据。</li>
          <li>在可靠匹配时展示同一院校专业组跨年趋势；不只凭专业组代码强行连接。</li>
          <li>整理用户录入的院校专业组候选项。</li>
          <li>根据用户录入的2023、2024、2025最低排位做冲稳保分层。</li>
          <li>提示费用、民办/中外合作、调剂、专业排斥、选科匹配和数据缺失风险。</li>
          <li>生成“建议研究顺序”和核对清单，便于回到官方系统复核。</li>
        </ul>
      </section>

      <section className="mt-5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <h2 className="text-base font-semibold">系统不会做什么</h2>
        <ul className="mt-3 space-y-2 text-sm text-[var(--color-text-muted)]">
          <li>不会把历史投档数据描述为具体专业录取数据。</li>
          <li>不会把2023-2025历史数据冒充为2026招生计划。</li>
          <li>不会读取或展示231条演示数据作为真实推荐。</li>
          <li>不会自动生成院校代码、专业组代码、招生计划、最低分或最低排位。</li>
          <li>不会登录广东志愿填报系统，也不会自动提交志愿。</li>
          <li>不会给出精确录取概率或保证录取承诺。</li>
        </ul>
      </section>

      <section className="mt-5 rounded-lg border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 p-4 text-xs leading-relaxed text-[var(--color-text-muted)]">
        {PUBLIC_DISCLAIMER}
      </section>
    </main>
  )
}
