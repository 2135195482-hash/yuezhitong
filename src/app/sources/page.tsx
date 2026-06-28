import { PUBLIC_DISCLAIMER } from '@/lib/plan-review'

export default function SourcesPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="text-2xl font-bold">数据与核对说明</h1>
      <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">
        当前公测版暂不提供全量官方招生数据库，也不使用演示数据进行真实推荐。系统分析的对象，是用户自行录入的候选院校专业组方案。
      </p>

      <section className="mt-5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <h2 className="text-base font-semibold">用户需要自行核实的官方渠道</h2>
        <ul className="mt-3 space-y-2 text-sm text-[var(--color-text-muted)]">
          <li>《广东省2026年普通高等学校招生专业目录》。</li>
          <li>广东省教育考试院志愿填报系统及普通高考志愿填报辅助系统。</li>
          <li>目标高校2026年招生章程、招生专业目录和收费说明。</li>
          <li>高校官方招生网发布的专业录取规则、校区、体检限制、单科要求等信息。</li>
        </ul>
      </section>

      <section className="mt-5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <h2 className="text-base font-semibold">系统会做什么</h2>
        <ul className="mt-3 space-y-2 text-sm text-[var(--color-text-muted)]">
          <li>整理用户录入的院校专业组候选项。</li>
          <li>根据用户录入的2023、2024、2025最低排位做冲稳保分层。</li>
          <li>提示费用、民办/中外合作、调剂、专业排斥、选科匹配和数据缺失风险。</li>
          <li>生成“建议研究顺序”和核对清单，便于回到官方系统复核。</li>
        </ul>
      </section>

      <section className="mt-5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <h2 className="text-base font-semibold">系统不会做什么</h2>
        <ul className="mt-3 space-y-2 text-sm text-[var(--color-text-muted)]">
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
