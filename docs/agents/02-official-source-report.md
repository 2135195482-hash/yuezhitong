# Agent B - Official Source Report

Date: 2026-06-28

Official source domain: `eea.gd.gov.cn`

## Downloaded And Verified Attachments

- 2023 archive: https://eea.gd.gov.cn/attachment/0/526/526559/4221648.zip -> data/official/raw/2023/archive/广东省2023年本科批次投档情况.zip (2641851 bytes, SHA-256 `807e0a7ff79822ccf881913e6943cc187d5c952d8cd3c444e77db2730fc253aa`, verified)
- 2024 archive: https://eea.gd.gov.cn/attachment/0/554/554636/4458330.zip -> data/official/raw/2024/archive/广东省2024年本科投档情况.zip (2753736 bytes, SHA-256 `bff3dcdc9c101c24f02c94000ae340b3c6943ee1d411baf5a692831ab3cf5d49`, verified)
- 2025 历史类: https://eea.gd.gov.cn/attachment/0/585/585885/4746781.pdf -> data/official/raw/2025/history/广东省2025年本科普通类（历史）投档情况.pdf (431545 bytes, SHA-256 `ab814f4a274132f23919471419a3bb1cdcf89b257177b7a640f2865af55f18df`, verified)
- 2025 物理类: https://eea.gd.gov.cn/attachment/0/585/585886/4746786.pdf -> data/official/raw/2025/physics/广东省2025年本科普通类（物理）投档情况.pdf (753301 bytes, SHA-256 `2852813a5723c67d97925dc8ad3a897b4b37c3bc50fd58dfae758625f3daa7f0`, verified)

## Notes

- The local command-line network path to `eea.gd.gov.cn` failed during automated download, so the user downloaded the same official attachments from the official pages.
- Files were copied into `data/official/raw/`, which is ignored by Git.
- ZIP/PDF magic bytes, ZIP extraction, PDF page counts, file sizes, and SHA-256 hashes were verified locally before parsing.
