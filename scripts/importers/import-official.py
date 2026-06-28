"""
Import official data into the production database (prisma/official.db).
Reads official files from data/official/raw/ and runs year-specific parsers.

Directory convention:
  2023/archive/  → 4221648.zip (single ZIP, parser handles both categories)
  2024/archive/  → 4458330.zip (single ZIP, parser handles both categories)
  2025/physics/  → 4746786.pdf  (independent PDF)
  2025/history/  → 4746781.pdf  (independent PDF)

Usage:
  python scripts/importers/import-official.py [--dry-run]

This script:
  1. Reads each year's raw directory according to the above convention
  2. Runs the corresponding parser
  3. Validates year/category/batch consistency
  4. Inserts records into prisma/official.db

Environment:
  DATABASE_URL=file:official.db
  ALLOW_DEMO_DATA=false
"""
import json, os, sqlite3, sys, subprocess, time
from datetime import datetime
from pathlib import Path

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
RAW_DIR = os.path.join(BASE_DIR, "data", "official", "raw")
DB_PATH = os.path.join(BASE_DIR, "prisma", "official.db")
IMPORTERS_DIR = os.path.join(BASE_DIR, "scripts", "importers")

PARSER_SCRIPTS = {
    2023: "guangdong-2023.py",
    2024: "guangdong-2024.py",
    2025: "guangdong-2025.py",
}

# For 2023/2024: the ZIP covers both categories, parser decides internally.
# For 2025: two independent PDFs, one per category.
SOURCE_STRUCTURE = {
    2023: {
        "type": "zip",
        "files": [os.path.join("archive", "4221648.zip")],
        "categories": ["物理类", "历史类"],
    },
    2024: {
        "type": "zip",
        "files": [os.path.join("archive", "4458330.zip")],
        "categories": ["物理类", "历史类"],
    },
    2025: {
        "type": "pdfs",
        "files": {
            "物理类": os.path.join("physics", "4746786.pdf"),
            "历史类": os.path.join("history", "4746781.pdf"),
        },
        "categories": ["物理类", "历史类"],
    },
}


def log(msg: str):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")


def run_parser_zip(year: int, file_path: str) -> dict:
    """Run the parser on a ZIP file (2023 or 2024). The parser determines
    categories internally from PDF content — we do NOT pass category."""
    script = os.path.join(IMPORTERS_DIR, PARSER_SCRIPTS[year])
    cmd = [sys.executable, script, file_path]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    if result.returncode != 0:
        return {"errors": [f"Parser exit {result.returncode}: {result.stderr}"], "records": []}
    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError:
        return {"errors": [f"Parser output not valid JSON: {result.stdout[:200]}"], "records": []}


def run_parser_pdf(year: int, file_path: str, category: str) -> dict:
    """Run the parser on a single PDF file (2025 style). Category is passed
    as a hint but the parser will verify against PDF content."""
    script = os.path.join(IMPORTERS_DIR, PARSER_SCRIPTS[year])
    cmd = [sys.executable, script, file_path, category]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    if result.returncode != 0:
        return {"errors": [f"Parser exit {result.returncode}: {result.stderr}"], "records": []}
    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError:
        return {"errors": [f"Parser output not valid JSON: {result.stdout[:200]}"], "records": []}


def validate_cross_year(record: dict) -> list[str]:
    """Validate year/category/batch consistency."""
    issues = []
    if record.get("admissionYear") != record.get("_parserYear"):
        issues.append(f"年份不一致: record={record.get('admissionYear')} parser={record.get('_parserYear')}")
    cat = record.get("category")
    if cat not in ("物理类", "历史类"):
        issues.append(f"科类异常: {cat}")
    if record.get("batch") != "本科批":
        issues.append(f"批次异常: {record.get('batch')}")
    if record.get("province") != "广东":
        issues.append(f"省份异常: {record.get('province')}")
    if record.get("dataGranularity") != "institution-group投档":
        issues.append(f"数据粒度异常: {record.get('dataGranularity')}")
    if record.get("isMajorAdmissionScore") != False:
        issues.append("错误标注为专业录取数据")
    if record.get("isDemo") != False:
        issues.append("错误标注为演示数据")
    return issues


def find_files_from_structure(year: int) -> list[tuple]:
    """Find raw files according to the source structure for a given year.
    Returns list of (file_path, category_or_None) tuples.
    - For ZIP years (2023,2024): one entry with category=None (parser handles it)
    - For PDF years (2025): two entries, one per category
    """
    structure = SOURCE_STRUCTURE.get(year)
    if not structure:
        return []

    found = []

    if structure["type"] == "zip":
        for rel_path in structure["files"]:
            fp = os.path.join(RAW_DIR, str(year), rel_path)
            if os.path.isfile(fp):
                found.append((fp, None))  # No category for ZIP — parser determines it
            else:
                log(f"  WARNING: Expected ZIP not found: {fp}")

    elif structure["type"] == "pdfs":
        for cat, rel_path in structure["files"].items():
            fp = os.path.join(RAW_DIR, str(year), rel_path)
            if os.path.isfile(fp):
                found.append((fp, cat))
            else:
                log(f"  WARNING: Expected PDF not found: {fp}")

    return found


def insert_records(conn, records: list[dict], dry_run: bool = False) -> tuple[int, int]:
    """Insert records into official.db."""
    if not records:
        return 0, 0

    cursor = conn.cursor()
    inserted = 0
    rejected = 0

    sql = """
    INSERT INTO AdmissionRecord (
        admissionYear, province, category, batch,
        institutionCode, institutionName, groupCode, groupName,
        majorCode, majorName, subjectRequirements,
        planCount, minimumScore, minimumRank,
        sourceLevel, sourceName, sourceUrl,
        officialTitle, officialPublishedAt,
        verificationStatus, dataType, notes, isDemo
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """

    for rec in records:
        status = rec.get("verificationStatus", "")
        if status in ("review-required", "rejected"):
            rejected += 1
            continue

        if dry_run:
            inserted += 1
            continue

        notes = rec.get("parsingNotes", "")
        if rec.get("statusNote"):
            notes = f"{rec['statusNote']}; {notes}"
        notes = f"{notes}; SHA256:{rec.get('sourceFileHash','?')[:16]}"

        try:
            cursor.execute(sql, (
                rec["admissionYear"],
                rec["province"],
                rec["category"],
                rec["batch"],
                rec.get("institutionCode") or "",
                rec["institutionName"] or "",
                rec["groupCode"] or "",
                rec.get("groupDisplayName") or "",
                "",
                "",
                json.dumps([]),
                rec.get("planCount"),
                rec.get("minimumScore"),
                rec.get("minimumRank"),
                rec["sourceLevel"],
                rec["sourceOrganization"],
                rec.get("sourcePageUrl", ""),
                rec.get("sourcePageTitle", ""),
                rec.get("officialPublishedAt", ""),
                rec.get("verificationStatus", "official-primary"),
                "group",
                notes,
                0,
            ))
            inserted += 1
        except Exception as e:
            log(f"  INSERT ERROR: {e} for {rec.get('institutionName')} {rec.get('groupCode')}")
            rejected += 1

    if not dry_run:
        conn.commit()
    return inserted, rejected


def main():
    dry_run = "--dry-run" in sys.argv

    if not os.path.exists(DB_PATH):
        log(f"ERROR: Database not found at {DB_PATH}")
        log("Run: DATABASE_URL=file:official.db npx prisma db push")
        sys.exit(1)

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    cur = conn.execute("SELECT COUNT(*) as cnt FROM AdmissionRecord")
    existing = cur.fetchone()["cnt"]
    log(f"Current records in official.db: {existing}")

    if existing > 0:
        log("WARNING: Database already has records. Import will append.")

    total_inserted = 0
    total_rejected = 0
    yearly_stats = {}

    for year in sorted(SOURCE_STRUCTURE.keys()):
        yearly_stats[year] = {
            "物理类": 0, "历史类": 0,
            "review_required": 0, "rejected": 0,
            "files_processed": [],
        }

        files = find_files_from_structure(year)

        if not files:
            log(f"{year}年: 无文件可处理（请确认文件已放入对应目录）")
            continue

        for fp, expected_cat in files:
            log(f"Processing: {fp}")

            if SOURCE_STRUCTURE[year]["type"] == "zip":
                result = run_parser_zip(year, fp)
            else:
                result = run_parser_pdf(year, fp, expected_cat)

            if result.get("errors") and not result.get("records"):
                log(f"  ERROR: {result['errors']}")
                continue

            records = result.get("records", [])

            # Log category determination
            cat_det = result.get("categoryDetermination", [])
            for cd in cat_det:
                log(f"  科类判定: {cd.get('file','?')} → {cd.get('category','?')} ({cd.get('method','?')})")

            # Annotate parser year for cross-validation
            for r in records:
                r["_parserYear"] = year

            # Count statuses
            review = [r for r in records if r.get("verificationStatus") == "review-required"]
            passed = [r for r in records if r.get("verificationStatus") == "official-primary"]

            log(f"  {len(records)} records ({len(passed)} passed, {len(review)} review-required)")

            # Cross-validate
            cross_issues = 0
            for r in passed:
                issues = validate_cross_year(r)
                if issues:
                    r["verificationStatus"] = "review-required"
                    r["parsingNotes"] = (r.get("parsingNotes", "") + f"; 交叉校验异常: {'; '.join(issues)}")
                    cross_issues += 1

            if cross_issues:
                log(f"  Cross-validation flag: {cross_issues} records -> review-required")

            # Insert
            ins, rej = insert_records(conn, records, dry_run)
            total_inserted += ins
            total_rejected += rej

            # Update stats by category within records
            for r in records:
                cat = r.get("category", "")
                if cat in ("物理类", "历史类"):
                    if r.get("verificationStatus") == "official-primary" and r.get("_inserted", True):
                        pass  # Will be counted from insert result

            # Count by category from the parser stats
            stats = result.get("stats", {})
            if "physicsCount" in stats and "historyCount" in stats:
                # ZIP result
                yearly_stats[year]["物理类"] += stats.get("physicsCount", 0)
                yearly_stats[year]["历史类"] += stats.get("historyCount", 0)
            elif expected_cat:
                # PDF result
                yearly_stats[year][expected_cat] += ins

            yearly_stats[year]["review_required"] += len(review) + cross_issues
            yearly_stats[year]["rejected"] += rej
            yearly_stats[year]["files_processed"].append(os.path.basename(fp))

    # Verify final state
    if not dry_run:
        cur = conn.execute(
            "SELECT admissionYear, category, COUNT(*) as cnt FROM AdmissionRecord "
            "GROUP BY admissionYear, category ORDER BY 1, 2"
        )
        log("\n=== FINAL STATE ===")
        for row in cur.fetchall():
            log(f"  {row['admissionYear']}年 {row['category']}: {row['cnt']}条")

        cur = conn.execute("SELECT COUNT(*) as cnt FROM AdmissionRecord WHERE notes LIKE '%演示%' OR isDemo=1")
        demo_count = cur.fetchone()["cnt"]
        log(f"  演示数据: {demo_count}条 (必须为0)")

        cur = conn.execute(
            "SELECT COUNT(*) as cnt FROM AdmissionRecord "
            "WHERE sourceUrl='https://eea.gd.gov.cn/gkgs/' OR sourceUrl LIKE '%placeholder%'"
        )
        placeholder = cur.fetchone()["cnt"]
        log(f"  占位URL: {placeholder}条 (必须为0)")

    conn.close()

    # Summary
    log("\n=== SUMMARY ===")
    for year in sorted(yearly_stats.keys()):
        s = yearly_stats[year]
        total_y = s["物理类"] + s["历史类"]
        log(f"{year}年: {total_y}条 (物理:{s['物理类']} 历史:{s['历史类']} review:{s['review_required']} rejected:{s['rejected']})")
        if s["files_processed"]:
            log(f"  文件: {', '.join(s['files_processed'])}")

    log(f"\n总计导入: {total_inserted}")
    log(f"总计拒绝: {total_rejected}")

    if dry_run:
        log("DRY RUN - no data written")

    if total_inserted == 0 and not dry_run:
        log("\n⚠ 正式数据库仍为空。请将官方附件放入以下目录后重新运行:")
        for year in sorted(SOURCE_STRUCTURE.keys()):
            structure = SOURCE_STRUCTURE[year]
            if structure["type"] == "zip":
                for rel_path in structure["files"]:
                    d = os.path.join(RAW_DIR, str(year), rel_path)
                    log(f"  {d}")
            elif structure["type"] == "pdfs":
                for cat, rel_path in structure["files"].items():
                    d = os.path.join(RAW_DIR, str(year), rel_path)
                    log(f"  {d}  ({cat})")


if __name__ == "__main__":
    main()
