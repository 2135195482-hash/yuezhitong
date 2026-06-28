export default function DisclaimerPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold mb-4">免责声明</h1>
      
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-5 mb-4 text-sm leading-relaxed text-[var(--color-text-muted)]">
        <p className="mb-3">
          <strong className="text-[var(--color-text)]">粤志通</strong>（以下简称"本系统"）是一个基于广东省官方公开招生信息提供初步分析参考的智能辅助工具。
        </p>

        <h2 className="text-base font-semibold text-[var(--color-text)] mb-2">1. 服务性质</h2>
        <p className="mb-3">本系统仅面向广东省普通高考考生，根据官方公开招生信息和用户提供的信息进行初步分析，仅供志愿研究与信息整理参考，不构成官方录取预测、志愿填报承诺或专业决策建议。招生计划、院校专业组、选科要求、收费标准和录取规则可能发生变化，请务必以目标招生年度广东省教育考试院、广东省官方志愿填报系统及高校招生章程为准。</p>

        <h2 className="text-base font-semibold text-[var(--color-text)] mb-2">2. 不承诺录取</h2>
        <p className="mb-3">本系统不保证用户被任何院校或专业录取。录取结果取决于广东省教育考试院的最终投档规则、院校招生章程、专业组竞争情况等多种因素，本系统无法预测或保证。</p>

        <h2 className="text-base font-semibold text-[var(--color-text)] mb-2">3. 不替代官方系统</h2>
        <p className="mb-3">本系统不替代广东省官方志愿填报系统。考生必须在广东省教育考试院指定的官方系统中完成志愿填报。本系统不对因使用本系统建议而导致的志愿填报后果承担责任。</p>

        <h2 className="text-base font-semibold text-[var(--color-text)] mb-2">4. 数据时效与准确性</h2>
        <p className="mb-3">本系统数据来自广东省教育考试院等官方渠道，但我们不对数据的完整性和时效性作出绝对保证。官方数据可能存在发布延迟、修正或更新。当前招生年度的数据如尚未正式发布，我们将明确标注，不会由AI推测。</p>

        <h2 className="text-base font-semibold text-[var(--color-text)] mb-2">5. 隐私保护</h2>
        <p className="mb-3">本系统不收集身份证号码、准考证号码、家庭住址等敏感个人信息。用户填写的问卷数据仅用于当次查询分析，不会长期存储或分享给第三方。</p>

        <h2 className="text-base font-semibold text-[var(--color-text)] mb-2">6. AI辅助说明</h2>
        <p className="mb-3">本系统可能使用AI技术生成个性化分析报告和回答用户追问。AI不用于生成录取分数、最低排位、招生计划等核心数据。AI输出经过系统校验，但可能存在不准确之处，仅供参考。</p>

        <h2 className="text-base font-semibold text-[var(--color-text)] mb-2">7. 关于"张雪峰Skill"</h2>
        <p className="mb-3">本系统在分析方法上参考了升学规划领域的方法论框架。本系统与张雪峰本人或其相关机构无关，不获得其授权，不使用其姓名、肖像或声音进行宣传。系统为独立的智能辅助工具，分析框架基于公开的升学规划方法论。</p>

        <h2 className="text-base font-semibold text-[var(--color-text)] mb-2">8. 知识产权</h2>
        <p className="mb-3">本系统的代码和原创分析框架归开发者所有。院校专业组投档数据归原始发布机构所有。用户在引用系统输出时请注明数据原始来源。</p>

        <p className="mt-6 pt-4 border-t border-[var(--color-border)] text-xs">最后更新：2026年6月</p>
      </div>
    </div>
  )
}
