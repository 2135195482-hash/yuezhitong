import { PUBLIC_DISCLAIMER } from '@/lib/plan-review'

export default function DisclaimerPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="text-2xl font-bold">免责声明</h1>

      <section className="mt-5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-sm leading-relaxed text-[var(--color-text-muted)]">
        <p className="mb-4 font-medium text-[var(--color-text)]">{PUBLIC_DISCLAIMER}</p>

        <h2 className="mb-2 mt-4 text-base font-semibold text-[var(--color-text)]">1. 服务性质</h2>
        <p>粤志通当前版本是广东高考历史数据查询与志愿候选方案复核工具。它不是广东省官方志愿填报辅助系统，也不是高校招生机构。</p>

        <h2 className="mb-2 mt-4 text-base font-semibold text-[var(--color-text)]">2. 数据责任</h2>
        <p>内置数据来自广东省教育考试院公开历史投档附件，粒度为院校专业组投档，不是具体专业录取数据。2026年院校代码、院校专业组代码、招生专业、招生计划、选科要求、收费标准、校区和录取规则必须由用户回到官方渠道核实。本工具不会补造缺失数据。</p>

        <h2 className="mb-2 mt-4 text-base font-semibold text-[var(--color-text)]">3. 不承诺录取</h2>
        <p>本工具不会输出精确录取概率，不保证任何院校或专业录取结果。历史排位只能作为研究参考，不能替代2026年正式招生计划和投档规则。</p>

        <h2 className="mb-2 mt-4 text-base font-semibold text-[var(--color-text)]">4. 隐私边界</h2>
        <p>本工具不需要身份证号、考生号、志愿系统密码、手机验证码或家庭住址。候选方案默认保存在浏览器本地，不建立账号系统。</p>

        <h2 className="mb-2 mt-4 text-base font-semibold text-[var(--color-text)]">5. AI说明</h2>
        <p>当前静态版使用本地规则分析，AI深度解释暂未开放。服务端AI代码不会参与GitHub Pages静态运行，也不会在前端放置API Key。</p>

        <p className="mt-6 border-t border-[var(--color-border)] pt-4 text-xs">最后更新：2026年6月28日</p>
      </section>
    </main>
  )
}
