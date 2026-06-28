"""
Official Data Audit Script
Reads prisma/official.db and generates a comprehensive audit report.

Outputs:
  1. Terminal summary
  2. docs/official-data-audit-report.md
  3. artifacts/official-data-audit-report.json
"""
import json, os, sqlite3, sys
from collections import Counter
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "prisma", "official.db")
DOCS_DIR = os.path.join(BASE_DIR, "docs")
ARTIFACTS_DIR = os.path.join(BASE_DIR, "artifacts")


def audit() -> dict:
    if not os.path.exists(DB_PATH):
        return {"error": "official.db 不存在", "path": DB_PATH}

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    r = {"auditTime": datetime.now().isoformat(), "dbPath": DB_PATH, "pass": True, "failures": []}

    # 1. Total count
    cur.execute("SELECT COUNT(*) as cnt FROM AdmissionRecord")
    r["totalRecords"] = cur.fetchone()["cnt"]

    # 2. By year and category
    cur.execute("SELECT admissionYear, category, COUNT(*) as cnt FROM AdmissionRecord GROUP BY admissionYear, category ORDER BY 1, 2")
    year_cat = {}
    for row in cur.fetchall():
        y = str(row["admissionYear"])
        c = row["category"]
        if y not in year_cat: year_cat[y] = {}
        year_cat[y][c] = row["cnt"]
    r["byYearCategory"] = year_cat
    r["yearly"] = {
        str(y): {
            "物理类": year_cat.get(str(y), {}).get("物理类", 0),
            "历史类": year_cat.get(str(y), {}).get("历史类", 0),
        }
        for y in [2023, 2024, 2025]
    }

    # 3. Institution count
    cur.execute("SELECT COUNT(DISTINCT institutionName) as cnt FROM AdmissionRecord")
    r["institutionCount"] = cur.fetchone()["cnt"]

    # 4. Group count
    cur.execute("SELECT COUNT(DISTINCT institutionCode || '-' || groupCode) as cnt FROM AdmissionRecord")
    r["groupCount"] = cur.fetchone()["cnt"]

    # 5. Fields with data
    cur.execute("SELECT COUNT(*) as cnt FROM AdmissionRecord WHERE minimumScore IS NOT NULL AND minimumScore > 0")
    r["recordsWithScore"] = cur.fetchone()["cnt"]
    cur.execute("SELECT COUNT(*) as cnt FROM AdmissionRecord WHERE minimumRank IS NOT NULL AND minimumRank > 0")
    r["recordsWithRank"] = cur.fetchone()["cnt"]
    cur.execute("SELECT COUNT(*) as cnt FROM AdmissionRecord WHERE planCount IS NOT NULL AND planCount >= 0")
    r["recordsWithPlanCount"] = cur.fetchone()["cnt"]

    # 6. Verification statuses
    cur.execute("SELECT verificationStatus, COUNT(*) as cnt FROM AdmissionRecord GROUP BY verificationStatus")
    r["verificationStatus"] = {row["verificationStatus"] or "unknown": row["cnt"] for row in cur.fetchall()}

    # 7. Source audit
    cur.execute("SELECT COUNT(*) as cnt FROM AdmissionRecord WHERE sourceLevel = 'A'")
    r["sourceLevelACount"] = cur.fetchone()["cnt"]

    cur.execute("SELECT sourceName, COUNT(*) as cnt FROM AdmissionRecord GROUP BY sourceName")
    r["sources"] = {row["sourceName"]: row["cnt"] for row in cur.fetchall()}

    # 8. DEMO DATA CHECK (CRITICAL)
    cur.execute("SELECT COUNT(*) as cnt FROM AdmissionRecord WHERE notes LIKE '%演示%' OR notes LIKE '%demo%' OR isDemo = 1")
    demo_count = cur.fetchone()["cnt"]
    r["demoDataCount"] = demo_count
    if demo_count > 0:
        r["pass"] = False
        r["failures"].append(f"正式数据库含 {demo_count} 条演示数据（必须为0）")
    else:
        r["failures"].append(None)  # Placeholder

    # 9. PLACEHOLDER URL CHECK (CRITICAL)
    cur.execute("""SELECT COUNT(*) as cnt FROM AdmissionRecord
        WHERE sourceUrl = 'https://eea.gd.gov.cn/gkgs/'
        OR sourceUrl LIKE '%placeholder%'
        OR sourceUrl = ''
        OR sourceUrl IS NULL""")
    placeholder_count = cur.fetchone()["cnt"]
    r["placeholderUrlCount"] = placeholder_count
    if placeholder_count > 0 and r["totalRecords"] > 0:
        r["pass"] = False
        r["failures"].append(f"含 {placeholder_count} 条占位/空URL（必须为0）")

    # 10. REVIEW-REQUIRED IN RECOMMENDATION POOL
    cur.execute("SELECT COUNT(*) as cnt FROM AdmissionRecord WHERE verificationStatus IN ('review-required', 'rejected')")
    review_count = cur.fetchone()["cnt"]
    r["reviewRequiredCount"] = review_count

    # 11. YEAR CONFLICTS
    cur.execute("""SELECT institutionCode, institutionName, groupCode, GROUP_CONCAT(DISTINCT admissionYear) as years
        FROM AdmissionRecord GROUP BY institutionCode, groupCode
        HAVING COUNT(DISTINCT admissionYear) > 1""")
    r["yearConflictsInAdmissionYear"] = 0  # Having multiple years is expected (history), check for actual conflicts
    # Check: records where sourcePageTitle year != admissionYear
    cur.execute("""SELECT COUNT(*) as cnt FROM AdmissionRecord
        WHERE CAST(admissionYear AS TEXT) != SUBSTR(officialTitle, 3, 4)""")
    r["yearMismatchCount"] = cur.fetchone()["cnt"]

    # 12. CATEGORY CONFLICTS
    cur.execute("""SELECT institutionCode, groupCode, GROUP_CONCAT(DISTINCT category) as cats
        FROM AdmissionRecord GROUP BY institutionCode, groupCode, admissionYear
        HAVING COUNT(DISTINCT category) > 1""")
    cat_conflicts = cur.fetchall()
    r["categoryConflicts"] = len(cat_conflicts)

    # 13. DUPLICATES
    cur.execute("""SELECT institutionCode, groupCode, admissionYear, category, COUNT(*) as cnt
        FROM AdmissionRecord GROUP BY institutionCode, groupCode, admissionYear, category
        HAVING cnt > 1""")
    duplicates = cur.fetchall()
    r["duplicateRecords"] = len(duplicates)

    # 14. ANOMALIES
    cur.execute("SELECT COUNT(*) as cnt FROM AdmissionRecord WHERE minimumScore < 0 OR minimumScore > 750")
    r["scoreAnomalies"] = cur.fetchone()["cnt"]
    cur.execute("SELECT COUNT(*) as cnt FROM AdmissionRecord WHERE minimumRank IS NOT NULL AND minimumRank <= 0")
    r["rankAnomalies"] = cur.fetchone()["cnt"]
    cur.execute("SELECT COUNT(*) as cnt FROM AdmissionRecord WHERE institutionName IS NULL OR institutionName = ''")
    r["emptyNameCount"] = cur.fetchone()["cnt"]
    cur.execute("SELECT COUNT(*) as cnt FROM AdmissionRecord WHERE groupCode IS NULL OR groupCode = ''")
    r["emptyGroupCount"] = cur.fetchone()["cnt"]
    cur.execute("SELECT COUNT(*) as cnt FROM AdmissionRecord WHERE dataType != 'group'")
    r["wrongDataType"] = cur.fetchone()["cnt"]

    # 15. PROVINCE CHECK
    cur.execute("SELECT COUNT(*) as cnt FROM AdmissionRecord WHERE province != '广东'")
    r["nonGuangdongCount"] = cur.fetchone()["cnt"]

    # 16. BATCH CHECK
    cur.execute("SELECT COUNT(*) as cnt FROM AdmissionRecord WHERE batch != '本科批' AND batch IS NOT NULL AND batch != ''")
    r["nonBenkeCount"] = cur.fetchone()["cnt"]

    # 17. CLEAN failures (remove None placeholder)
    r["failures"] = [f for f in r.get("failures", []) if f is not None]

    # Final pass/fail on hard requirements
    hard_fails = [
        r["demoDataCount"] > 0,
        (r["placeholderUrlCount"] > 0 and r["totalRecords"] > 0),
        (r["totalRecords"] > 0 and r.get("reviewRequiredCount", 0) > r["totalRecords"] * 0.1) and r["totalRecords"] > 100,
    ]
    if any(hard_fails):
        r["pass"] = False

    conn.close()
    return r


def generate_report(audit_data: dict) -> str:
    """Generate markdown report."""
    a = audit_data

    if "error" in a:
        return f"""# 粤志通 正式数据审计报告

**审计时间**: {datetime.now().isoformat()}
**状态**: ❌ 失败

## 错误
{a['error']}

正式数据库 {a['path']} 不存在。请先运行导入脚本。
"""

    status = "✅ 通过" if a["pass"] else "❌ 未通过（存在硬性违规）"
    demo_ok = "✅" if a["demoDataCount"] == 0 else "❌"
    url_ok = "✅" if a["placeholderUrlCount"] == 0 else "❌"

    report = f"""# 粤志通 正式数据审计报告

**审计时间**: {a['auditTime']}
**数据库**: {a['dbPath']}
**审计状态**: {status}

## 一、数据总量

| 指标 | 数值 |
|------|------|
| 总记录数 | {a['totalRecords']} |
| 院校数量 | {a.get('institutionCount', 0)} |
| 院校专业组数量 | {a.get('groupCount', 0)} |
| 含最低分 | {a.get('recordsWithScore', 0)} |
| 含最低排位 | {a.get('recordsWithRank', 0)} |
| 含计划数 | {a.get('recordsWithPlanCount', 0)} |

## 二、年份/科类分布

| 年份 | 物理类 | 历史类 | 小计 |
|------|--------|--------|------|
"""
    for y in ["2023", "2024", "2025"]:
        yd = a.get("yearly", {}).get(y, {})
        report += f"| {y} | {yd.get('物理类', 0)} | {yd.get('历史类', 0)} | {yd.get('物理类', 0) + yd.get('历史类', 0)} |\n"

    report += f"""
## 三、硬性指标

| 检查项 | 要求 | 实际 | 结果 |
|--------|------|------|------|
| 演示数据 | = 0 | {a['demoDataCount']} | {demo_ok} |
| 占位URL | = 0 | {a['placeholderUrlCount']} | {url_ok} |
| 推荐池review-required | 尽量少 | {a.get('reviewRequiredCount', 0)} | |
| A级来源 | 全部 | {a.get('sourceLevelACount', 0)} | |

## 四、验证状态

"""
    for s, cnt in a.get("verificationStatus", {}).items():
        report += f"- {s}: {cnt}条\n"

    report += f"""
## 五、异常检测

| 检查项 | 数量 |
|--------|------|
| 年份不匹配 | {a.get('yearMismatchCount', 0)} |
| 科类冲突 | {a.get('categoryConflicts', 0)} |
| 重复记录 | {a.get('duplicateRecords', 0)} |
| 分数异常 | {a.get('scoreAnomalies', 0)} |
| 排位异常 | {a.get('rankAnomalies', 0)} |
| 空院校名称 | {a.get('emptyNameCount', 0)} |
| 空专业组代码 | {a.get('emptyGroupCount', 0)} |
| 非广东记录 | {a.get('nonGuangdongCount', 0)} |
| 非本科批 | {a.get('nonBenkeCount', 0)} |
| 错误数据类型 | {a.get('wrongDataType', 0)} |

## 六、来源分布

"""
    for src, cnt in a.get("sources", {}).items():
        report += f"- {src}: {cnt}条\n"

    if a.get("failures"):
        report += "\n## 七、违规项\n\n"
        for f in a["failures"]:
            report += f"- ❌ {f}\n"

    report += f"""
## 结论

"""
    if a["pass"]:
        report += "✅ 正式数据库通过基础审计。\n"
    else:
        report += "❌ 正式数据库未通过审计，存在必须修复的问题。\n"

    return report


def main():
    a = audit()
    print(json.dumps(a, indent=2, ensure_ascii=False, default=str))

    # Write JSON artifact
    os.makedirs(ARTIFACTS_DIR, exist_ok=True)
    with open(os.path.join(ARTIFACTS_DIR, "official-data-audit-report.json"), "w") as f:
        json.dump(a, f, indent=2, ensure_ascii=False, default=str)

    # Write markdown report
    os.makedirs(DOCS_DIR, exist_ok=True)
    report = generate_report(a)
    with open(os.path.join(DOCS_DIR, "official-data-audit-report.md"), "w") as f:
        f.write(report)

    # Summary
    status = "PASS" if a["pass"] else "FAIL"
    print(f"\n=== AUDIT {status} ===")
    print(f"Total: {a['totalRecords']} records")
    print(f"Demo: {a['demoDataCount']}, Placeholder URLs: {a['placeholderUrlCount']}")
    for f in a.get("failures", []):
        print(f"  FAIL: {f}")

    sys.exit(0 if a["pass"] else 1)


if __name__ == "__main__":
    main()
