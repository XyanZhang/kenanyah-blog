# CHM to PDF Technical Design

# CHM 转 PDF 技术方案与实现原理

## 1. Background

## 1. 背景

CHM means Compiled HTML Help.

CHM 是 Compiled HTML Help 的缩写，意思是“编译后的 HTML 帮助文档”。

It is not a normal PDF-like document. A CHM file usually contains many files:

它不是类似 PDF 的单一页面文档。一个 CHM 文件通常包含很多文件：

- HTML pages
- CSS files
- JavaScript files
- images
- table of contents files
- project metadata files

- HTML 页面
- CSS 文件
- JavaScript 文件
- 图片
- 目录文件
- 项目元数据文件

So the core idea is not “directly convert binary CHM to PDF”.

所以核心思路不是“直接把 CHM 二进制文件转换成 PDF”。

The real idea is:

真实思路是：

```text
CHM package
  -> extract to HTML assets
  -> find the main HTML entry
  -> render the HTML in a browser engine
  -> print the rendered page to PDF
```

```text
CHM 包
  -> 解包成 HTML 资源
  -> 找到主入口 HTML
  -> 用浏览器引擎渲染 HTML
  -> 把渲染结果打印成 PDF
```

Vocabulary:

- `compiled`: 编译后的。
- `metadata`: 元数据，描述文件结构或配置的数据。
- `render`: 渲染，把 HTML/CSS 变成可视页面。

## 2. Design Goal

## 2. 设计目标

The tool is designed as a small independent CLI subproject.

这个工具被设计成一个独立的小型 CLI 子项目。

Path:

路径：

```text
apps/chm-to-pdf
```

Main goals:

主要目标：

1. Keep it isolated from the blog API, admin app, and web app.
2. Make it easy to run from the monorepo.
3. Keep the implementation simple and maintainable.
4. Give clear error messages when system tools are missing.
5. Allow manual override when automatic entry detection is wrong.

1. 和博客 API、后台管理、前端页面隔离。
2. 可以在 monorepo 里方便运行。
3. 实现保持简单、可维护。
4. 系统工具缺失时给出清楚错误。
5. 自动入口识别不准时，允许用户手动指定。

Non-goals:

非目标：

1. It does not rebuild the full CHM navigation tree into a book.
2. It does not merge every HTML page into one long PDF yet.
3. It does not implement a CHM parser from scratch.

1. 目前不重建完整 CHM 导航树。
2. 目前不把所有 HTML 页面合并成长 PDF。
3. 目前不从零实现 CHM 解析器。

Vocabulary:

- `isolated`: 隔离的。
- `override`: 覆盖默认行为。
- `from scratch`: 从零开始。

## 3. High-Level Architecture

## 3. 高层架构

The current implementation is a single CLI entry file:

当前实现是一个 CLI 入口文件：

```text
apps/chm-to-pdf/src/index.ts
```

Although it is in one file, the logic is split into small functions by responsibility.

虽然现在放在一个文件里，但逻辑按职责拆成了多个小函数。

Main modules by responsibility:

按职责划分的主要模块：

```text
CLI layer
  parseArgs()

File validation layer
  assertReadableFile()
  ensureParentDirectory()
  assertPathInside()

Temporary workspace layer
  createTempDir()

Extractor layer
  findExtractor()
  commandExists()
  extractChm()
  runCommand()

Entry discovery layer
  resolveEntryFile()
  findMetadataEntry()
  parseDefaultTopic()
  findHtmlFiles()
  pickPreferredHtml()

PDF rendering layer
  renderPdf()
  loadEntry()

Error boundary
  main().catch(...)
```

```text
CLI 层
  parseArgs()

文件校验层
  assertReadableFile()
  ensureParentDirectory()
  assertPathInside()

临时工作区层
  createTempDir()

解包层
  findExtractor()
  commandExists()
  extractChm()
  runCommand()

入口发现层
  resolveEntryFile()
  findMetadataEntry()
  parseDefaultTopic()
  findHtmlFiles()
  pickPreferredHtml()

PDF 渲染层
  renderPdf()
  loadEntry()

错误边界
  main().catch(...)
```

This keeps each function focused on one job.

这样可以让每个函数只关注一个职责。

## 4. Why Use an External Extractor

## 4. 为什么使用外部解包工具

CHM is a binary container format.

CHM 是一种二进制容器格式。

Parsing it correctly needs support for its internal storage structure and compression method.

要正确解析它，需要支持内部存储结构和压缩方式。

Instead of writing a CHM parser ourselves, the tool delegates extraction to mature system tools:

本工具没有自己写 CHM 解析器，而是把解包工作交给成熟的系统工具：

```text
7z
7zz
unar
```

This design has three benefits:

这个设计有三个好处：

1. Lower implementation risk.
2. Better compatibility with real-world CHM files.
3. Easier maintenance.

1. 降低实现风险。
2. 对真实世界里的 CHM 文件兼容性更好。
3. 后续维护更简单。

Trade-off:

取舍：

The user must install at least one extractor.

用户必须安装至少一个解包工具。

This is why `findExtractor()` checks for available commands first and gives an install hint if none is found.

所以 `findExtractor()` 会先检测可用命令，如果都不存在，就给出安装提示。

Vocabulary:

- `container format`: 容器格式，一个文件里包含很多内部文件。
- `delegate`: 委托，把某个任务交给别的工具处理。
- `compatibility`: 兼容性。

## 5. Extraction Principle

## 5. 解包原理

The extraction step turns the CHM package into a normal directory.

解包步骤会把 CHM 包转换成一个普通目录。

Example before extraction:

解包前示例：

```text
book.chm
```

Example after extraction:

解包后示例：

```text
tmp/chm-to-pdf-abc123/
  index.html
  intro.html
  chapter1.html
  styles/main.css
  images/logo.png
  book.hhp
  book.hhc
```

The tool does not manually inspect the CHM binary bytes.

工具不会手动分析 CHM 的二进制字节。

It runs a subprocess:

它会启动一个子进程：

```text
spawn(command, args, { stdio: 'inherit' })
```

Reason:

原因：

1. The external extractor can stream progress and errors directly to the terminal.
2. The Node process only needs to check the exit code.
3. The CLI behavior is easier to understand.

1. 外部解包工具可以直接把进度和错误输出到终端。
2. Node 进程只需要检查退出码。
3. CLI 行为更容易理解。

If the exit code is not `0`, extraction is treated as failed.

如果退出码不是 `0`，就认为解包失败。

Vocabulary:

- `subprocess`: 子进程。
- `exit code`: 退出码，`0` 通常表示成功。
- `stream`: 流式输出。

## 6. Entry HTML Discovery

## 6. 入口 HTML 发现机制

After extraction, the tool needs to decide which HTML page should be printed.

解包后，工具要决定应该把哪个 HTML 页面打印成 PDF。

This is important because a CHM file can contain many HTML pages.

这很重要，因为一个 CHM 文件可能包含很多 HTML 页面。

The current strategy is a priority chain:

当前策略是优先级链：

```text
1. User-provided --entry
2. Default topic in .hhp metadata
3. Common home page names
4. First HTML file
```

```text
1. 用户传入的 --entry
2. .hhp 元数据里的 Default topic
3. 常见首页文件名
4. 第一个 HTML 文件
```

### 6.1 User-Provided Entry

### 6.1 用户指定入口

If the user passes:

如果用户传入：

```bash
--entry index.html
```

The tool resolves it inside the extracted directory.

工具会在解包目录内部解析这个路径。

Security check:

安全检查：

```text
assertPathInside(rootDir, entryPath)
```

This prevents paths like:

这会防止类似路径：

```text
../../some-private-file.html
```

Reason:

原因：

The entry should only come from extracted CHM content.

入口文件应该只能来自解包后的 CHM 内容。

### 6.2 HHP Default Topic

### 6.2 HHP 默认主题

Many CHM files include an `.hhp` file.

很多 CHM 文件会包含 `.hhp` 文件。

The `.hhp` file can contain:

`.hhp` 文件可能包含：

```text
Default topic=index.html
```

The tool reads `.hhp` files and extracts this value with:

工具会读取 `.hhp` 文件，并用下面逻辑提取这个值：

```text
parseDefaultTopic()
```

This is usually the most accurate automatic entry.

这通常是最准确的自动入口。

### 6.3 Common Home Page Names

### 6.3 常见首页文件名

If `.hhp` metadata is missing or invalid, the tool searches for common names:

如果 `.hhp` 元数据缺失或无效，工具会查找常见首页名：

```text
index.html
index.htm
default.html
default.htm
home.html
home.htm
```

### 6.4 First HTML Fallback

### 6.4 第一个 HTML 兜底

If no preferred file is found, the tool uses the first HTML file found by directory traversal.

如果找不到优先文件，工具会使用目录遍历找到的第一个 HTML 文件。

This is not perfect, but it gives a useful fallback.

这不是完美方案，但能提供一个可用的兜底。

Vocabulary:

- `priority chain`: 优先级链。
- `fallback`: 兜底方案。
- `directory traversal`: 目录遍历。

## 7. Rendering Principle

## 7. 渲染原理

After the entry HTML is selected, the tool uses Playwright.

选好入口 HTML 后，工具使用 Playwright。

Playwright starts Chromium:

Playwright 会启动 Chromium：

```text
chromium.launch()
```

Then the tool creates a page:

然后工具创建一个页面：

```text
browser.newPage()
```

Then it loads the local HTML file:

然后加载本地 HTML 文件：

```text
page.goto(fileUrl, { waitUntil: 'networkidle' })
```

The `fileUrl` is generated from the local path:

`fileUrl` 由本地路径生成：

```text
pathToFileURL(entryFile).href
```

Example:

示例：

```text
/tmp/chm-to-pdf-abc123/index.html
-> file:///tmp/chm-to-pdf-abc123/index.html
```

Why use a browser engine:

为什么使用浏览器引擎：

1. CHM content is usually HTML/CSS.
2. Browser rendering handles layout better than manual HTML parsing.
3. CSS, images, and relative links can work naturally after extraction.
4. Chromium has a built-in print-to-PDF feature.

1. CHM 内容通常是 HTML/CSS。
2. 浏览器渲染比手动解析 HTML 更能正确处理布局。
3. 解包后 CSS、图片、相对路径通常可以自然工作。
4. Chromium 内置打印为 PDF 的能力。

Vocabulary:

- `browser engine`: 浏览器引擎。
- `layout`: 布局。
- `relative link`: 相对链接。

## 8. PDF Generation Principle

## 8. PDF 生成原理

PDF generation uses Playwright's `page.pdf()` API.

PDF 生成使用 Playwright 的 `page.pdf()` API。

Current settings:

当前设置：

```text
path: outputFile
format: A4 by default
landscape: false by default
printBackground: true
margin: 12mm by default
```

Important setting:

重要设置：

```text
printBackground: true
```

Reason:

原因：

Without this, background colors and background images may be missing in the PDF.

如果没有这个设置，PDF 里可能缺少背景颜色和背景图片。

The PDF output is based on the final rendered page, not raw HTML text.

PDF 输出基于最终渲染后的页面，而不是原始 HTML 文本。

This means CSS layout and images affect the final result.

这意味着 CSS 布局和图片会影响最终结果。

Vocabulary:

- `raw`: 原始的。
- `background`: 背景。

## 9. Temporary File Strategy

## 9. 临时文件策略

By default, extracted files are removed after conversion.

默认情况下，转换结束后会删除解包文件。

This keeps the workspace clean.

这样可以保持工作区干净。

But if the user passes:

但如果用户传入：

```bash
--keep-temp
```

The temporary files are kept.

临时文件会被保留。

This is useful when:

这适用于：

1. The PDF is blank.
2. Images are missing.
3. The wrong page was selected.
4. CSS layout looks broken.

1. PDF 是空白的。
2. 图片缺失。
3. 选错了入口页面。
4. CSS 布局异常。

Then the user can open the extracted HTML directly in a browser.

然后用户可以直接用浏览器打开解包后的 HTML。

## 10. Error Handling Strategy

## 10. 错误处理策略

The CLI has one top-level error boundary:

CLI 有一个顶层错误边界：

```text
main().catch(...)
```

Any error thrown inside the flow is caught there.

流程中的任何错误都会在那里被捕获。

The tool prints:

工具会输出：

```text
Error: <message>
```

Then it exits with code `1`.

然后以退出码 `1` 结束。

Common error cases:

常见错误场景：

```text
Input file cannot be read
No extractor is installed
Extraction command exits with non-zero code
No HTML file is found
Chromium cannot start
Playwright cannot render PDF
```

```text
输入文件无法读取
没有安装解包工具
解包命令返回非 0 退出码
找不到 HTML 文件
Chromium 无法启动
Playwright 无法渲染 PDF
```

This strategy keeps the CLI simple.

这种策略让 CLI 保持简单。

For future API usage, errors can be changed to typed errors.

如果未来要作为 API 使用，可以改成类型化错误。

Vocabulary:

- `error boundary`: 错误边界，统一捕获错误的地方。
- `typed error`: 类型化错误，可以区分错误种类的错误对象。

## 11. Current Limitations

## 11. 当前限制

The current implementation renders one selected HTML entry.

当前实现只渲染一个选中的 HTML 入口。

This works for CHM files where the entry page contains the main content.

如果 CHM 的入口页包含主要内容，这种方式效果较好。

But some CHM files are structured like a book:

但有些 CHM 文件像一本书一样组织：

```text
index.html
chapter1.html
chapter2.html
chapter3.html
```

For those files, rendering only `index.html` may not include all chapters.

对这类文件，只渲染 `index.html` 可能不会包含全部章节。

Other limitations:

其它限制：

1. It does not parse `.hhc` table of contents yet.
2. It does not merge multiple HTML files yet.
3. It does not rewrite broken resource paths.
4. It does not handle old IE-only scripts specially.

1. 还没有解析 `.hhc` 目录文件。
2. 还没有合并多个 HTML 文件。
3. 还没有重写损坏的资源路径。
4. 还没有特殊处理旧 IE 专用脚本。

Vocabulary:

- `limitation`: 限制。
- `table of contents`: 目录。
- `merge`: 合并。

## 12. Future Extension Plan

## 12. 后续扩展方案

### 12.1 Multi-page PDF

### 12.1 多页面 PDF

Future version can parse `.hhc` files to get the chapter order.

未来版本可以解析 `.hhc` 文件，获取章节顺序。

Then it can render each chapter and merge PDFs.

然后逐章渲染，再合并 PDF。

Possible flow:

可能流程：

```text
extract CHM
  -> parse .hhc table of contents
  -> build ordered HTML list
  -> render each HTML to PDF
  -> merge PDFs
```

```text
解包 CHM
  -> 解析 .hhc 目录
  -> 构建有序 HTML 列表
  -> 每个 HTML 渲染成 PDF
  -> 合并 PDF
```

### 12.2 HTML Preprocessing

### 12.2 HTML 预处理

Some CHM files may use old HTML patterns.

有些 CHM 文件可能使用很旧的 HTML 写法。

Future preprocessing can:

未来预处理可以：

1. Fix charset.
2. Inject print CSS.
3. Remove scripts that block rendering.
4. Rewrite broken local paths.

1. 修复字符编码。
2. 注入打印 CSS。
3. 移除阻塞渲染的脚本。
4. 重写损坏的本地路径。

### 12.3 Better CLI Reports

### 12.3 更好的 CLI 报告

Future version can print:

未来版本可以输出：

1. Extracted file count.
2. Selected entry reason.
3. Missing asset warnings.
4. Render time.

1. 解包文件数量。
2. 入口选择原因。
3. 资源缺失警告。
4. 渲染耗时。

## 13. Root Cause Notes from Implementation

## 13. 实现过程中遇到的根因说明

Two technical issues were found during implementation.

实现过程中发现了两个技术问题。

### 13.1 Workspace Dependency Link

### 13.1 Workspace 依赖链接

After adding a new workspace package, `pnpm install` is needed.

新增 workspace 包之后，需要运行 `pnpm install`。

Root cause:

根因：

The new package needs its own `node_modules` links inside the pnpm workspace.

新包需要 pnpm workspace 为它创建自己的 `node_modules` 链接。

Without that, TypeScript cannot find dependencies like `playwright`.

否则 TypeScript 找不到 `playwright` 这样的依赖。

### 13.2 TypeScript Emit Configuration

### 13.2 TypeScript 输出配置

The shared TypeScript base config has:

共享 TypeScript 基础配置里有：

```json
{
  "noEmit": true
}
```

Root cause:

根因：

This is good for type-checking packages, but a CLI package needs real JavaScript output.

这对只做类型检查的包很好，但 CLI 包需要真实输出 JavaScript 文件。

Fix:

修复：

```json
{
  "noEmit": false,
  "module": "CommonJS",
  "moduleResolution": "node"
}
```

The package also avoids `"type": "module"` because the build output is CommonJS.

这个包也没有使用 `"type": "module"`，因为构建输出是 CommonJS。

Vocabulary:

- `emit`: 输出编译产物。
- `CommonJS`: Node.js 传统模块格式。

## 14. Summary

## 14. 总结

The implementation is based on a practical conversion pipeline.

这个实现基于一条务实的转换流水线。

It does not try to understand every detail of CHM internally.

它不尝试在内部理解 CHM 的所有细节。

Instead, it uses mature tools for extraction and a real browser engine for rendering.

而是使用成熟工具做解包，并使用真实浏览器引擎做渲染。

This makes the first version small, reliable, and easy to extend.

这让第一版更小、更可靠，也更容易扩展。
