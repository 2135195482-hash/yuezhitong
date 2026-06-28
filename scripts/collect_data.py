#!/usr/bin/env python3
"""
粤志通 - 广东高考招生数据采集脚本
从广东省教育考试院等官方来源下载、缓存和结构化录取数据

用法: python3 scripts/collect_data.py --year 2024 --category physics
"""

import os
import sys
import json
import hashlib
import time
import csv
import re
from pathlib import Path
from datetime import datetime
from urllib.parse import urlparse

# 项目根目录
ROOT = Path(__file__).parent.parent
DATA_DIR = ROOT / "data"
RAW_DIR = DATA_DIR / "raw"
NORMALIZED_DIR = DATA_DIR / "normalized"
SOURCES_DIR = DATA_DIR / "sources"

# 确保目录存在
for d in [RAW_DIR, NORMALIZED_DIR, SOURCES_DIR, DATA_DIR / "verified", DATA_DIR / "rejected", DATA_DIR / "review"]:
    d.mkdir(parents=True, exist_ok=True)
for year in [2023, 2024, 2025, 2026]:
    (RAW_DIR / str(year)).mkdir(parents=True, exist_ok=True)
    (NORMALIZED_DIR / str(year)).mkdir(parents=True, exist_ok=True)


# ============================================================
# 官方数据来源索引
# ============================================================
GUANGDONG_SOURCES = {
    "广东省教育考试院": {
        "url": "https://eea.gd.gov.cn/",
        "level": "A",
        "categories": ["投档情况", "分数段统计", "招生专业目录", "录取最低控制分数线"],
    },
    "广东省教育厅": {
        "url": "https://edu.gd.gov.cn/",
        "level": "A",
    },
    "教育部阳光高考平台": {
        "url": "https://gaokao.chsi.com.cn/",
        "level": "A",
    },
    "教育部": {
        "url": "https://www.moe.gov.cn/",
        "level": "A",
        "resources": ["普通高等学校名单", "本科专业目录"],
    },
}

# 广东省本科批次院校列表 (基于教育部2024年名单中招生广东的院校)
# 这是一个示例列表 - 实际数据需要从官方来源获取
GUANGDONG_UNDERGRAD_INSTITUTIONS = [
    # 985/211/双一流
    {"code": "10558", "name": "中山大学", "type": "公办", "province": "广东", "city": "广州", "is985": True, "is211": True, "isDoubleFirst": True},
    {"code": "10561", "name": "华南理工大学", "type": "公办", "province": "广东", "city": "广州", "is985": True, "is211": True, "isDoubleFirst": True},
    {"code": "10559", "name": "暨南大学", "type": "公办", "province": "广东", "city": "广州", "is985": False, "is211": True, "isDoubleFirst": True},
    {"code": "10564", "name": "华南农业大学", "type": "公办", "province": "广东", "city": "广州", "is985": False, "is211": False, "isDoubleFirst": True},
    {"code": "10572", "name": "广州中医药大学", "type": "公办", "province": "广东", "city": "广州", "is985": False, "is211": False, "isDoubleFirst": True},
    {"code": "10574", "name": "华南师范大学", "type": "公办", "province": "广东", "city": "广州", "is985": False, "is211": True, "isDoubleFirst": True},
    {"code": "10560", "name": "汕头大学", "type": "公办", "province": "广东", "city": "汕头", "is985": False, "is211": False, "isDoubleFirst": False},
    {"code": "11845", "name": "广东工业大学", "type": "公办", "province": "广东", "city": "广州", "is985": False, "is211": False, "isDoubleFirst": False},
    {"code": "11078", "name": "广州大学", "type": "公办", "province": "广东", "city": "广州", "is985": False, "is211": False, "isDoubleFirst": False},
    {"code": "11846", "name": "广东外语外贸大学", "type": "公办", "province": "广东", "city": "广州", "is985": False, "is211": False, "isDoubleFirst": False},
    {"code": "10566", "name": "广东海洋大学", "type": "公办", "province": "广东", "city": "湛江", "is985": False, "is211": False, "isDoubleFirst": False},
    {"code": "11847", "name": "佛山大学", "type": "公办", "province": "广东", "city": "佛山", "is985": False, "is211": False, "isDoubleFirst": False},
    {"code": "10592", "name": "广东财经大学", "type": "公办", "province": "广东", "city": "广州", "is985": False, "is211": False, "isDoubleFirst": False},
    {"code": "10571", "name": "广东医科大学", "type": "公办", "province": "广东", "city": "湛江", "is985": False, "is211": False, "isDoubleFirst": False},
    {"code": "10588", "name": "广东技术师范大学", "type": "公办", "province": "广东", "city": "广州", "is985": False, "is211": False, "isDoubleFirst": False},
    {"code": "11349", "name": "五邑大学", "type": "公办", "province": "广东", "city": "江门", "is985": False, "is211": False, "isDoubleFirst": False},
    {"code": "10579", "name": "岭南师范学院", "type": "公办", "province": "广东", "city": "湛江", "is985": False, "is211": False, "isDoubleFirst": False},
    {"code": "10578", "name": "韩山师范学院", "type": "公办", "province": "广东", "city": "潮州", "is985": False, "is211": False, "isDoubleFirst": False},
    {"code": "11656", "name": "广东石油化工学院", "type": "公办", "province": "广东", "city": "茂名", "is985": False, "is211": False, "isDoubleFirst": False},
    {"code": "10576", "name": "韶关学院", "type": "公办", "province": "广东", "city": "韶关", "is985": False, "is211": False, "isDoubleFirst": False},
    {"code": "10582", "name": "嘉应学院", "type": "公办", "province": "广东", "city": "梅州", "is985": False, "is211": False, "isDoubleFirst": False},
    {"code": "10580", "name": "肇庆学院", "type": "公办", "province": "广东", "city": "肇庆", "is985": False, "is211": False, "isDoubleFirst": False},
    {"code": "10577", "name": "惠州学院", "type": "公办", "province": "广东", "city": "惠州", "is985": False, "is211": False, "isDoubleFirst": False},
    {"code": "11540", "name": "广东金融学院", "type": "公办", "province": "广东", "city": "广州", "is985": False, "is211": False, "isDoubleFirst": False},
    {"code": "14278", "name": "广东第二师范学院", "type": "公办", "province": "广东", "city": "广州", "is985": False, "is211": False, "isDoubleFirst": False},
    # 民办院校
    {"code": "16401", "name": "北京理工大学珠海学院", "type": "民办", "province": "广东", "city": "珠海", "is985": False, "is211": False, "isDoubleFirst": False},
    {"code": "12617", "name": "广州城市理工学院", "type": "民办", "province": "广东", "city": "广州", "is985": False, "is211": False, "isDoubleFirst": False},
    {"code": "12618", "name": "广州软件学院", "type": "民办", "province": "广东", "city": "广州", "is985": False, "is211": False, "isDoubleFirst": False},
    {"code": "12619", "name": "广州南方学院", "type": "民办", "province": "广东", "city": "广州", "is985": False, "is211": False, "isDoubleFirst": False},
    {"code": "12620", "name": "广东外语外贸大学南国商学院", "type": "民办", "province": "广东", "city": "广州", "is985": False, "is211": False, "isDoubleFirst": False},
    {"code": "12621", "name": "广州华商学院", "type": "民办", "province": "广东", "city": "广州", "is985": False, "is211": False, "isDoubleFirst": False},
    {"code": "12622", "name": "湛江科技学院", "type": "民办", "province": "广东", "city": "湛江", "is985": False, "is211": False, "isDoubleFirst": False},
    {"code": "12623", "name": "华南农业大学珠江学院", "type": "民办", "province": "广东", "city": "广州", "is985": False, "is211": False, "isDoubleFirst": False},
    {"code": "13667", "name": "广州商学院", "type": "民办", "province": "广东", "city": "广州", "is985": False, "is211": False, "isDoubleFirst": False},
    {"code": "13684", "name": "珠海科技学院", "type": "民办", "province": "广东", "city": "珠海", "is985": False, "is211": False, "isDoubleFirst": False},
    {"code": "13714", "name": "广州工商学院", "type": "民办", "province": "广东", "city": "广州", "is985": False, "is211": False, "isDoubleFirst": False},
    {"code": "13719", "name": "广东科技学院", "type": "民办", "province": "广东", "city": "东莞", "is985": False, "is211": False, "isDoubleFirst": False},
    {"code": "13720", "name": "广东理工学院", "type": "民办", "province": "广东", "city": "肇庆", "is985": False, "is211": False, "isDoubleFirst": False},
    {"code": "13844", "name": "东莞城市学院", "type": "民办", "province": "广东", "city": "东莞", "is985": False, "is211": False, "isDoubleFirst": False},
    {"code": "13902", "name": "广州新华学院", "type": "民办", "province": "广东", "city": "广州", "is985": False, "is211": False, "isDoubleFirst": False},
    {"code": "14362", "name": "深圳技术大学", "type": "公办", "province": "广东", "city": "深圳", "is985": False, "is211": False, "isDoubleFirst": False},
    {"code": "10590", "name": "深圳大学", "type": "公办", "province": "广东", "city": "深圳", "is985": False, "is211": False, "isDoubleFirst": False},
    {"code": "10570", "name": "广州医科大学", "type": "公办", "province": "广东", "city": "广州", "is985": False, "is211": False, "isDoubleFirst": True},
]

def compute_hash(filepath):
    """计算文件SHA256哈希"""
    h = hashlib.sha256()
    with open(filepath, 'rb') as f:
        while True:
            chunk = f.read(8192)
            if not chunk: break
            h.update(chunk)
    return h.hexdigest()

def save_json(data, filepath):
    """保存JSON文件"""
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def save_csv(rows, filepath, fieldnames):
    """保存CSV文件"""
    with open(filepath, 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

def validate_admission_record(record, expected_year):
    """校验一条录取记录
    
    Returns: (is_valid, errors)
    """
    errors = []
    
    # 年份校验
    if record.get('admissionYear') != expected_year:
        errors.append(f"YEAR_MISMATCH: record year {record.get('admissionYear')} != expected {expected_year}")
    
    # 省份校验
    if record.get('province') != '广东':
        errors.append(f"PROVINCE: must be 广东, got {record.get('province')}")
    
    # 科类校验
    category = record.get('category', '')
    if category not in ['物理类', '历史类']:
        errors.append(f"CATEGORY: must be 物理类 or 历史类, got {category}")
    
    # 批次校验
    batch = record.get('batch', '')
    if batch != '本科批':
        errors.append(f"BATCH: must be 本科批, got {batch}")
    
    # 排位校验
    rank = record.get('minimumRank')
    if rank is not None:
        if not isinstance(rank, int) or rank <= 0:
            errors.append(f"RANK: invalid rank {rank}")
        elif rank > 500000:
            errors.append(f"RANK: suspiciously high rank {rank}")
    
    # 分数校验
    score = record.get('minimumScore')
    if score is not None:
        if not isinstance(score, int) or score < 0 or score > 750:
            errors.append(f"SCORE: invalid score {score}")
    
    # 院校代码校验
    code = record.get('institutionCode', '')
    if not code or not re.match(r'^\d{5}$', str(code)):
        errors.append(f"INST_CODE: invalid code {code}")
    
    # 来源校验
    if not record.get('sourceName'):
        errors.append("SOURCE: missing source name")
    
    return (len(errors) == 0, errors)

def export_rejected_records(records, errors_map, year):
    """导出入队复审记录"""
    rejected = []
    for r in records:
        if r.get('id') in errors_map:
            rejected.append({**r, 'errors': errors_map[r['id']]})
    
    if rejected:
        save_json(rejected, DATA_DIR / "review" / f"review_{year}.json")
    
    return len(rejected)

def build_source_index():
    """构建数据来源索引"""
    index = {
        "generatedAt": datetime.now().isoformat(),
        "province": "广东",
        "sources": GUANGDONG_SOURCES,
        "institutions": GUANGDONG_UNDERGRAD_INSTITUTIONS,
    }
    save_json(index, SOURCES_DIR / "source_index.json")
    return index

def create_normalized_template(year, category):
    """创建标准化数据模板"""
    records = []
    for inst in GUANGDONG_UNDERGRAD_INSTITUTIONS:
        record = {
            "province": "广东",
            "admissionYear": year,
            "category": category,
            "batch": "本科批",
            "institutionCode": inst["code"],
            "institutionName": inst["name"],
            "groupCode": "",
            "groupName": "",
            "majorCode": "",
            "majorName": "",
            "subjectRequirements": [],
            "planCount": None,
            "minimumScore": None,
            "minimumRank": None,
            "dataType": "group",
            "sourceLevel": "A",
            "sourceName": "",
            "sourceUrl": "",
            "officialTitle": "",
            "officialPublishedAt": "",
            "fetchedAt": datetime.now().isoformat(),
            "sourceFileHash": "",
            "confidence": "single-source",
            "verificationStatus": "single-source",
            "notes": "模板记录，待填入官方数据"
        }
        records.append(record)
    
    save_json(records, NORMALIZED_DIR / str(year) / f"template_{category}.json")
    return records

if __name__ == "__main__":
    print("=" * 60)
    print("粤志通 - 广东高考招生数据采集工具")
    print("=" * 60)
    
    # 构建来源索引
    index = build_source_index()
    print(f"\n✅ 数据来源索引已生成: {SOURCES_DIR / 'source_index.json'}")
    print(f"   收录院校: {len(index['institutions'])} 所")
    print(f"   官方来源: {len(index['sources'])} 个")
    
    # 生成各年份模板
    for year in [2023, 2024, 2025]:
        for cat in ['物理类', '历史类']:
            create_normalized_template(year, cat)
            print(f"   模板: {year}年{cat}")
    
    print(f"\n📋 数据模板已生成，下一步：")
    print(f"   1. 从广东省教育考试院获取官方投档数据")
    print(f"   2. 填充 normalized/ 目录下的模板文件")
    print(f"   3. 运行 scripts/validate_data.py 校验数据")
    print(f"   4. 运行 scripts/seed_db.py 导入数据库")
