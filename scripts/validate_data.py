#!/usr/bin/env python3
"""
粤志通 - 数据校验脚本
检查所有归一化数据中的年份冲突、科类混合、排位异常、院校冲突等问题

用法: python3 scripts/validate_data.py
"""

import json
import re
import sys
from pathlib import Path
from datetime import datetime

ROOT = Path(__file__).parent.parent
DATA_DIR = ROOT / "data"
NORMALIZED_DIR = DATA_DIR / "normalized"
REVIEW_DIR = DATA_DIR / "review"
REJECTED_DIR = DATA_DIR / "rejected"
VERIFIED_DIR = DATA_DIR / "verified"

REVIEW_DIR.mkdir(parents=True, exist_ok=True)
REJECTED_DIR.mkdir(parents=True, exist_ok=True)
VERIFIED_DIR.mkdir(parents=True, exist_ok=True)

def validate_all():
    report = {
        "validatedAt": datetime.now().isoformat(),
        "summary": {
            "totalRecords": 0,
            "valid": 0,
            "review": 0,
            "rejected": 0,
            "yearConflicts": 0,
            "categoryConflicts": 0,
            "scoreAnomalies": 0,
            "rankAnomalies": 0,
            "institutionConflicts": 0,
            "sourceIssues": 0,
        },
        "details": []
    }
    
    all_valid = []
    
    for year_dir in sorted(NORMALIZED_DIR.iterdir()):
        if not year_dir.is_dir(): continue
        expected_year = int(year_dir.name)
        
        for file in sorted(year_dir.iterdir()):
            if file.suffix != '.json': continue
            if file.name.startswith('template_'): continue  # Skip templates
            
            with open(file, 'r', encoding='utf-8') as f:
                records = json.load(f)
            
            for r in records:
                report["summary"]["totalRecords"] += 1
                errs = validate_record(r, expected_year)
                
                if errs:
                    if any('REJECT' in e for e in errs):
                        report["summary"]["rejected"] += 1
                        save_rejected(r, errs, expected_year)
                    else:
                        report["summary"]["review"] += 1
                        save_review(r, errs, expected_year)
                    
                    report["details"].append({
                        "record": f"{r.get('institutionName', '?')} / {r.get('groupCode', '?')} / {r.get('admissionYear', '?')}年",
                        "errors": errs
                    })
                else:
                    report["summary"]["valid"] += 1
                    all_valid.append(r)
    
    # Save validation report
    with open(DATA_DIR / "validation_report.json", 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    
    # Save verified records
    if all_valid:
        with open(VERIFIED_DIR / "verified_records.json", 'w', encoding='utf-8') as f:
            json.dump(all_valid, f, ensure_ascii=False, indent=2)
    
    return report

def validate_record(r, expected_year):
    errs = []
    
    # === 年份校验 ===
    record_year = r.get('admissionYear')
    if record_year != expected_year:
        errs.append(f"REJECT:YEAR_MISMATCH: record_year={record_year} expected={expected_year}")
        report["summary"]["yearConflicts"] += 1
    
    # 发布时间合理性检查
    pub_date = r.get('officialPublishedAt', '')
    if pub_date:
        try:
            pub_year = int(pub_date[:4])
            if pub_year < record_year:
                errs.append(f"YEAR_CONFLICT: published {pub_year} before admission year {record_year}")
        except: pass
    
    # === 省份校验 ===
    if r.get('province') != '广东':
        errs.append(f"REJECT:PROVINCE: must be 广东, got {r.get('province')}")
    
    # === 科类校验 ===
    category = r.get('category', '')
    if category not in ['物理类', '历史类']:
        errs.append(f"REJECT:CATEGORY: invalid {category}")
        report["summary"]["categoryConflicts"] += 1
    
    # 选科要求是否与科类一致
    subjects = r.get('subjectRequirements', [])
    if isinstance(subjects, str):
        try: subjects = json.loads(subjects)
        except: subjects = []
    
    if category == '物理类' and '物理' not in subjects and subjects:
        errs.append(f"WARN: physics group may require 物理, got {subjects}")
    
    if category == '历史类' and '历史' not in subjects and subjects:
        errs.append(f"WARN: history group may require 历史, got {subjects}")
    
    # === 批次校验 ===
    if r.get('batch') != '本科批':
        errs.append(f"REJECT:BATCH: must be 本科批, got {r.get('batch')}")
    
    # === 排位和分数校验 ===
    rank = r.get('minimumRank')
    if rank is not None:
        if not isinstance(rank, int) or rank <= 0:
            errs.append(f"REJECT:RANK_INVALID: {rank}")
            report["summary"]["rankAnomalies"] += 1
        elif rank > 300000:
            errs.append(f"WARN:RANK_HIGH: rank {rank} seems high for 本科批")
    
    score = r.get('minimumScore')
    if score is not None:
        if not isinstance(score, int) or score < 200 or score > 750:
            errs.append(f"REJECT:SCORE_RANGE: {score}")
            report["summary"]["scoreAnomalies"] += 1
    
    # 排位和分数配比检查
    if score and rank:
        # 大致检查：物理类600分约2-3万名，500分约14-16万名
        if category == '物理类':
            if score >= 600 and rank > 100000:
                errs.append(f"WARN:RANK_SCORE_MISMATCH: physics score {score} but rank {rank}")
        
    # 招生计划数校验
    plan = r.get('planCount')
    if plan is not None:
        if not isinstance(plan, int) or plan <= 0 or plan > 5000:
            errs.append(f"WARN:PLAN_SUSPICIOUS: {plan}")
    
    # === 院校校验 ===
    code = str(r.get('institutionCode', ''))
    if not re.match(r'^\d{5}$', code):
        errs.append(f"REJECT:INST_CODE_FORMAT: {code}")
        report["summary"]["institutionConflicts"] += 1
    
    # === 来源校验 ===
    source = r.get('sourceName', '')
    if not source or source == '':
        errs.append(f"WARN:SOURCE_MISSING")
        report["summary"]["sourceIssues"] += 1
    
    source_level = r.get('sourceLevel', '')
    if source_level not in ['A', 'B']:
        errs.append(f"WARN:SOURCE_LEVEL_INVALID: {source_level}")
    
    # === 专业组代码校验 ===
    group_code = r.get('groupCode', '')
    if not group_code:
        errs.append(f"WARN:GROUP_CODE_MISSING")
    
    return errs

def save_review(record, errors, year):
    path = REVIEW_DIR / f"review_{year}.jsonl"
    with open(path, 'a', encoding='utf-8') as f:
        entry = {"record": record, "errors": errors, "reviewedAt": datetime.now().isoformat()}
        f.write(json.dumps(entry, ensure_ascii=False) + '\n')

def save_rejected(record, errors, year):
    path = REJECTED_DIR / f"rejected_{year}.jsonl"
    with open(path, 'a', encoding='utf-8') as f:
        entry = {"record": record, "errors": errors, "rejectedAt": datetime.now().isoformat()}
        f.write(json.dumps(entry, ensure_ascii=False) + '\n')

if __name__ == "__main__":
    print("粤志通 - 数据校验")
    print("=" * 50)
    
    report = validate_all()
    s = report["summary"]
    
    print(f"\n总记录数: {s['totalRecords']}")
    print(f"✅ 通过校验: {s['valid']}")
    print(f"⚠️  待人工复核: {s['review']}")
    print(f"❌ 已拒绝: {s['rejected']}")
    print(f"\n异常分类:")
    print(f"  年份冲突: {s['yearConflicts']}")
    print(f"  科类冲突: {s['categoryConflicts']}")
    print(f"  分数异常: {s['scoreAnomalies']}")
    print(f"  排位异常: {s['rankAnomalies']}")
    print(f"  院校冲突: {s['institutionConflicts']}")
    print(f"  来源问题: {s['sourceIssues']}")
    
    print(f"\n报告已保存: {DATA_DIR / 'validation_report.json'}")
