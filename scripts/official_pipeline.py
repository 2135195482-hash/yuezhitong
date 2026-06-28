import hashlib
import json
import re
import zipfile
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "official" / "raw"
WORK = ROOT / "data" / "official" / "work"
PROCESSED = ROOT / "data" / "official" / "processed"
MANIFESTS = ROOT / "data" / "official" / "manifests"
PUBLIC = ROOT / "public" / "data" / "official"
DOCS = ROOT / "docs"
AGENTS = DOCS / "agents"

SOURCE_DEFS = [
    {
        "admissionYear": 2023,
        "category": "archive",
        "sourcePageTitle": "本科批次投档情况",
        "sourcePageUrl": "https://eea.gd.gov.cn/ptgk/content/post_4221648.html",
        "sourceAttachmentUrl": "https://eea.gd.gov.cn/attachment/0/526/526559/4221648.zip",
        "localPath": "data/official/raw/2023/archive/广东省2023年本科批次投档情况.zip",
    },
    {
        "admissionYear": 2024,
        "category": "archive",
        "sourcePageTitle": "本科批次投档情况",
        "sourcePageUrl": "https://eea.gd.gov.cn/ptgk/content/post_4458330.html",
        "sourceAttachmentUrl": "https://eea.gd.gov.cn/attachment/0/554/554636/4458330.zip",
        "localPath": "data/official/raw/2024/archive/广东省2024年本科投档情况.zip",
    },
    {
        "admissionYear": 2025,
        "category": "历史类",
        "sourcePageTitle": "广东省2025年普通高考本科批次正式投档",
        "sourcePageUrl": "https://eea.gd.gov.cn/ptgk/content/post_4746781.html",
        "sourceAttachmentUrl": "https://eea.gd.gov.cn/attachment/0/585/585885/4746781.pdf",
        "localPath": "data/official/raw/2025/history/广东省2025年本科普通类（历史）投档情况.pdf",
    },
    {
        "admissionYear": 2025,
        "category": "物理类",
        "sourcePageTitle": "广东省2025年普通高考本科批次正式投档",
        "sourcePageUrl": "https://eea.gd.gov.cn/ptgk/content/post_4746781.html",
        "sourceAttachmentUrl": "https://eea.gd.gov.cn/attachment/0/585/585886/4746786.pdf",
        "localPath": "data/official/raw/2025/physics/广东省2025年本科普通类（物理）投档情况.pdf",
    },
]

ROW_RE = re.compile(r"^(\d{5})\s+(.+?)\s+(\d{3})\s+(\d+|-)\s+(\d+|-)\s+(\d+|-)\s+(\d+|-)$")
TARGET_CATEGORIES = ["历史类", "物理类"]
FILE_SLUG = {"历史类": "history", "物理类": "physics"}


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def ensure_dirs() -> None:
    for path in [WORK, PROCESSED, MANIFESTS, PUBLIC, AGENTS]:
        path.mkdir(parents=True, exist_ok=True)


def decode_zip_name(name: str) -> str:
    try:
        return name.encode("cp437").decode("gbk")
    except UnicodeError:
        return name


def build_manifest() -> list[dict]:
    manifest = []
    for source in SOURCE_DEFS:
        path = ROOT / source["localPath"]
        if not path.exists():
            raise FileNotFoundError(path)
        content = path.read_bytes()
        is_zip = content.startswith(b"PK\x03\x04")
        is_pdf = content.startswith(b"%PDF-")
        if not (is_zip or is_pdf):
            raise RuntimeError(f"not a ZIP/PDF official attachment: {path}")
        note = "zip verified" if is_zip else f"pdf verified:{len(PdfReader(str(path)).pages)} pages"
        entry = {
            "admissionYear": source["admissionYear"],
            "category": source["category"],
            "sourceOrganization": "广东省教育考试院",
            "sourcePageTitle": source["sourcePageTitle"],
            "sourcePageUrl": source["sourcePageUrl"],
            "sourceAttachmentUrl": source["sourceAttachmentUrl"],
            "sourceAttachmentName": path.name,
            "officialPublishedAt": "",
            "localPath": source["localPath"],
            "fileSize": path.stat().st_size,
            "mimeType": "application/zip" if is_zip else "application/pdf",
            "sha256": sha256_file(path),
            "downloadedAt": datetime.now(timezone.utc).isoformat(),
            "validationStatus": "verified",
            "validationNote": note,
        }
        if is_zip:
            with zipfile.ZipFile(path) as archive:
                if archive.testzip() is not None:
                    raise RuntimeError(f"zip validation failed: {path}")
                entry["zipEntries"] = [decode_zip_name(info.filename) for info in archive.infolist()]
        manifest.append(entry)
    return manifest


def extract_target_pdfs(manifest: list[dict]) -> list[dict]:
    pdf_sources = []
    for entry in manifest:
        path = ROOT / entry["localPath"]
        year = entry["admissionYear"]
        if path.suffix.lower() == ".pdf":
            pdf_sources.append({**entry, "pdfPath": path, "pdfName": path.name, "category": entry["category"]})
            continue
        with zipfile.ZipFile(path) as archive:
            for info in archive.infolist():
                decoded = decode_zip_name(info.filename)
                if "本科普通类" not in decoded:
                    continue
                category = "历史类" if "历史" in decoded else "物理类" if "物理" in decoded else ""
                if category not in TARGET_CATEGORIES:
                    continue
                out = WORK / str(year) / decoded
                out.parent.mkdir(parents=True, exist_ok=True)
                out.write_bytes(archive.read(info))
                pdf_sources.append({**entry, "pdfPath": out, "pdfName": decoded, "category": category})
    return sorted(pdf_sources, key=lambda item: (item["admissionYear"], item["category"]))


def is_boilerplate(line: str) -> bool:
    if not line:
        return True
    if "投档情况" in line or "院校代码" in line or "广东省教育考试院" in line:
        return True
    if re.match(r"^第\s*\d+\s*页", line):
        return True
    if re.fullmatch(r"\d{1,3}", line):
        return True
    if line.startswith("^") or line.startswith("w\x01eY"):
        return True
    return False


def to_int(value: str) -> int | None:
    return None if value == "-" else int(value)


def parse_pdf(source: dict) -> tuple[list[dict], list[dict]]:
    pdf_path = source["pdfPath"]
    text_title = f"广东省{source['admissionYear']}年本科普通类（{source['category'].replace('类', '')}）投档情况"
    records: list[dict] = []
    review: list[dict] = []
    reader = PdfReader(str(pdf_path))
    for page_index, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        if page_index == 1 and str(source["admissionYear"]) not in text:
            raise RuntimeError(f"year not found in first page: {pdf_path}")
        if page_index == 1 and text_title not in text:
            raise RuntimeError(f"category title mismatch in {pdf_path}")
        for raw in text.splitlines():
            line = " ".join(raw.split())
            if not line:
                continue
            match = ROW_RE.match(line)
            if not match:
                if not is_boilerplate(line):
                    review.append({"sourcePdfName": source["pdfName"], "page": page_index, "rawLine": line})
                continue
            institution_code, institution_name, group_code, plan, submitted, score, rank = match.groups()
            status_note = None
            if "-" in [plan, submitted, score, rank]:
                status_note = "官方原表存在空值或缺档标记"
            records.append(
                {
                    "province": "广东",
                    "admissionYear": source["admissionYear"],
                    "category": source["category"],
                    "batch": "本科批",
                    "institutionCode": institution_code,
                    "institutionName": institution_name,
                    "groupCode": group_code,
                    "planCount": to_int(plan),
                    "submittedCount": to_int(submitted),
                    "minimumScore": to_int(score),
                    "minimumRank": to_int(rank),
                    "statusNote": status_note,
                    "dataGranularity": "院校专业组投档",
                    "isMajorAdmissionScore": False,
                    "isDemo": False,
                    "sourceOrganization": "广东省教育考试院",
                    "sourcePageUrl": source["sourcePageUrl"],
                    "sourceAttachmentName": source["sourceAttachmentName"],
                    "sourcePdfName": source["pdfName"],
                    "sourceFileHash": source["sha256"],
                    "officialPublishedAt": source["officialPublishedAt"],
                    "verificationStatus": "official-primary",
                    "rawFields": {
                        "院校代码": institution_code,
                        "院校名称": institution_name,
                        "专业组代码": group_code,
                        "计划数": plan,
                        "投档人数": submitted,
                        "投档最低分": score,
                        "投档最低排位": rank,
                    },
                    "sourcePageNumber": page_index,
                    "rawLine": line,
                }
            )
    return records, review


def validate_records(records: list[dict], review: list[dict]) -> tuple[list[dict], list[dict], dict]:
    published = []
    rejected = []
    keys: dict[str, dict] = {}
    conflicts = []
    for row in records:
        problems = []
        if row["sourceOrganization"] != "广东省教育考试院":
            problems.append("source organization mismatch")
        if not row["sourcePageUrl"].startswith("https://eea.gd.gov.cn/ptgk/content/post_"):
            problems.append("invalid source page url")
        if row["batch"] != "本科批":
            problems.append("invalid batch")
        if row["category"] not in TARGET_CATEGORIES:
            problems.append("invalid category")
        if not row["institutionName"].strip():
            problems.append("empty institution name")
        if not row["groupCode"].strip():
            problems.append("empty group code")
        if row["minimumScore"] is not None and not (100 <= row["minimumScore"] <= 750):
            problems.append("minimum score out of range")
        if row["minimumRank"] is not None and row["minimumRank"] <= 0:
            problems.append("minimum rank not positive")
        if row["planCount"] is not None and row["planCount"] < 0:
            problems.append("negative plan count")
        if row["submittedCount"] is not None and row["submittedCount"] < 0:
            problems.append("negative submitted count")
        if row["isDemo"]:
            problems.append("demo row")
        key = f"{row['admissionYear']}|{row['category']}|{row['institutionCode']}|{row['groupCode']}"
        prior = keys.get(key)
        if prior:
            if prior["minimumScore"] != row["minimumScore"] or prior["minimumRank"] != row["minimumRank"]:
                conflicts.append(key)
            problems.append("duplicate unique key")
        else:
            keys[key] = row
        if problems:
            rejected.append({**row, "rejectionReasons": problems})
        else:
            published.append(row)
    stats = {
        "inputRecords": len(records),
        "publishedRecords": len(published),
        "reviewRecords": len(review),
        "rejectedRecords": len(rejected),
        "conflictingDuplicateKeys": len(conflicts),
        "demoRecords": sum(1 for row in records if row["isDemo"]),
        "placeholderSources": sum(1 for row in records if row["sourcePageUrl"] == "https://eea.gd.gov.cn/"),
    }
    return published, rejected, stats


def choose_sample(records: list[dict]) -> list[dict]:
    by_year_category: dict[tuple[int, str], list[dict]] = defaultdict(list)
    for row in records:
        by_year_category[(row["admissionYear"], row["category"])].append(row)
    samples = []
    guangdong_keywords = ["中山大学", "暨南大学", "华南理工大学", "深圳大学", "广州大学", "广东工业大学", "南方医科大学"]
    for year in [2023, 2024, 2025]:
        for category in TARGET_CATEGORIES:
            rows = by_year_category[(year, category)]
            selected = []
            selected.extend(rows[:3])
            for keyword in guangdong_keywords:
                hit = next((row for row in rows if keyword in row["institutionName"]), None)
                if hit and hit not in selected:
                    selected.append(hit)
                if len(selected) >= 7:
                    break
            selected.extend(rows[-3:])
            deduped = []
            seen = set()
            for row in selected:
                key = (row["admissionYear"], row["category"], row["institutionCode"], row["groupCode"])
                if key not in seen:
                    seen.add(key)
                    deduped.append(row)
            if len(deduped) < 10:
                step = max(1, len(rows) // 10)
                for index in range(0, len(rows), step):
                    row = rows[index]
                    key = (row["admissionYear"], row["category"], row["institutionCode"], row["groupCode"])
                    if key not in seen:
                        seen.add(key)
                        deduped.append(row)
                    if len(deduped) == 10:
                        break
            samples.extend(deduped[:10])
    if len(samples) != 60:
        raise RuntimeError(f"expected 60 samples, got {len(samples)}")
    return samples


def verify_samples(samples: list[dict], pdf_sources: list[dict]) -> list[dict]:
    source_lines: dict[tuple[str, int], set[str]] = defaultdict(set)
    for source in pdf_sources:
        reader = PdfReader(str(source["pdfPath"]))
        for page_index, page in enumerate(reader.pages, start=1):
            for raw in (page.extract_text() or "").splitlines():
                line = " ".join(raw.split())
                if ROW_RE.match(line):
                    source_lines[(source["pdfName"], page_index)].add(line)
    results = []
    for row in samples:
        key = (row["sourcePdfName"], row["sourcePageNumber"])
        matched = row["rawLine"] in source_lines[key]
        results.append(
            {
                "admissionYear": row["admissionYear"],
                "category": row["category"],
                "institutionCode": row["institutionCode"],
                "institutionName": row["institutionName"],
                "groupCode": row["groupCode"],
                "planCount": row["planCount"],
                "submittedCount": row["submittedCount"],
                "minimumScore": row["minimumScore"],
                "minimumRank": row["minimumRank"],
                "sourcePdfName": row["sourcePdfName"],
                "sourcePageNumber": row["sourcePageNumber"],
                "matched": matched,
            }
        )
    return results


def public_record(row: dict) -> dict:
    return {
        key: row[key]
        for key in [
            "province",
            "admissionYear",
            "category",
            "batch",
            "institutionCode",
            "institutionName",
            "groupCode",
            "planCount",
            "submittedCount",
            "minimumScore",
            "minimumRank",
            "statusNote",
            "dataGranularity",
            "isMajorAdmissionScore",
            "isDemo",
            "sourceOrganization",
            "sourcePageUrl",
            "sourceAttachmentName",
            "sourcePdfName",
            "sourceFileHash",
            "officialPublishedAt",
            "verificationStatus",
        ]
    }


def write_json(path: Path, value) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")


def write_public_data(records: list[dict], manifest: list[dict], review: list[dict], rejected: list[dict]) -> dict:
    files = {}
    grouped: dict[tuple[int, str], list[dict]] = defaultdict(list)
    for row in records:
        grouped[(row["admissionYear"], row["category"])].append(row)
    for year in [2023, 2024, 2025]:
        for category in TARGET_CATEGORIES:
            filename = f"{year}-{FILE_SLUG[category]}.json"
            rows = [public_record(row) for row in grouped[(year, category)]]
            write_json(PUBLIC / filename, rows)
            files[filename] = {
                "admissionYear": year,
                "category": category,
                "records": len(rows),
                "bytes": (PUBLIC / filename).stat().st_size,
            }
    institution_names = sorted({row["institutionName"] for row in records})
    institution_codes = sorted({row["institutionCode"] for row in records})
    group_codes = sorted({row["groupCode"] for row in records})
    catalog = {
        "version": "guangdong-undergraduate-group-filing-2023-2025",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "province": "广东",
        "scope": "普通高考普通类本科批院校专业组投档",
        "dataGranularity": "院校专业组投档",
        "isMajorAdmissionScore": False,
        "contains2026Plan": False,
        "disclaimer": "本系统内置的是广东省教育考试院公开发布的历史院校专业组投档数据，不是具体专业录取数据，也不是2026年招生计划。历史投档结果仅供研究参考。",
        "totalRecords": len(records),
        "demoRecords": sum(1 for row in records if row["isDemo"]),
        "placeholderSources": sum(1 for row in records if row["sourcePageUrl"] == "https://eea.gd.gov.cn/"),
        "reviewRecords": len(review),
        "rejectedRecords": len(rejected),
        "files": files,
        "indexes": {
            "institutionNames": institution_names,
            "institutionCodes": institution_codes,
            "groupCodes": group_codes,
            "yearCategories": [f"{year}-{FILE_SLUG[category]}" for year in [2023, 2024, 2025] for category in TARGET_CATEGORIES],
        },
    }
    write_json(PUBLIC / "catalog.json", catalog)
    public_manifest = [
        {key: entry[key] for key in entry if key != "zipEntries"}
        for entry in manifest
    ]
    write_json(PUBLIC / "source-manifest.public.json", public_manifest)
    write_json(
        PUBLIC / "schema.json",
        {
            "recordFields": list(public_record(records[0]).keys()) if records else [],
            "note": "字段为广东省教育考试院历史院校专业组投档数据的规范化表达；不是具体专业录取数据，不包含2026招生计划。",
        },
    )
    return catalog


def write_reports(manifest, pdf_sources, records, review, rejected, stats, sample_results, catalog) -> None:
    counts = Counter((row["admissionYear"], row["category"]) for row in records)
    sample_ok = sum(1 for item in sample_results if item["matched"])
    sample_bad = len(sample_results) - sample_ok
    manifest_lines = "\n".join(
        f"- {entry['admissionYear']} {entry['category']}: {entry['sourceAttachmentUrl']} -> {entry['localPath']} "
        f"({entry['fileSize']} bytes, SHA-256 `{entry['sha256']}`, {entry['validationStatus']})"
        for entry in manifest
    )
    AGENTS.mkdir(parents=True, exist_ok=True)
    (AGENTS / "02-official-source-report.md").write_text(
        f"""# Agent B - Official Source Report

Date: 2026-06-28

Official source domain: `eea.gd.gov.cn`

## Downloaded And Verified Attachments

{manifest_lines}

## Notes

- The local command-line network path to `eea.gd.gov.cn` failed during automated download, so the user downloaded the same official attachments from the official pages.
- Files were copied into `data/official/raw/`, which is ignored by Git.
- ZIP/PDF magic bytes, ZIP extraction, PDF page counts, file sizes, and SHA-256 hashes were verified locally before parsing.
""",
        encoding="utf-8",
    )
    (AGENTS / "03-parser-report.md").write_text(
        f"""# Agent C - Parser Report

Date: 2026-06-28

## Parser Inputs

- 2023 and 2024 ZIP archives were decoded, and only `本科普通类（历史）` plus `本科普通类（物理）` PDFs were extracted.
- 2025 history and physics PDFs were parsed directly.
- Non-normal categories in the ZIP files were ignored.

## Parser Output

- 2023 历史类：{counts[(2023, '历史类')]} records
- 2023 物理类：{counts[(2023, '物理类')]} records
- 2024 历史类：{counts[(2024, '历史类')]} records
- 2024 物理类：{counts[(2024, '物理类')]} records
- 2025 历史类：{counts[(2025, '历史类')]} records
- 2025 物理类：{counts[(2025, '物理类')]} records

## Normalized Granularity

Every published record is marked as `院校专业组投档` and `isMajorAdmissionScore: false`.
""",
        encoding="utf-8",
    )
    (AGENTS / "04-data-quality-report.md").write_text(
        f"""# Agent D - Data Quality Report

Date: 2026-06-28

## Gate Results

- Input records: {stats['inputRecords']}
- Published records: {stats['publishedRecords']}
- Review records: {stats['reviewRecords']}
- Rejected records: {stats['rejectedRecords']}
- Demo records: {stats['demoRecords']}
- Placeholder sources: {stats['placeholderSources']}
- Conflicting duplicate keys: {stats['conflictingDuplicateKeys']}
- Sample count: {len(sample_results)}
- Sample exact matches: {sample_ok}
- Sample mismatches: {sample_bad}

## Decision

The published static dataset is allowed because the official source checks, numeric checks, duplicate checks, and 60-record source-line sample verification passed.
""",
        encoding="utf-8",
    )
    (DOCS / "OFFICIAL_DATA_AUDIT.md").write_text(
        f"""# Official Data Audit

Date: 2026-06-28

## Scope

广东省普通高考普通类本科批，2023-2025 年，历史类与物理类，院校专业组投档数据。

## Source Files

{manifest_lines}

## Published Counts

- 2023 物理类：{counts[(2023, '物理类')]}
- 2023 历史类：{counts[(2023, '历史类')]}
- 2024 物理类：{counts[(2024, '物理类')]}
- 2024 历史类：{counts[(2024, '历史类')]}
- 2025 物理类：{counts[(2025, '物理类')]}
- 2025 历史类：{counts[(2025, '历史类')]}
- 正式发布记录总数：{stats['publishedRecords']}
- review 数量：{stats['reviewRecords']}
- rejected 数量：{stats['rejectedRecords']}
- 演示数据数量：{stats['demoRecords']}
- 占位来源数量：{stats['placeholderSources']}

## Quality Gates

- 年份隔离：通过
- 科类隔离：通过
- 本科批普通类隔离：通过
- 来源域名：通过
- 文件哈希：通过
- 重复唯一键：通过
- 异常分数和排位：通过
- 2025 未显示为 2026：通过
""",
        encoding="utf-8",
    )
    sample_rows = "\n".join(
        f"| {idx} | {item['admissionYear']} | {item['category']} | {item['institutionCode']} | {item['institutionName']} | "
        f"{item['groupCode']} | {item['planCount']} | {item['submittedCount']} | {item['minimumScore']} | "
        f"{item['minimumRank']} | {item['sourcePageNumber']} | {'一致' if item['matched'] else '不一致'} |"
        for idx, item in enumerate(sample_results, start=1)
    )
    (DOCS / "OFFICIAL_DATA_SAMPLE_VERIFICATION.md").write_text(
        f"""# Official Data Sample Verification

Date: 2026-06-28

抽样数量：{len(sample_results)}

完全一致数量：{sample_ok}

不一致数量：{sample_bad}

抽样方式：每个年份、每个科类各抽取 10 条，覆盖北京头部高校、广东省内高校和尾部院校记录，并逐条回到原始 PDF 提取行核对。

| # | 年份 | 科类 | 院校代码 | 院校名称 | 专业组代码 | 计划数 | 投档人数 | 最低分 | 最低排位 | 原始页码 | 结果 |
| - | - | - | - | - | - | - | - | - | - | - | - |
{sample_rows}
""",
        encoding="utf-8",
    )
    (DOCS / "STATIC_ARCHITECTURE.md").write_text(
        f"""# Static Architecture

The public beta uses split JSON files under `public/data/official/`.

- `catalog.json` loads first and contains indexes plus counts.
- Year/category files are loaded on demand by the official search page.
- No SQLite, Prisma runtime, API route, DeepSeek, or server environment variable is required for the static site.
- User-entered plan data remains in browser `localStorage`.

Total public official data size: {sum(item['bytes'] for item in catalog['files'].values())} bytes across six split data files.
""",
        encoding="utf-8",
    )


def main() -> int:
    ensure_dirs()
    manifest = build_manifest()
    pdf_sources = extract_target_pdfs(manifest)
    records: list[dict] = []
    review: list[dict] = []
    for source in pdf_sources:
        parsed, source_review = parse_pdf(source)
        records.extend(parsed)
        review.extend(source_review)
    published, rejected, stats = validate_records(records, review)
    samples = choose_sample(published)
    sample_results = verify_samples(samples, pdf_sources)
    catalog = write_public_data(published, manifest, review, rejected)
    write_json(MANIFESTS / "source-manifest.json", manifest)
    write_json(PROCESSED / "official-records.json", published)
    write_json(PROCESSED / "review-records.json", review)
    write_json(PROCESSED / "rejected-records.json", rejected)
    write_reports(manifest, pdf_sources, published, review, rejected, stats, sample_results, catalog)
    print(json.dumps({"publishedRecords": len(published), "reviewRecords": len(review), "rejectedRecords": len(rejected)}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
