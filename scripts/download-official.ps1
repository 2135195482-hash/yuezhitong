# 粤志通官方数据下载脚本
# 运行环境: Windows PowerShell (必须在广东省教育考试院可访问的网络环境中运行)
# 用法: 右键本文件 → "使用 PowerShell 运行"，或在 PowerShell 中执行:
#   powershell -ExecutionPolicy Bypass -File download-official.ps1

$ErrorActionPreference = "Continue"
$ProgressPreference = "SilentlyContinue"

$ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

$baseDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $baseDir) { $baseDir = Get-Location }

$files = @(
    @{
        Url     = "https://eea.gd.gov.cn/attachment/0/526/526559/4221648.zip"
        OutFile = "$baseDir\data\official\raw\2023\archive\4221648.zip"
        Ref     = "https://eea.gd.gov.cn/ptgk/content/post_4221648.html"
        Year    = "2023"
        Cat     = "物理类+历史类(ZIP)"
    },
    @{
        Url     = "https://eea.gd.gov.cn/attachment/0/554/554636/4458330.zip"
        OutFile = "$baseDir\data\official\raw\2024\archive\4458330.zip"
        Ref     = "https://eea.gd.gov.cn/gkmlpt/content/4/4458/mpost_4458330.html"
        Year    = "2024"
        Cat     = "物理类+历史类(ZIP)"
    },
    @{
        Url     = "https://eea.gd.gov.cn/attachment/0/585/585885/4746781.pdf"
        OutFile = "$baseDir\data\official\raw\2025\history\4746781.pdf"
        Ref     = "https://eea.gd.gov.cn/ptgk/content/post_4746781.html"
        Year    = "2025"
        Cat     = "历史类"
    },
    @{
        Url     = "https://eea.gd.gov.cn/attachment/0/585/585886/4746786.pdf"
        OutFile = "$baseDir\data\official\raw\2025\physics\4746786.pdf"
        Ref     = "https://eea.gd.gov.cn/zwgk/sjfb/tjsj/content/post_4746786.html"
        Year    = "2025"
        Cat     = "物理类"
    }
)

$results = @()
$total = $files.Count
$ok = 0

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  粤志通 — 官方数据下载脚本" -ForegroundColor Cyan
Write-Host "  共 $total 个文件" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

foreach ($f in $files) {
    Write-Host "[$($f.Year) $($f.Cat)]" -ForegroundColor Yellow
    Write-Host "  URL: $($f.Url)"
    Write-Host "  ->  $($f.OutFile)"

    $dir = Split-Path $f.OutFile -Parent
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
    }

    $result = @{
        Url = $f.Url
        OutFile = $f.OutFile
        Year = $f.Year
        Category = $f.Cat
        Status = "FAILED"
        Size = 0
        Error = ""
    }

    try {
        $headers = @{
            "User-Agent" = $ua
            "Referer" = $f.Ref
        }

        Invoke-WebRequest -Uri $f.Url -OutFile $f.OutFile `
            -Headers $headers -TimeoutSec 60 -MaximumRedirection 3 -UseBasicParsing

        if (Test-Path $f.OutFile) {
            $size = (Get-Item $f.OutFile).Length
            if ($size -gt 10000) {
                Write-Host "  OK: $size bytes" -ForegroundColor Green
                $result.Status = "OK"
                $result.Size = $size
                $ok++
            } else {
                Write-Host "  WARNING: 文件仅 $size bytes，可能为错误页" -ForegroundColor Red
                $result.Error = "Small file: $size bytes"
            }
        } else {
            Write-Host "  FAILED: 文件未创建" -ForegroundColor Red
            $result.Error = "File not created"
        }
    } catch {
        Write-Host "  FAILED: $_" -ForegroundColor Red
        $result.Error = $_.Exception.Message
    }

    $results += $result
    Write-Host ""
}

# 验证文件
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  验证结果" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$verified = 0
foreach ($r in $results) {
    if ($r.Status -eq "OK") {
        $f = Get-Item $r.OutFile
        $hash = (Get-FileHash -Path $r.OutFile -Algorithm SHA256).Hash
        $ext = [System.IO.Path]::GetExtension($r.OutFile).ToLower()

        Write-Host "[$($r.Year) $($r.Category)]" -ForegroundColor Green
        Write-Host "  路径: $($r.OutFile)"
        Write-Host "  大小: $($r.Size) bytes"
        Write-Host "  SHA256: $hash"
        Write-Host "  扩展名: $ext"

        # 基本类型检查
        if ($ext -eq '.pdf') {
            $bytes = [System.IO.File]::ReadAllBytes($r.OutFile)
            if ($bytes.Length -gt 4 -and $bytes[0] -eq 0x25 -and $bytes[1] -eq 0x50 -and $bytes[2] -eq 0x44 -and $bytes[3] -eq 0x46) {
                Write-Host "  PDF 魔数: 正确 (%PDF)"
                $verified++
            } else {
                Write-Host "  PDF 魔数: 错误!" -ForegroundColor Red
            }
        } elseif ($ext -eq '.zip') {
            $bytes = [System.IO.File]::ReadAllBytes($r.OutFile)
            if ($bytes.Length -gt 4 -and $bytes[0] -eq 0x50 -and $bytes[1] -eq 0x4B) {
                Write-Host "  ZIP 魔数: 正确 (PK)"
                $verified++
            } else {
                Write-Host "  ZIP 魔数: 错误!" -ForegroundColor Red
            }
        }
        Write-Host ""
    } else {
        Write-Host "[$($r.Year) $($r.Category)] FAILED: $($r.Error)" -ForegroundColor Red
        Write-Host ""
    }
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  下载成功: $ok / $total" -ForegroundColor $(if ($ok -eq $total) { "Green" } else { "Red" })
Write-Host "  验证通过: $verified / $ok" -ForegroundColor $(if ($verified -eq $ok) { "Green" } else { "Red" })
Write-Host "========================================" -ForegroundColor Cyan

if ($ok -eq $total -and $verified -eq $ok) {
    Write-Host ""
    Write-Host "所有文件下载并验证成功。" -ForegroundColor Green
    Write-Host "请在 Claude 对话中输入以下任意一条继续："
    Write-Host "  '文件已放入，继续解析导入'" -ForegroundColor Cyan
    Write-Host "  '继续导入'" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "部分文件下载失败。请检查网络连接后重试。" -ForegroundColor Red
    Write-Host "提示: 广东省教育考试院 (eea.gd.gov.cn) 仅接受中国大陆 IP 访问。"
    Write-Host "如果当前网络环境不在中国大陆，请连接 VPN 后重试。"
}

# 暂停(如果双击运行)
if ($Host.Name -match "ConsoleHost") {
    Write-Host "`n按任意键退出..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}
