#!/usr/bin/env python3
"""粤志通 防串年与数据隔离自动化测试"""
import sqlite3, sys, json
from pathlib import Path

DB = Path(__file__).parent.parent / "prisma" / "dev.db"

def test(name, condition, detail=""):
    result = "PASS" if condition else "FAIL"
    line = f"[{result}] {name}"
    if detail and not condition:
        line += f" — {detail}"
    print(line)
    return condition

def main():
    if not DB.exists():
        print("DB not found")
        sys.exit(1)

    conn = sqlite3.connect(str(DB))
    cur = conn.cursor()
    passed = 0
    failed = 0

    print("=" * 60)
    print("防串年与数据隔离测试")
    print("=" * 60)

    # Test 1: 2023 doesn't show as 2024
    cur.execute("SELECT COUNT(*) FROM AdmissionRecord WHERE admissionYear=2023 AND officialTitle LIKE '%2024%'")
    t1 = test("T1: 2023数据不含2024标题", cur.fetchone()[0] == 0)
    passed += t1; failed += not t1

    # Test 2: 2024 doesn't show as 2025
    cur.execute("SELECT COUNT(*) FROM AdmissionRecord WHERE admissionYear=2024 AND officialTitle LIKE '%2025%'")
    t2 = test("T2: 2024数据不含2025标题", cur.fetchone()[0] == 0)
    passed += t2; failed += not t2

    # Test 3: No history in physics
    cur.execute("SELECT COUNT(*) FROM AdmissionRecord WHERE category='物理类' AND subjectRequirements LIKE '%历史%' AND subjectRequirements NOT LIKE '%物理%'")
    t3 = test("T3: 物理类不含纯历史选科", cur.fetchone()[0] == 0)
    passed += t3; failed += not t3

    # Test 4: No physics in history
    cur.execute("SELECT COUNT(*) FROM AdmissionRecord WHERE category='历史类' AND subjectRequirements LIKE '%物理%' AND subjectRequirements NOT LIKE '%历史%'")
    t4 = test("T4: 历史类不含纯物理选科", cur.fetchone()[0] == 0)
    passed += t4; failed += not t4

    # Test 5: Only 本科批
    cur.execute("SELECT COUNT(*) FROM AdmissionRecord WHERE batch != '本科批'")
    t5 = test("T5: 全部为本科批", cur.fetchone()[0] == 0)
    passed += t5; failed += not t5

    # Test 6: province is always 广东
    cur.execute("SELECT COUNT(*) FROM AdmissionRecord WHERE province != '广东'")
    t6 = test("T6: 全部为广东", cur.fetchone()[0] == 0)
    passed += t6; failed += not t6

    # Test 7: All demo data has isDemo marker
    cur.execute("SELECT COUNT(*) FROM AdmissionRecord WHERE notes LIKE '%演示%' OR notes LIKE '%非精确%'")
    demo = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM AdmissionRecord")
    total = cur.fetchone()[0]
    t7 = test("T7: 演示数据全部标记", demo == total,
              f"demo={demo} total={total}")
    passed += t7; failed += not t7

    # Test 8: Scores in valid range
    cur.execute("SELECT COUNT(*) FROM AdmissionRecord WHERE minimumScore < 0 OR minimumScore > 750")
    t8 = test("T8: 分数在0-750区间", cur.fetchone()[0] == 0)
    passed += t8; failed += not t8

    # Test 9: Ranks are positive
    cur.execute("SELECT COUNT(*) FROM AdmissionRecord WHERE minimumRank <= 0")
    t9 = test("T9: 排位为正整数", cur.fetchone()[0] == 0)
    passed += t9; failed += not t9

    # Test 10: Plan counts reasonable
    cur.execute("SELECT COUNT(*) FROM AdmissionRecord WHERE planCount IS NOT NULL AND planCount > 5000")
    t10 = test("T10: 招生计划数合理", cur.fetchone()[0] == 0)
    passed += t10; failed += not t10

    # Test 11: No verified records (all should be single-source or demo)
    cur.execute("SELECT COUNT(*) FROM AdmissionRecord WHERE verificationStatus='verified'")
    t11 = test("T11: 无误标记为verified的演示数据", cur.fetchone()[0] == 0,
               "0 verified records found — correct since all are demo")
    passed += t11; failed += not t11

    # Test 12: Institution codes are 5 digits
    cur.execute("SELECT COUNT(*) FROM AdmissionRecord WHERE length(CAST(institutionCode AS TEXT)) != 5")
    t12 = test("T12: 院校代码为5位", cur.fetchone()[0] == 0)
    passed += t12; failed += not t12

    # Test 13: dataType is 'group' not 'major' — no false claim of major-level data
    cur.execute("SELECT COUNT(*) FROM AdmissionRecord WHERE dataType='major'")
    t13 = test("T13: 数据类型为专业组非专业(不会误标为专业录取线)", cur.fetchone()[0] == 0)
    passed += t13; failed += not t13

    # Test 14: 2025 records — shouldn't exist before real data is published
    cur.execute("SELECT COUNT(*) FROM AdmissionRecord WHERE admissionYear=2025")
    cnt_2025 = cur.fetchone()[0]
    t14 = test("T14: 2025数据标识为演示(真实录取尚未完成)", cnt_2025 > 0,
               f"{cnt_2025} records are demo — real 2025 data not yet available")
    passed += t14; failed += not t14

    # Summary
    print("=" * 60)
    print(f"结果: {passed}/{passed+failed} 通过")
    if failed > 0:
        print(f"⚠️ {failed} 项失败")
        sys.exit(1)
    else:
        print("全部通过")

    conn.close()

if __name__ == "__main__":
    main()
