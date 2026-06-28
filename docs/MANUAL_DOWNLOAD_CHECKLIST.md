# 粤志通 — 官方数据手动下载清单

生成时间: 2026-06-27（已修正）
注意: 广东省教育考试院官网 (eea.gd.gov.cn) 仅向中国大陆 IP 开放。  
你需要在本机（中国大陆网络环境）下载以下 4 个原始文件，然后放入指定目录。

## 下载清单

### 1. 2023年 ZIP（含物理类+历史类）

| 字段 | 内容 |
|------|------|
| 招生年份 | 2023 |
| 科类 | 物理类 + 历史类（同一ZIP） |
| 官方页面标题 | 我省2023年普通高考本科批次正式投档 |
| 官方页面地址 | https://eea.gd.gov.cn/ptgk/content/post_4221648.html |
| 附件名称 | 4221648.zip |
| 已确认附件地址 | https://eea.gd.gov.cn/attachment/0/526/526559/4221648.zip |
| 保存到 | `data/official/raw/2023/archive/` |
| 期望格式 | ZIP（内含 PDF 文件） |
| 下载后文件名 | `4221648.zip`（保留原始文件名，勿改名） |

**说明**: ZIP 中包含物理类和历史类各一个 PDF。解析器会自动根据 PDF 内部标题文字（非文件名排列顺序）识别科类。原始 ZIP 永久保留在 archive 目录，解压内容写入临时目录处理。

### 2. 2024年 ZIP（含物理类+历史类）

| 字段 | 内容 |
|------|------|
| 招生年份 | 2024 |
| 科类 | 物理类 + 历史类（同一ZIP） |
| 官方页面标题 | 我省2024年普通高考本科批次正式投档 |
| 官方页面地址 | https://eea.gd.gov.cn/gkmlpt/content/4/4458/mpost_4458330.html |
| 附件名称 | 4458330.zip |
| 已确认附件地址 | https://eea.gd.gov.cn/attachment/0/554/554636/4458330.zip |
| 保存到 | `data/official/raw/2024/archive/` |
| 期望格式 | ZIP（内含 PDF 文件） |
| 下载后文件名 | `4458330.zip`（保留原始文件名，勿改名） |

**说明**: ZIP 中包含物理类和历史类各一个 PDF。解析器会根据 PDF 内部标题文字识别科类。原始 ZIP 永久保留在 archive 目录。

### 3. 2025年 物理类 PDF

| 字段 | 内容 |
|------|------|
| 招生年份 | 2025 |
| 科类 | 物理类 |
| 官方页面标题 | 我省2025年普通高考本科批次正式投档 |
| 官方页面地址 | https://eea.gd.gov.cn/zwgk/sjfb/tjsj/content/post_4746786.html |
| 附件名称 | 4746786.pdf |
| 已确认附件地址 | https://eea.gd.gov.cn/attachment/0/585/585886/4746786.pdf |
| 保存到 | `data/official/raw/2025/physics/` |
| 期望格式 | PDF |
| 下载后文件名 | `4746786.pdf`（保留原始文件名，勿改名） |

### 4. 2025年 历史类 PDF

| 字段 | 内容 |
|------|------|
| 招生年份 | 2025 |
| 科类 | 历史类 |
| 官方页面标题 | 我省2025年普通高考本科批次正式投档 |
| 官方页面地址 | https://eea.gd.gov.cn/ptgk/content/post_4746781.html |
| 附件名称 | 4746781.pdf |
| 已确认附件地址 | https://eea.gd.gov.cn/attachment/0/585/585885/4746781.pdf |
| 保存到 | `data/official/raw/2025/history/` |
| 期望格式 | PDF |
| 下载后文件名 | `4746781.pdf`（保留原始文件名，勿改名） |

## 操作步骤

### 步骤 1：打开官方页面

| 年份 | 页面地址 |
|------|----------|
| 2023 | https://eea.gd.gov.cn/ptgk/content/post_4221648.html |
| 2024 | https://eea.gd.gov.cn/gkmlpt/content/4/4458/mpost_4458330.html |
| 2025(物理) | https://eea.gd.gov.cn/zwgk/sjfb/tjsj/content/post_4746786.html |
| 2025(历史) | https://eea.gd.gov.cn/ptgk/content/post_4746781.html |

### 步骤 2：下载附件

每个页面向下滚动到底部，找到附件下载链接，右键另存为。

注意：**保留原始文件名**（如 `4221648.zip`、`4458330.zip`、`4746786.pdf`、`4746781.pdf`）。不要修改文件名——文件名中的ID号用于追溯来源。

### 步骤 3：放入目录

```
yuezhitong/
  data/
    official/
      raw/
        2023/
          archive/    ← 4221648.zip（原始ZIP，永久保留）
          physics/    ← （空，无需手动放入）
          history/    ← （空，无需手动放入）
        2024/
          archive/    ← 4458330.zip（原始ZIP，永久保留）
          physics/    ← （空，无需手动放入）
          history/    ← （空，无需手动放入）
        2025/
          physics/    ← 4746786.pdf
          history/    ← 4746781.pdf
```

关键规则：
- **2023和2024**：各只有 Z一个原始 ZIP，放入各自 `archive/` 目录。ZIP 永久保留不删除。解析时由脚本将解压内容写入 `/tmp/` 临时目录，解析完成后自动清理临时文件。physics/ 和 history/ 目录为空，不需要手动放文件。
- **2025**：两个独立 PDF，分别放入 `physics/` 和 `history/` 目录。
- 科类识别方式：**根据 PDF 内部标题文字**识别"物理类"/"历史类"，不依赖文件名排列顺序或文件名中的科类字样。

### 步骤 4：运行导入

文件全部放入后，执行：

```bash
cd yuezhitong
python3 scripts/importers/import-official.py
```

导入脚本会对每个 ZIP 自动：
1. 解压到临时目录
2. 识别每个内部文件的格式（PDF/XLSX）
3. **读取 PDF 文档内部标题**确定科类（物理类/历史类）
4. 如果文档内容与文件名推断的科类不一致，以文档内容为准并记录警告
5. 解析表头并映射到统一字段
6. 运行字段级校验
7. 运行年份/科类/批次交叉校验
8. 插入 prisma/official.db

### 步骤 5：运行校验

```bash
python3 scripts/validate-official.py
```

### 步骤 6：运行门禁测试

```bash
bash scripts/data-gate.sh
```

### 步骤 7：重新构建

```bash
npx next build
```

## 预期结果

| 检查项 | 要求 |
|--------|------|
| 正式数据库演示数据 | 0 |
| 正式数据库占位URL | 0 |
| 18项校验 | 18/18 通过 |
| 生产构建 | 成功 |
| ALLOW_DEMO_DATA | false |

## 关键约束

- **没有官方原始文件就绝不导入任何记录**。不将演示数据放入正式数据库。
- **ZIP 永久保留在 archive 目录**。不删除、不移走。
- **科类根据 PDF 文档内部标题判定**，不根据文件在 ZIP 中的排列顺序推断。
- **解析失败的数据标注为 review-required**，不进入推荐池。
- **原始文件名的 ID 号不可修改**，用于追溯来源。
