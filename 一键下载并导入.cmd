@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

title 粤志通 - 一键下载并导入

echo ========================================
echo   粤志通 — 一键下载并导入
echo ========================================
echo.
echo 本脚本将自动完成:
echo   1. 从广东省教育考试院下载4个官方文件
echo   2. 校验文件完整性
echo   3. 解析并导入正式数据库
echo   4. 运行数据校验和门禁
echo   5. 重新构建项目
echo.
echo 按任意键开始，或关闭窗口取消...
pause >nul
echo.

:: ===== 步骤1: PowerShell下载 =====
echo [步骤1/5] 下载官方文件...
echo.

set PS_SCRIPT=%~dp0scripts\download-official.ps1
if not exist "%PS_SCRIPT%" (
    echo [错误] 找不到下载脚本: %PS_SCRIPT%
    echo 请确认此CMD文件位于 yuezhitong 目录下
    pause
    exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PS_SCRIPT%"
if %ERRORLEVEL% neq 0 (
    echo.
    echo [错误] PowerShell下载脚本返回错误码 %ERRORLEVEL%
    echo 可能原因:
    echo   - 当前网络环境无法访问广东省教育考试院(eea.gd.gov.cn)
    echo   - 请确认在中国大陆网络环境中运行
    echo   - 或连接中国大陆VPN后重试
    echo.
    pause
    exit /b 1
)

:: ===== 步骤2: 检查下载结果 =====
echo.
echo [步骤2/5] 检查下载结果...
echo.

set BASE=%~dp0
set FILES_OK=1

call :check_file "%BASE%data\official\raw\2023\archive\4221648.zip" "2023年ZIP(物理+历史)"
call :check_file "%BASE%data\official\raw\2024\archive\4458330.zip" "2024年ZIP(物理+历史)"
call :check_file "%BASE%data\official\raw\2025\history\4746781.pdf" "2025年历史类PDF"
call :check_file "%BASE%data\official\raw\2025\physics\4746786.pdf" "2025年物理类PDF"

if %FILES_OK% neq 1 (
    echo.
    echo [错误] 部分文件下载失败或文件太小。
    echo 请检查网络连接后重新运行本脚本。
    pause
    exit /b 1
)

echo.
echo 所有4个文件下载成功且大小合理。

:: ===== 步骤3: 解析并导入 =====
echo.
echo [步骤3/5] 解析并导入正式数据库...
echo.

cd /d "%BASE%"
python scripts\importers\import-official.py
if %ERRORLEVEL% neq 0 (
    echo.
    echo [错误] 导入脚本失败
    pause
    exit /b 1
)

:: ===== 步骤4: 校验与门禁 =====
echo.
echo [步骤4/5] 数据校验与门禁测试...
echo.

python scripts\validate-official.py
if %ERRORLEVEL% neq 0 (
    echo.
    echo [警告] 部分校验未通过，但继续...
)

bash scripts\data-gate.sh
if %ERRORLEVEL% neq 0 (
    echo.
    echo [错误] 数据门禁未通过!
    echo 正式数据库可能存在演示数据或占位URL。
    pause
    exit /b 1
)

:: ===== 步骤5: 重新构建 =====
echo.
echo [步骤5/5] 重新构建项目...
echo.

call npx next build
if %ERRORLEVEL% neq 0 (
    echo.
    echo [错误] 构建失败
    pause
    exit /b 1
)

:: ===== 完成 =====
echo.
echo ========================================
echo   全部完成!
echo ========================================
echo.
echo 数据已导入 prisma\official.db
echo 启动开发服务器: npx next dev
echo.
echo 按任意键退出...
pause >nul
exit /b 0

:: ===== 子函数: 检查文件 =====
:check_file
if exist "%~1" (
    for %%A in ("%~1") do set FSIZE=%%~zA
    if !FSIZE! gtr 10240 (
        echo   [OK] %~2 - !FSIZE! bytes
        exit /b 0
    ) else (
        echo   [警告] %~2 - 仅 !FSIZE! bytes (可能为错误页)
        set FILES_OK=0
        exit /b 0
    )
) else (
    echo   [缺失] %~2 - 文件不存在: %~1
    set FILES_OK=0
    exit /b 0
)
