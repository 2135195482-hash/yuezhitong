# Official Data Audit

Date: 2026-06-28

## Scope

广东省普通高考普通类本科批，2023-2025 年，历史类与物理类，院校专业组投档数据。

## Source Files

- 2023 archive: https://eea.gd.gov.cn/attachment/0/526/526559/4221648.zip -> data/official/raw/2023/archive/广东省2023年本科批次投档情况.zip (2641851 bytes, SHA-256 `807e0a7ff79822ccf881913e6943cc187d5c952d8cd3c444e77db2730fc253aa`, verified)
- 2024 archive: https://eea.gd.gov.cn/attachment/0/554/554636/4458330.zip -> data/official/raw/2024/archive/广东省2024年本科投档情况.zip (2753736 bytes, SHA-256 `bff3dcdc9c101c24f02c94000ae340b3c6943ee1d411baf5a692831ab3cf5d49`, verified)
- 2025 历史类: https://eea.gd.gov.cn/attachment/0/585/585885/4746781.pdf -> data/official/raw/2025/history/广东省2025年本科普通类（历史）投档情况.pdf (431545 bytes, SHA-256 `ab814f4a274132f23919471419a3bb1cdcf89b257177b7a640f2865af55f18df`, verified)
- 2025 物理类: https://eea.gd.gov.cn/attachment/0/585/585886/4746786.pdf -> data/official/raw/2025/physics/广东省2025年本科普通类（物理）投档情况.pdf (753301 bytes, SHA-256 `2852813a5723c67d97925dc8ad3a897b4b37c3bc50fd58dfae758625f3daa7f0`, verified)

## Published Counts

- 2023 物理类：2666
- 2023 历史类：1511
- 2024 物理类：3121
- 2024 历史类：1560
- 2025 物理类：3503
- 2025 历史类：1637
- 正式发布记录总数：13998
- review 数量：0
- rejected 数量：0
- 演示数据数量：0
- 占位来源数量：0

## Quality Gates

- 年份隔离：通过
- 科类隔离：通过
- 本科批普通类隔离：通过
- 来源域名：通过
- 文件哈希：通过
- 重复唯一键：通过
- 异常分数和排位：通过
- 2025 未显示为 2026：通过
