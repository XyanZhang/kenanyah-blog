# CHM to PDF Processing Flow

# CHM 转 PDF 处理流程

## 1. Goal

## 1. 目标

This tool converts a `.chm` help file into a `.pdf` file.

这个工具把 `.chm` 帮助文档转换成 `.pdf` 文件。

It works in two main steps:

主要分成两步：

1. Extract the CHM file into normal files.
2. Render the extracted HTML page into PDF.

1. 把 CHM 文件解包成普通文件。
2. 把解包后的 HTML 页面渲染成 PDF。

Vocabulary:

- `extract`: 解包，提取文件。
- `render`: 渲染，把页面生成成可见结果。

## 2. User Command

## 2. 用户命令

Example:

示例：

```bash
pnpm --filter chm-to-pdf dev -- ./book.chm -o ./book.pdf
```

After build:

构建后：

```bash
pnpm --filter chm-to-pdf build
pnpm --filter chm-to-pdf start -- ./book.chm -o ./book.pdf
```

The CLI entry file is:

CLI 入口文件是：

```text
apps/chm-to-pdf/src/index.ts
```

## 3. Argument Parsing

## 3. 参数解析

The tool first reads command line arguments.

工具首先读取命令行参数。

Supported options:

支持的参数：

```text
chm-to-pdf <input.chm> [options]

-o, --output <file>       Output PDF path.
--entry <file>            HTML entry file inside the extracted CHM.
--keep-temp               Keep extracted files for debugging.
--temp-dir <dir>          Directory used for extracted files.
--format <format>         PDF paper format. Default: A4.
--landscape               Print in landscape mode.
--margin <size>           PDF margin. Default: 12mm.
-h, --help                Show help.
```

If the user does not pass `--output`, the tool changes the input file extension to `.pdf`.

如果用户没有传 `--output`，工具会把输入文件的扩展名改成 `.pdf`。

Example:

示例：

```text
book.chm -> book.pdf
```

Vocabulary:

- `argument`: 参数。
- `extension`: 文件扩展名，比如 `.chm`、`.pdf`。

## 4. Input and Output Check

## 4. 输入和输出检查

Before doing real work, the tool checks that:

真正开始处理之前，工具会检查：

1. The input path exists.
2. The input path is a file.
3. The input file is readable.
4. The output directory exists, or can be created.

1. 输入路径存在。
2. 输入路径是文件。
3. 输入文件可以读取。
4. 输出目录存在，或者可以被创建。

If these checks fail, the tool stops early and prints an error.

如果检查失败，工具会提前停止并输出错误。

Vocabulary:

- `readable`: 可读取的。
- `directory`: 目录。

## 5. Temporary Directory

## 5. 临时目录

The CHM file must be extracted before it can be rendered.

CHM 文件必须先解包，才能被渲染。

The tool creates a temporary directory for extracted files.

工具会创建一个临时目录，用来存放解包后的文件。

Default path pattern:

默认路径形式：

```text
tmp/chm-to-pdf-xxxxxx
```

If the user passes `--temp-dir`, that directory is used instead.

如果用户传了 `--temp-dir`，工具会使用用户指定的目录。

If the user passes `--keep-temp`, the extracted files are kept after conversion.

如果用户传了 `--keep-temp`，转换结束后会保留解包文件。

This is useful for debugging.

这对排查问题很有用。

Vocabulary:

- `temporary`: 临时的。
- `debugging`: 调试，排查问题。

## 6. Extractor Detection

## 6. 解包工具检测

CHM is not a normal zip file.

CHM 不是普通的 zip 文件。

So the tool needs a system extractor.

所以工具需要依赖系统里的解包工具。

The tool tries these commands in order:

工具会按顺序尝试这些命令：

```text
7z
7zz
unar
```

If none of them exists, the tool stops and shows an install hint.

如果这些命令都不存在，工具会停止，并提示安装方式。

For macOS:

macOS：

```bash
brew install p7zip
```

For Ubuntu/Debian:

Ubuntu/Debian：

```bash
sudo apt-get install p7zip-full
```

Vocabulary:

- `detect`: 检测。
- `install hint`: 安装提示。

## 7. CHM Extraction

## 7. CHM 解包

After finding an extractor, the tool extracts the CHM file.

找到可用解包工具后，工具会解包 CHM 文件。

For `7z` or `7zz`, the command is like:

对于 `7z` 或 `7zz`，命令类似：

```bash
7z x -y -o<temp-dir> <input.chm>
```

For `unar`, the command is like:

对于 `unar`，命令类似：

```bash
unar -force-overwrite -output-directory <temp-dir> <input.chm>
```

If extraction fails, the tool stops.

如果解包失败，工具会停止。

Vocabulary:

- `overwrite`: 覆盖已有文件。
- `fail`: 失败。

## 8. Entry HTML Selection

## 8. 入口 HTML 选择

After extraction, the tool must choose one HTML file as the page to render.

解包之后，工具需要选择一个 HTML 文件作为渲染入口。

The selection order is:

选择顺序是：

1. Use `--entry` if the user passes it.
2. Read `.hhp` metadata and look for `Default topic`.
3. Look for common names like `index.html`, `index.htm`, `default.html`, `default.htm`, `home.html`, `home.htm`.
4. Use the first HTML file found.

1. 如果用户传了 `--entry`，优先使用它。
2. 读取 `.hhp` 元数据，查找 `Default topic`。
3. 查找常见文件名，比如 `index.html`、`index.htm`、`default.html`、`default.htm`、`home.html`、`home.htm`。
4. 使用找到的第一个 HTML 文件。

The tool also checks that `--entry` stays inside the extracted directory.

工具还会检查 `--entry` 必须位于解包目录内部。

This avoids reading unexpected files outside the CHM content.

这样可以避免读取 CHM 内容之外的意外文件。

Vocabulary:

- `entry`: 入口文件。
- `metadata`: 元数据，描述文件信息的数据。
- `unexpected`: 意外的。

## 9. PDF Rendering

## 9. PDF 渲染

The tool opens Chromium through Playwright.

工具通过 Playwright 打开 Chromium。

Then it loads the entry HTML as a local file URL.

然后把入口 HTML 作为本地文件 URL 加载。

Example:

示例：

```text
file:///.../tmp/chm-to-pdf-xxxxxx/index.html
```

After the page is loaded, the tool calls Playwright's PDF API.

页面加载完成后，工具调用 Playwright 的 PDF API。

Current PDF settings:

当前 PDF 设置：

```text
format: A4 by default
margin: 12mm by default
printBackground: true
landscape: false by default
```

Vocabulary:

- `Chromium`: Chrome 浏览器的开源核心。
- `API`: 程序接口，让代码调用某个功能。

## 10. Cleanup

## 10. 清理

After PDF creation, the tool removes the temporary directory by default.

PDF 创建完成后，工具默认删除临时目录。

If `--keep-temp` is used, the temporary directory is not removed.

如果使用了 `--keep-temp`，临时目录不会被删除。

This helps when the PDF result is wrong and you need to inspect the extracted HTML.

当 PDF 结果不对，需要检查解包后的 HTML 时，这会很有帮助。

Vocabulary:

- `cleanup`: 清理。
- `inspect`: 检查，查看细节。

## 11. Error Handling

## 11. 错误处理

The tool stops with a clear error message when:

遇到以下情况时，工具会停止，并输出清楚的错误信息：

1. The input file does not exist.
2. No extractor is installed.
3. Extraction fails.
4. No HTML file can be found.
5. Playwright cannot render the page.

1. 输入文件不存在。
2. 没有安装可用的解包工具。
3. 解包失败。
4. 找不到 HTML 文件。
5. Playwright 无法渲染页面。

The root cause is usually one of these:

常见根因通常是：

1. Missing system dependency, such as `7z`.
2. The CHM file is damaged or uses an unsupported format.
3. The CHM content has broken HTML or missing assets.
4. Chromium is not installed for Playwright.

1. 缺少系统依赖，比如 `7z`。
2. CHM 文件损坏，或者格式不被支持。
3. CHM 内容里的 HTML 损坏，或者资源缺失。
4. Playwright 没有安装 Chromium。

Vocabulary:

- `root cause`: 根本原因。
- `dependency`: 依赖项。
- `damaged`: 损坏的。

## 12. Full Flow Summary

## 12. 完整流程总结

Short version:

简短版本：

```text
User command
  -> parse arguments
  -> check input and output
  -> create temp directory
  -> find CHM extractor
  -> extract CHM
  -> choose entry HTML
  -> open Chromium with Playwright
  -> render PDF
  -> cleanup temp files
  -> print result
```

中文流程：

```text
用户命令
  -> 解析参数
  -> 检查输入和输出
  -> 创建临时目录
  -> 查找 CHM 解包工具
  -> 解包 CHM
  -> 选择入口 HTML
  -> 用 Playwright 打开 Chromium
  -> 渲染 PDF
  -> 清理临时文件
  -> 输出结果
```

## 13. Useful Debug Commands

## 13. 常用排查命令

Show help:

查看帮助：

```bash
pnpm --filter chm-to-pdf dev -- --help
```

Keep extracted files:

保留解包文件：

```bash
pnpm --filter chm-to-pdf dev -- ./book.chm -o ./book.pdf --keep-temp
```

Use a fixed temp directory:

使用固定临时目录：

```bash
pnpm --filter chm-to-pdf dev -- ./book.chm -o ./book.pdf --temp-dir ./tmp/book
```

Manually choose the entry file:

手动选择入口文件：

```bash
pnpm --filter chm-to-pdf dev -- ./book.chm -o ./book.pdf --entry index.html
```

Install Chromium for Playwright:

安装 Playwright 的 Chromium：

```bash
pnpm --filter chm-to-pdf exec playwright install chromium
```
