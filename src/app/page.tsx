import Link from 'next/link'
import { PUBLIC_DISCLAIMER } from '@/lib/plan-review'

export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <section className="py-6">
        <p className="text-sm font-medium text-[var(--color-primary)]">粤志通 2026 志愿方案复核公测版</p>
        <h1 className="mt-2 text-3xl font-bold text-[var(--color-text)]">广东高考志愿方案复核助手</h1>
        <p className="mt-4 max-w-3xl text-lg leading-relaxed text-[var(--color-text)]">
          把你初步选好的院校专业组放进来，帮你检查梯度、专业方向、费用与退档风险。
        </p>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[var(--color-text-muted)]">
          请先通过广东省普通高考志愿填报辅助系统、《广东省2026年普通高等学校招生专业目录》及高校招生章程获取准确的院校代码、专业组代码和招生专业。本工具只负责辅助分析，不生成或修改官方招生数据。
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/questionnaire" className="rounded bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white no-underline">
            开始复核候选方案
          </Link>
          <Link href="/sources" className="rounded border border-[var(--color-border)] bg-white px-6 py-3 text-sm font-semibold no-underline">
            查看数据与免责声明
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <InfoCard title="1. 先用官方系统筛选" text="本工具不替代广东省官方辅助系统。先在官方渠道确定候选院校专业组，再录入本工具复核。" />
        <InfoCard title="2. 自行录入候选方案" text="支持逐条填写，也支持粘贴表格或CSV。缺失字段保持为空，系统不会自动补造。" />
        <InfoCard title="3. 本地规则复核" text="检查冲稳保梯度、学费预算、民办/中外合作、专业排斥、调剂和数据缺失风险。" />
      </section>

      <section className="mt-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <h2 className="text-base font-semibold">当前产品边界</h2>
        <ul className="mt-3 space-y-2 text-sm text-[var(--color-text-muted)]">
          <li>不提供官方招生数据，不读取演示库作为真实推荐。</li>
          <li>不生成精确录取概率，不声称保证录取。</li>
          <li>不收集身份证号、考生号、志愿系统密码、手机验证码或家庭住址。</li>
          <li>不自动提交志愿，用户必须在广东官方志愿系统完成最终确认。</li>
        </ul>
      </section>

      <section className="mt-6 rounded-lg border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 p-4 text-xs leading-relaxed text-[var(--color-text-muted)]">
        {PUBLIC_DISCLAIMER}
      </section>
    </main>
  )
}

function InfoCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">{text}</p>
    </div>
  )
}
