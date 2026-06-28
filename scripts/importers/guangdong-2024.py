"""
Guangdong 2024 Gaokao Admission Data Parser
SOURCE: 广东省教育考试院
PAGE: "我省2024年普通高考本科批次正式投档"
PAGE URL: https://eea.gd.gov.cn/gkmlpt/content/4/4458/mpost_4458330.html

Parses official ZIP attachments into structured records.
Input: data/official/raw/2024/archive/4458330.zip
The original ZIP is kept permanently in archive/.
Extracted files go to a temporary directory, parsed, then cleaned up.
Category (物理类/历史类) is determined by PDF internal title text,
NOT by filename or file order within the ZIP.
"""
import hashlib, json, os, re, sys, zipfile, tempfile, shutil
from datetime import datetime
from pathlib import Path
from typing import Optional

# --- Constants ---
PROVINCE = "广东"
ADMISSION_YEAR = 2024
BATCH = "本科批"
DATA_GRANULARITY = "institution-group投档"
IS_MAJOR_ADMISSION_SCORE = False
IS_DEMO = False
SOURCE_LEVEL = "A"
SOURCE_ORGANIZATION = "广东省教育考试院"
SOURCE_PAGE_TITLE = "我省2024年普通高考本科批次正式投档"
SOURCE_PAGE_URL = "https://eea.gd.gov.cn/gkmlpt/content/4/4458/mpost_4458330.html"
OFFICIAL_PUBLISHED_AT = "2024-07-19"
SOURCE_ATTACHMENT_URL = "https://eea.gd.gov.cn/attachment/0/554/554636/4458330.zip"

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
RAW_DIR = os.path.join(BASE_DIR, "data", "official", "raw", "2024")

HEADER_PATTERNS = {
    "institutionCode": [r"院校代码", r"学校代码", r"^代码$"],
    "institutionName": [r"院校名称", r"学校名称", r"^名称$"],
    "groupCode": [r"专业组代码", r"^专业组$", r"组代码"],
    "groupDisplayName": [r"专业组名称"],
    "planCount": [r"计划数", r"招生计划"],
    "admittedCount": [r"投档人数", r"投档数", r"投出数"],
    "minimumScore": [r"投档最低分", r"最低分", r"投档分"],
    "minimumRank": [r"投档最低排位", r"最低排位", r"排位"],
}


def identify_file_format(path):
    try:
        with open(path, "rb") as f:
            header = f.read(8)
        if header[:4] == b"%PDF":
            return "PDF"
        if header[:4] == b"PK\x03\x04":
            ext = Path(path).suffix.lower()
            return "XLSX" if ext == ".xlsx" else "ZIP"
        if header[:2] == b"\xd0\xcf":
            return "XLS"
        if header[:3] == b"\xef\xbb\xbf":
            return "CSV_BOM"
        ext = Path(path).suffix.lower()
        if ext == ".xlsx":
            return "XLSX"
        if ext == ".xls":
            return "XLS"
        if ext == ".csv":
            return "CSV"
        return "UNKNOWN({})".format(ext)
    except Exception as e:
        return "ERROR:{}".format(e)


def compute_sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def identify_category_from_filename(filename):
    name = filename.lower()
    if "物理" in name:
        return "物理类"
    if "历史" in name:
        return "历史类"
    return None


def identify_category_from_pdf(path):
    try:
        import pdfplumber
        with pdfplumber.open(path) as pdf:
            pages_to_check = min(2, len(pdf.pages))
            for pn in range(pages_to_check):
                text = pdf.pages[pn].extract_text()
                if not text:
                    continue
                text_clean = text.replace("\n", "").replace(" ", "")
                has_phys = "物理类" in text_clean
                has_hist = "历史类" in text_clean
                if has_phys and not has_hist:
                    return "物理类"
                if has_hist and not has_phys:
                    return "历史类"
                if has_phys and has_hist:
                    phys_pos = text_clean.find("物理类")
                    hist_pos = text_clean.find("历史类")
                    return "物理类" if phys_pos < hist_pos else "历史类"
        return None
    except Exception:
        return None


def determine_category(file_path, filename):
    cat_from_pdf = identify_category_from_pdf(file_path)
    if cat_from_pdf:
        cat_from_name = identify_category_from_filename(filename)
        if cat_from_name and cat_from_pdf != cat_from_name:
            return cat_from_pdf, "PDF内容={};文件名暗示={}".format(cat_from_pdf, cat_from_name)
        return cat_from_pdf, "PDF内容={}".format(cat_from_pdf)
    cat_from_name = identify_category_from_filename(filename)
    if cat_from_name:
        return cat_from_name, "文件名={}(未在PDF内容确认)".format(cat_from_name)
    return None, "无法判定科类"


def detect_header_row(rows):
    for i, row in enumerate(rows):
        if not row:
            continue
        mapping = {}
        for j, cell in enumerate(row):
            if not cell:
                continue
            cell_clean = str(cell).strip().replace("\n", "").replace(" ", "")
            for canonical, patterns in HEADER_PATTERNS.items():
                if canonical in mapping:
                    continue
                for pat in patterns:
                    if re.search(pat, cell_clean):
                        mapping[canonical] = j
                        break
        required = {"institutionName", "groupCode", "minimumScore", "minimumRank"}
        if required.issubset(mapping.keys()):
            return i, mapping
    return -1, {}


def clean_cell(cell):
    if cell is None:
        return None
    s = str(cell).strip()
    if s in ("", "-", "--", "—", "/", "缺档", "无"):
        return None
    return s


def parse_number(cell):
    s = clean_cell(cell)
    if s is None:
        return None
    s = s.replace(",", "").replace("，", "").replace(" ", "")
    try:
        return int(float(s))
    except Exception:
        return None


def validate_record(rec):
    issues = []
    if not rec.get("institutionName"):
        issues.append("空院校名称")
    if not rec.get("groupCode"):
        issues.append("空专业组代码")
    s = rec.get("minimumScore")
    if s is not None and (not isinstance(s, (int, float)) or s < 0 or s > 750):
        issues.append("最低分异常:{}".format(s))
    r = rec.get("minimumRank")
    if r is not None and (not isinstance(r, (int, float)) or r <= 0):
        issues.append("最低排位异常:{}".format(r))
    p = rec.get("planCount")
    if p is not None and (not isinstance(p, (int, float)) or p < 0):
        issues.append("计划数异常:{}".format(p))
    c = rec.get("institutionCode")
    if c is not None and (len(str(c)) != 5 or not str(c).isdigit()):
        issues.append("院校代码格式异常:{}".format(c))
    return issues


def make_record(row, mapping, category, path, extra=None):
    inst_code = None
    if "institutionCode" in mapping:
        inst_code = clean_cell(row[mapping["institutionCode"]])

    rec = {
        "province": PROVINCE,
        "admissionYear": ADMISSION_YEAR,
        "category": category,
        "batch": BATCH,
        "institutionCode": inst_code,
        "institutionName": clean_cell(row[mapping["institutionName"]]),
        "groupCode": clean_cell(row[mapping["groupCode"]]),
        "groupDisplayName": clean_cell(row[mapping.get("groupDisplayName", -1)]),
        "planCount": parse_number(row[mapping.get("planCount", -1)]),
        "admittedCount": parse_number(row[mapping.get("admittedCount", -1)]),
        "minimumScore": parse_number(row[mapping["minimumScore"]]),
        "minimumRank": parse_number(row[mapping["minimumRank"]]),
        "statusNote": None,
        "dataGranularity": DATA_GRANULARITY,
        "isMajorAdmissionScore": IS_MAJOR_ADMISSION_SCORE,
        "isDemo": IS_DEMO,
        "sourceLevel": SOURCE_LEVEL,
        "sourceOrganization": SOURCE_ORGANIZATION,
        "sourcePageTitle": SOURCE_PAGE_TITLE,
        "sourcePageUrl": SOURCE_PAGE_URL,
        "sourceAttachmentUrl": SOURCE_ATTACHMENT_URL,
        "sourceAttachmentName": os.path.basename(path),
        "officialPublishedAt": OFFICIAL_PUBLISHED_AT,
        "fetchedAt": datetime.now().isoformat(),
        "sourceFileHash": compute_sha256(path),
        "verificationStatus": "official-primary",
        "parsingNotes": extra or "",
    }
    issues = validate_record(rec)
    if issues:
        rec["verificationStatus"] = "review-required"
        rec["parsingNotes"] += "; 校验异常: {}".format("; ".join(issues))
    return rec


def extract_from_pdf(path, category):
    import pdfplumber
    records = []
    with pdfplumber.open(path) as pdf:
        for pn, page in enumerate(pdf.pages):
            tables = page.extract_tables()
            for table in tables:
                if not table:
                    continue
                hi, mapping = detect_header_row(table)
                if hi < 0:
                    continue
                for row in table[hi + 1:]:
                    empty_row = all(c is None or str(c).strip() == "" for c in row)
                    if not row or empty_row:
                        continue
                    records.append(make_record(row, mapping, category, path,
                                               "PDF p{}".format(pn + 1)))
    return records


def extract_from_excel(path, category):
    import pandas as pd
    ext = Path(path).suffix.lower()
    engine = "openpyxl" if ext == ".xlsx" else "xlrd"
    df = pd.read_excel(path, engine=engine, header=None)
    rows = df.values.tolist()
    hi, mapping = detect_header_row(rows)
    if hi < 0:
        return []
    records = []
    for row in rows[hi + 1:]:
        if all(pd.isna(c) for c in row):
            continue
        records.append(make_record(row, mapping, category, path, "Excel({})".format(ext)))
    return records


def process_single_file(tmp_path, name, cats, cat_checks):
    bn = os.path.basename(name)
    fmt = identify_file_format(tmp_path)
    cat, method = determine_category(tmp_path, bn)
    cat_checks.append({"file": bn, "category": cat, "method": method})

    if cat is None:
        cats["rejected"].append({"name": name, "reason": "科类判定失败: " + method})
        return

    records = None
    try:
        if fmt == "PDF":
            records = extract_from_pdf(tmp_path, cat)
        elif fmt in ("XLSX", "XLS"):
            records = extract_from_excel(tmp_path, cat)
        elif fmt in ("CSV", "CSV_BOM"):
            import csv as csv_mod
            with open(tmp_path, "r", encoding="utf-8-sig") as fh:
                reader = csv_mod.reader(fh)
                csv_rows = list(reader)
            hi, mapping = detect_header_row(csv_rows)
            if hi < 0:
                cats["rejected"].append({"name": name, "reason": "CSV无表头"})
                return
            records = []
            for row in csv_rows[hi + 1:]:
                records.append(make_record(row, mapping, cat, tmp_path, "CSV"))
        else:
            cats["rejected"].append({"name": name, "reason": "无法解析:" + fmt})
            return

        if records:
            cats[cat].extend(records)
        else:
            cats["rejected"].append({"name": name, "reason": "解析出0条记录"})
    except Exception as e:
        cats["rejected"].append({"name": name,
                                 "reason": "{}:{}".format(type(e).__name__, e)})


def process_zip(zip_path):
    cats = {"物理类": [], "历史类": [], "rejected": [], "metadata": []}
    tmpdir = tempfile.mkdtemp(prefix="yz_{}_".format(ADMISSION_YEAR))
    cat_checks = []

    try:
        with zipfile.ZipFile(zip_path, "r") as zf:
            for name in zf.namelist():
                bn = os.path.basename(name)
                if not bn or bn.startswith("._") or bn.startswith("__MACOSX"):
                    continue
                ext = Path(name).suffix.lower()
                if ext not in (".pdf", ".xls", ".xlsx", ".csv"):
                    cats["rejected"].append({"name": name, "reason": "不支持类型:" + ext})
                    continue

                tmp_path = os.path.join(tmpdir, bn)
                with zf.open(name) as src, open(tmp_path, "wb") as dst:
                    dst.write(src.read())

                process_single_file(tmp_path, name, cats, cat_checks)
    finally:
        if os.path.isdir(tmpdir):
            shutil.rmtree(tmpdir, ignore_errors=True)

    cats["metadata"] = cat_checks
    return cats


def run_parser(file_path, category=None):
    result = {
        "admissionYear": ADMISSION_YEAR,
        "file": os.path.basename(file_path),
        "filePath": file_path,
        "fileFormat": None,
        "fileSize": None,
        "sha256": None,
        "category": None,
        "records": [],
        "errors": [],
        "stats": {},
        "categoryDetermination": [],
    }
    if not os.path.exists(file_path):
        result["errors"].append("文件不存在:" + file_path)
        return result
    sz = os.path.getsize(file_path)
    result["fileSize"] = sz
    result["sha256"] = compute_sha256(file_path)
    result["fileFormat"] = identify_file_format(file_path)

    if result["fileFormat"] == "ZIP" and not file_path.lower().endswith(".xlsx"):
        try:
            p = process_zip(file_path)
            result["category"] = "MIXED"
            result["records"] = p["物理类"] + p["历史类"]
            result["stats"]["rejectedFromZip"] = len(p["rejected"])
            result["stats"]["physicsCount"] = len(p["物理类"])
            result["stats"]["historyCount"] = len(p["历史类"])
            result["stats"]["totalRecords"] = len(result["records"])
            result["categoryDetermination"] = p.get("metadata", [])
            if not p["物理类"] and not p["历史类"]:
                result["errors"].append("ZIP解压后未找到任何物理类或历史类记录")
            elif not p["物理类"]:
                result["errors"].append("ZIP解压后未找到物理类记录")
            elif not p["历史类"]:
                result["errors"].append("ZIP解压后未找到历史类记录")
            pv = [r for r in result["records"]
                  if r.get("verificationStatus") == "official-primary"]
            rr = [r for r in result["records"]
                  if r.get("verificationStatus") == "review-required"]
            result["stats"]["passedValidation"] = len(pv)
            result["stats"]["reviewRequired"] = len(rr)
        except Exception as e:
            result["errors"].append("ZIP解析失败:{}:{}".format(type(e).__name__, e))
        return result

    cat, method = determine_category(file_path, os.path.basename(file_path))
    if cat is None and category:
        cat = category
        method = "显式指定=" + category
    if cat is None:
        result["errors"].append("无法判断科类: " + method)
        return result

    result["category"] = cat
    result["categoryDetermination"] = [{
        "file": os.path.basename(file_path),
        "category": cat,
        "method": method,
    }]

    try:
        fmt = result["fileFormat"]
        if fmt == "PDF":
            records = extract_from_pdf(file_path, cat)
        elif fmt in ("XLSX", "XLS", "CSV", "CSV_BOM"):
            records = extract_from_excel(file_path, cat)
        else:
            result["errors"].append("不支持格式:" + fmt)
            return result
        result["records"] = records
        result["stats"]["totalRecords"] = len(records)
        pv = [r for r in records if r.get("verificationStatus") == "official-primary"]
        rr = [r for r in records if r.get("verificationStatus") == "review-required"]
        result["stats"]["passedValidation"] = len(pv)
        result["stats"]["reviewRequired"] = len(rr)
    except Exception as e:
        result["errors"].append("解析异常:{}:{}".format(type(e).__name__, e))
    return result


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python {} <file_path> [category]".format(sys.argv[0]))
        sys.exit(1)
    cat = sys.argv[2] if len(sys.argv) > 2 else None
    result = run_parser(sys.argv[1], cat)
    print(json.dumps(result, indent=2, ensure_ascii=False, default=str))
