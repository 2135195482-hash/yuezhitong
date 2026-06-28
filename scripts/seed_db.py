#!/usr/bin/env python3
"""粤志通 - 数据库填充脚本（写入 prisma/dev.db）"""
import json, sqlite3
from pathlib import Path
from datetime import datetime

ROOT = Path(__file__).parent.parent
DB_PATH = ROOT / "prisma" / "dev.db"
DATA_DIR = ROOT / "data"

def seed():
    conn = sqlite3.connect(str(DB_PATH))
    cur = conn.cursor()
    
    # 导入院校
    index_path = DATA_DIR / "sources" / "source_index.json"
    if index_path.exists():
        with open(index_path, 'r', encoding='utf-8') as f:
            index = json.load(f)
        for inst in index.get("institutions", []):
            cur.execute("""INSERT OR IGNORE INTO Institution (code, name, type, level, province, city, is985, is211, isDoubleFirst, verifiedAt, notes, createdAt) VALUES (?, ?, ?, '本科', ?, ?, ?, ?, ?, datetime('now'), '', datetime('now'))""", (
                inst["code"], inst["name"], inst["type"], inst["province"], inst["city"],
                1 if inst["is985"] else 0, 1 if inst["is211"] else 0, 1 if inst["isDoubleFirst"] else 0))
        conn.commit()
        print(f"✅ 院校导入完成")
    
    # 导入录取数据
    verified_file = DATA_DIR / "verified" / "verified_records.json"
    if not verified_file.exists():
        print("❌ 无验证数据")
        conn.close(); return
    
    with open(verified_file, 'r', encoding='utf-8') as f:
        records = json.load(f)
    
    for r in records:
        subjects = r.get('subjectRequirements', [])
        if isinstance(subjects, list): subjects = json.dumps(subjects, ensure_ascii=False)
        elif not isinstance(subjects, str): subjects = '[]'
        pub = r.get('officialPublishedAt', f'{r.get("admissionYear", 2024)}-07-20')
        fetch = r.get('fetchedAt', datetime.now().isoformat())
        
        cur.execute("""INSERT INTO AdmissionRecord (province, admissionYear, category, batch, institutionCode, institutionName, groupCode, groupName, majorCode, majorName, subjectRequirements, planCount, minimumScore, minimumRank, dataType, sourceLevel, sourceName, sourceUrl, officialTitle, officialPublishedAt, fetchedAt, sourceFileHash, confidence, verificationStatus, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))""", (
            r.get('province','广东'), r.get('admissionYear'), r.get('category',''), r.get('batch','本科批'),
            str(r.get('institutionCode','')), r.get('institutionName',''), str(r.get('groupCode','')), r.get('groupName',''),
            str(r.get('majorCode','')), r.get('majorName',''), subjects, r.get('planCount'),
            r.get('minimumScore'), r.get('minimumRank'), r.get('dataType','group'), r.get('sourceLevel','B'),
            r.get('sourceName',''), r.get('sourceUrl',''), r.get('officialTitle',''),
            pub, fetch, r.get('sourceFileHash',''), r.get('confidence','single-source'),
            r.get('verificationStatus','single-source'), r.get('notes','')))
    
    conn.commit(); conn.close()
    print(f"✅ 录取数据导入: {len(records)} 条")

if __name__ == "__main__":
    seed()
