# Agent C - Parser Report

Date: 2026-06-28

## Parser Inputs

- 2023 and 2024 ZIP archives were decoded, and only `本科普通类（历史）` plus `本科普通类（物理）` PDFs were extracted.
- 2025 history and physics PDFs were parsed directly.
- Non-normal categories in the ZIP files were ignored.

## Parser Output

- 2023 历史类：1511 records
- 2023 物理类：2666 records
- 2024 历史类：1560 records
- 2024 物理类：3121 records
- 2025 历史类：1637 records
- 2025 物理类：3503 records

## Normalized Granularity

Every published record is marked as `院校专业组投档` and `isMajorAdmissionScore: false`.
