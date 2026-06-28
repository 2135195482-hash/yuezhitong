import hashlib
import json
import mimetypes
import re
import time
import urllib.parse
import urllib.request
import zipfile
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW_ROOT = ROOT / "data" / "official" / "raw"
MANIFEST_DIR = ROOT / "data" / "official" / "manifests"
LOG_DIR = ROOT / "logs" / "official"

SOURCES = [
    {
        "admissionYear": 2023,
        "category": "archive",
        "sourcePageUrl": "https://eea.gd.gov.cn/ptgk/content/post_4221648.html",
        "linkText": "本科批次投档情况下载",
        "targetDir": RAW_ROOT / "2023" / "archive",
    },
    {
        "admissionYear": 2024,
        "category": "archive",
        "sourcePageUrl": "https://eea.gd.gov.cn/ptgk/content/post_4458330.html",
        "linkText": "本科批次投档情况",
        "targetDir": RAW_ROOT / "2024" / "archive",
    },
    {
        "admissionYear": 2025,
        "category": "历史类",
        "sourcePageUrl": "https://eea.gd.gov.cn/ptgk/content/post_4746781.html",
        "linkText": "广东省2025年本科普通类（历史）投档情况",
        "targetDir": RAW_ROOT / "2025" / "history",
    },
    {
        "admissionYear": 2025,
        "category": "物理类",
        "sourcePageUrl": "https://eea.gd.gov.cn/ptgk/content/post_4746781.html",
        "linkText": "广东省2025年本科普通类（物理）投档情况",
        "targetDir": RAW_ROOT / "2025" / "physics",
    },
]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}


def fetch(url: str, referer: str | None = None) -> tuple[bytes, int, str]:
    headers = dict(HEADERS)
    if referer:
        headers["Referer"] = referer
    request = urllib.request.Request(url, headers=headers)
    last_error: Exception | None = None
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request, timeout=45) as response:
                return response.read(), response.status, response.headers.get("Content-Type", "")
        except Exception as exc:  # noqa: BLE001 - retry and report the final network error.
            last_error = exc
            time.sleep(1.5 * (attempt + 1))
    raise RuntimeError(f"failed to fetch {url}: {last_error}")


def decode_html(content: bytes) -> str:
    for encoding in ("utf-8", "gb18030", "gbk"):
        try:
            return content.decode(encoding)
        except UnicodeDecodeError:
            continue
    return content.decode("utf-8", errors="replace")


def page_title(html: str) -> str:
    match = re.search(r"<title>(.*?)</title>", html, flags=re.I | re.S)
    if not match:
        match = re.search(r"<h1[^>]*>(.*?)</h1>", html, flags=re.I | re.S)
    if not match:
        return ""
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", match.group(1))).strip()


def published_at(html: str) -> str:
    match = re.search(r"时间\s*[:：]\s*([0-9]{4}-[0-9]{2}-[0-9]{2}\s+[0-9]{2}:[0-9]{2}:[0-9]{2})", html)
    return match.group(1) if match else ""


def resolve_attachment(page_url: str, html: str, link_text: str) -> tuple[str, str]:
    anchor_pattern = re.compile(r"<a\b([^>]*)>(.*?)</a>", flags=re.I | re.S)
    best: tuple[str, str] | None = None
    for attrs, body in anchor_pattern.findall(html):
        text = re.sub(r"\s+", "", re.sub(r"<[^>]+>", "", body))
        if link_text not in text:
            continue
        href_match = re.search(r'href=["\']([^"\']+)["\']', attrs, flags=re.I)
        if not href_match:
            continue
        href = href_match.group(1).strip()
        url = urllib.parse.urljoin(page_url, href)
        best = (url, text)
        break
    if best is None:
        raise RuntimeError(f"attachment link not found: {link_text}")
    return best


def sha256_bytes(content: bytes) -> str:
    digest = hashlib.sha256()
    digest.update(content)
    return digest.hexdigest()


def validate_magic(path: Path, content: bytes) -> tuple[bool, str]:
    if content[:4] == b"PK\x03\x04":
        try:
            with zipfile.ZipFile(path) as archive:
                archive.testzip()
                names = archive.namelist()
            return True, f"zip:{len(names)} entries"
        except zipfile.BadZipFile as exc:
            return False, f"bad zip: {exc}"
    if content[:5] == b"%PDF-":
        return True, "pdf"
    if content[:16].lower().startswith(b"<!doctype html") or b"<html" in content[:500].lower():
        return False, "html error page"
    return False, "unknown magic"


def safe_filename(url: str, fallback: str) -> str:
    name = urllib.parse.unquote(Path(urllib.parse.urlparse(url).path).name)
    if not name:
        name = fallback
    return re.sub(r'[<>:"/\\|?*]', "_", name)


def main() -> int:
    MANIFEST_DIR.mkdir(parents=True, exist_ok=True)
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    logs: list[str] = []
    manifest: list[dict[str, object]] = []
    for source in SOURCES:
        page_url = source["sourcePageUrl"]
        page_content, page_status, page_type = fetch(page_url)
        html = decode_html(page_content)
        source_title = page_title(html)
        official_published_at = published_at(html)
        attachment_url, actual_text = resolve_attachment(page_url, html, source["linkText"])
        attachment_content, status, content_type = fetch(attachment_url, page_url)
        target_dir: Path = source["targetDir"]
        target_dir.mkdir(parents=True, exist_ok=True)
        filename = safe_filename(attachment_url, f"{source['admissionYear']}-{source['category']}")
        local_path = target_dir / filename
        tmp_path = local_path.with_suffix(local_path.suffix + ".tmp")
        tmp_path.write_bytes(attachment_content)
        ok_magic, magic_note = validate_magic(tmp_path, attachment_content)
        if ok_magic:
            tmp_path.replace(local_path)
        else:
            rejected = ROOT / "data" / "official" / "rejected" / filename
            rejected.parent.mkdir(parents=True, exist_ok=True)
            tmp_path.replace(rejected)
            local_path = rejected
        digest = sha256_bytes(attachment_content)
        hostname = urllib.parse.urlparse(attachment_url).hostname
        validation_status = "verified" if ok_magic and hostname == "eea.gd.gov.cn" and status == 200 else "rejected"
        entry = {
            "admissionYear": source["admissionYear"],
            "category": source["category"],
            "sourceOrganization": "广东省教育考试院",
            "sourcePageTitle": source_title,
            "sourcePageUrl": page_url,
            "sourcePageStatus": page_status,
            "sourcePageContentType": page_type,
            "sourceAttachmentUrl": attachment_url,
            "sourceAttachmentText": actual_text,
            "sourceAttachmentName": filename,
            "officialPublishedAt": official_published_at,
            "localPath": str(local_path.relative_to(ROOT)).replace("\\", "/"),
            "fileSize": len(attachment_content),
            "mimeType": content_type or mimetypes.guess_type(filename)[0] or "",
            "sha256": digest,
            "downloadedAt": datetime.now(timezone.utc).isoformat(),
            "validationStatus": validation_status,
            "validationNote": magic_note,
        }
        manifest.append(entry)
        logs.append(
            f"{entry['admissionYear']} {entry['category']} {status} {len(attachment_content)} "
            f"{digest} {attachment_url} {magic_note}"
        )
    (MANIFEST_DIR / "source-manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (LOG_DIR / "download.log").write_text("\n".join(logs) + "\n", encoding="utf-8")
    print(json.dumps({"sources": len(manifest), "manifest": "data/official/manifests/source-manifest.json"}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
