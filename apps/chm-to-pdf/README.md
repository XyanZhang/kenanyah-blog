# CHM to PDF

A small CLI tool that converts a `.chm` help file into a PDF.

## Requirements

- Node.js 20+
- pnpm 9+
- One CHM extractor:
  - macOS: `brew install p7zip`
  - Ubuntu/Debian: `sudo apt-get install p7zip-full`

The tool looks for `7z`, `7zz`, or `unar`.

## Install

From the repository root:

```bash
pnpm install
pnpm --filter chm-to-pdf exec playwright install chromium
```

## Usage

```bash
pnpm --filter chm-to-pdf dev -- ./book.chm -o ./book.pdf
```

By default, the tool renders all discovered HTML content pages and merges them into one PDF.

默认情况下，工具会渲染所有发现的 HTML 内容页，并合并成一个 PDF。

To render only one entry page:

如果只想渲染一个入口页：

```bash
pnpm --filter chm-to-pdf dev -- ./book.chm -o ./book.pdf --single
```

## Quick Script

## 快速脚本

Edit this file and fill in your own file paths:

编辑这个文件，填入你自己的文件路径：

```text
apps/chm-to-pdf/scripts/convert-example.sh
```

Then run from the repository root:

然后在仓库根目录运行：

```bash
pnpm --filter chm-to-pdf convert:example
```

You usually only need to change:

通常只需要修改：

```bash
INPUT_CHM="./book.chm"
OUTPUT_PDF="./book.pdf"
```

After building:

```bash
pnpm --filter chm-to-pdf build
pnpm --filter chm-to-pdf start -- ./book.chm -o ./book.pdf
```

## Options

```text
Usage:
  chm-to-pdf <input.chm> [options]

Options:
  -o, --output <file>       Output PDF path.
  --entry <file>            HTML entry file inside the extracted CHM.
  --single                  Render only one entry page instead of all HTML pages.
  --keep-temp               Keep extracted files for debugging.
  --temp-dir <dir>          Directory used for extracted files.
  --format <format>         PDF paper format. Default: A4.
  --landscape               Print in landscape mode.
  --margin <size>           PDF margin. Default: 12mm.
  -h, --help                Show help.
```

If `--entry` is not provided, the tool tries to find the CHM home page from `.hhp` metadata, then falls back to common names like `index.html`.
