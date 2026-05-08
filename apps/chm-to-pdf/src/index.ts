#!/usr/bin/env node

import { chromium, type Browser, type Page } from 'playwright';
import { spawn } from 'node:child_process';
import { constants as fsConstants } from 'node:fs';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

type PdfOptions = {
  format: string;
  landscape: boolean;
  margin: string;
};

type CliOptions = {
  input: string;
  output: string;
  entry?: string;
  singlePage: boolean;
  keepTemp: boolean;
  tempDir?: string;
  pdf: PdfOptions;
};

type Extractor = {
  command: string;
  args: (input: string, outputDir: string) => string[];
};

const HELP = `Usage:
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
`;

const EXTRACTORS: Extractor[] = [
  {
    command: '7z',
    args: (input, outputDir) => ['x', '-y', `-o${outputDir}`, input],
  },
  {
    command: '7zz',
    args: (input, outputDir) => ['x', '-y', `-o${outputDir}`, input],
  },
  {
    command: 'unar',
    args: (input, outputDir) => ['-force-overwrite', '-output-directory', outputDir, input],
  },
];

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  await assertReadableFile(options.input);
  await ensureParentDirectory(options.output);

  const tempDir = await createTempDir(options.tempDir);

  try {
    const extractor = await findExtractor();
    console.log(`Extracting CHM with ${extractor.command}...`);
    await extractChm(extractor, options.input, tempDir);

    if (options.singlePage || options.entry) {
      const entry = await resolveEntryFile(tempDir, options.entry);
      console.log(`Rendering ${path.relative(tempDir, entry)}...`);
      await renderPdf(entry, options.output, options.pdf);
    } else {
      const entries = await resolveEntryFiles(tempDir);
      console.log(`Rendering ${entries.length} HTML pages...`);
      await renderMultiPagePdf(entries, options.output, options.pdf, tempDir);
    }

    console.log(`PDF created: ${options.output}`);
    if (options.keepTemp) {
      console.log(`Extracted files kept at: ${tempDir}`);
    }
  } finally {
    if (!options.keepTemp) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  }
}

function parseArgs(args: string[]): CliOptions {
  if (args[0] === '--') {
    args = args.slice(1);
  }

  if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
    console.log(HELP);
    process.exit(args.length === 0 ? 1 : 0);
  }

  let input = '';
  let output = '';
  let entry: string | undefined;
  let tempDir: string | undefined;
  let singlePage = false;
  let keepTemp = false;
  let format = 'A4';
  let landscape = false;
  let margin = '12mm';

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === '-o' || arg === '--output') {
      output = readOptionValue(args, (i += 1), arg);
    } else if (arg === '--entry') {
      entry = readOptionValue(args, (i += 1), arg);
    } else if (arg === '--single') {
      singlePage = true;
    } else if (arg === '--temp-dir') {
      tempDir = readOptionValue(args, (i += 1), arg);
    } else if (arg === '--format') {
      format = readOptionValue(args, (i += 1), arg);
    } else if (arg === '--margin') {
      margin = readOptionValue(args, (i += 1), arg);
    } else if (arg === '--keep-temp') {
      keepTemp = true;
    } else if (arg === '--landscape') {
      landscape = true;
    } else if (arg.startsWith('-')) {
      throw new Error(`Unknown option: ${arg}`);
    } else if (!input) {
      input = arg;
    } else {
      throw new Error(`Unexpected argument: ${arg}`);
    }
  }

  if (!input) {
    throw new Error('Missing input CHM file.');
  }

  const baseDir = process.env.INIT_CWD ? path.resolve(process.env.INIT_CWD) : process.cwd();
  const absoluteInput = resolveUserPath(input, baseDir);
  const absoluteOutput = resolveUserPath(output || replaceExtension(input, '.pdf'), baseDir);

  return {
    input: absoluteInput,
    output: absoluteOutput,
    entry,
    singlePage,
    keepTemp,
    tempDir: tempDir ? path.resolve(tempDir) : undefined,
    pdf: { format, landscape, margin },
  };
}

function readOptionValue(args: string[], index: number, option: string): string {
  const value = args[index];

  if (!value || value.startsWith('-')) {
    throw new Error(`Missing value for ${option}.`);
  }

  return value;
}

function replaceExtension(filePath: string, extension: string): string {
  const parsed = path.parse(filePath);
  return path.join(parsed.dir, `${parsed.name}${extension}`);
}

function resolveUserPath(filePath: string, baseDir: string): string {
  return path.isAbsolute(filePath) ? filePath : path.resolve(baseDir, filePath);
}

async function assertReadableFile(filePath: string): Promise<void> {
  await fs.access(filePath, fsConstants.R_OK);

  const stat = await fs.stat(filePath);
  if (!stat.isFile()) {
    throw new Error(`Input is not a file: ${filePath}`);
  }
}

async function ensureParentDirectory(filePath: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function createTempDir(preferredDir?: string): Promise<string> {
  if (preferredDir) {
    await fs.rm(preferredDir, { recursive: true, force: true });
    await fs.mkdir(preferredDir, { recursive: true });
    return preferredDir;
  }

  const tempRoot = path.join(process.cwd(), 'tmp');
  await fs.mkdir(tempRoot, { recursive: true });
  return fs.mkdtemp(path.join(tempRoot, 'chm-to-pdf-'));
}

async function findExtractor(): Promise<Extractor> {
  for (const extractor of EXTRACTORS) {
    if (await commandExists(extractor.command)) {
      return extractor;
    }
  }

  throw new Error(
    'No CHM extractor found. Install one first: macOS `brew install p7zip`, Ubuntu/Debian `sudo apt-get install p7zip-full`.',
  );
}

function commandExists(command: string): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn(command, ['--help'], { stdio: 'ignore' });
    child.on('error', () => resolve(false));
    child.on('close', () => resolve(true));
  });
}

async function extractChm(extractor: Extractor, input: string, outputDir: string): Promise<void> {
  await runCommand(extractor.command, extractor.args(input, outputDir));
}

function runCommand(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit' });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} exited with code ${code ?? 'unknown'}.`));
      }
    });
  });
}

async function resolveEntryFile(rootDir: string, requestedEntry?: string): Promise<string> {
  if (requestedEntry) {
    const entryPath = path.resolve(rootDir, requestedEntry);
    await assertPathInside(rootDir, entryPath);
    await assertReadableFile(entryPath);
    return entryPath;
  }

  const metadataEntry = await findMetadataEntry(rootDir);
  if (metadataEntry) {
    return metadataEntry;
  }

  const htmlFiles = await findHtmlFiles(rootDir);
  const preferred = pickPreferredHtml(htmlFiles);

  if (!preferred) {
    throw new Error('No HTML entry file found in extracted CHM contents.');
  }

  return preferred;
}

async function resolveEntryFiles(rootDir: string): Promise<string[]> {
  const tocEntries = await findTableOfContentsEntries(rootDir);
  if (tocEntries.length > 0) {
    return tocEntries;
  }

  const htmlFiles = await findHtmlFiles(rootDir);
  const contentFiles = htmlFiles.filter(isContentHtmlFile);
  const entries = contentFiles.length > 0 ? contentFiles : htmlFiles;

  if (entries.length === 0) {
    throw new Error('No HTML files found in extracted CHM contents.');
  }

  return sortHtmlEntries(entries);
}

async function assertPathInside(rootDir: string, targetPath: string): Promise<void> {
  const relative = path.relative(rootDir, targetPath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Entry file must be inside extracted CHM contents: ${targetPath}`);
  }
}

async function findMetadataEntry(rootDir: string): Promise<string | undefined> {
  const hhpFiles = await findFilesByExtension(rootDir, new Set(['.hhp']));

  for (const hhpFile of hhpFiles) {
    const content = await fs.readFile(hhpFile, 'utf8');
    const defaultTopic = parseDefaultTopic(content);

    if (!defaultTopic) {
      continue;
    }

    const candidate = path.resolve(path.dirname(hhpFile), defaultTopic);
    if (await isReadableFile(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

async function findTableOfContentsEntries(rootDir: string): Promise<string[]> {
  const hhcFiles = await findFilesByExtension(rootDir, new Set(['.hhc']));
  const seen = new Set<string>();
  const entries: string[] = [];

  for (const hhcFile of hhcFiles) {
    const content = await fs.readFile(hhcFile, 'utf8');
    const localPaths = parseTocLocalPaths(content);

    for (const localPath of localPaths) {
      const candidate = path.resolve(path.dirname(hhcFile), localPath);
      if (!(await isReadableFile(candidate))) {
        continue;
      }

      const normalized = path.normalize(candidate);
      if (!seen.has(normalized)) {
        seen.add(normalized);
        entries.push(candidate);
      }
    }
  }

  return entries;
}

function parseTocLocalPaths(content: string): string[] {
  const localPaths: string[] = [];
  const regex = /<param\s+name=["']?Local["']?\s+value=["']([^"']+)["'][^>]*>/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    const value = match[1]?.trim();
    if (value && isHtmlPath(value)) {
      localPaths.push(value);
    }
  }

  return localPaths;
}

function parseDefaultTopic(content: string): string | undefined {
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*Default topic\s*=\s*(.+?)\s*$/i);
    if (match?.[1]) {
      return match[1].replace(/^["']|["']$/g, '');
    }
  }

  return undefined;
}

function isContentHtmlFile(filePath: string): boolean {
  const name = path.basename(filePath).toLowerCase();
  return name !== 'index.htm' && name !== 'index.html' && name !== 'default.htm' && name !== 'default.html';
}

function sortHtmlEntries(entries: string[]): string[] {
  return [...entries].sort((left, right) =>
    left.localeCompare(right, 'zh-Hans-CN', {
      numeric: true,
      sensitivity: 'base',
    }),
  );
}

function isHtmlPath(filePath: string): boolean {
  return ['.htm', '.html', '.xhtml'].includes(path.extname(filePath).toLowerCase());
}

async function findHtmlFiles(rootDir: string): Promise<string[]> {
  return findFilesByExtension(rootDir, new Set(['.htm', '.html', '.xhtml']));
}

async function findFilesByExtension(rootDir: string, extensions: Set<string>): Promise<string[]> {
  const results: string[] = [];

  async function walk(currentDir: string): Promise<void> {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile() && extensions.has(path.extname(entry.name).toLowerCase())) {
        results.push(fullPath);
      }
    }
  }

  await walk(rootDir);
  return results.sort();
}

function pickPreferredHtml(htmlFiles: string[]): string | undefined {
  const preferredNames = ['index.html', 'index.htm', 'default.html', 'default.htm', 'home.html', 'home.htm'];

  return (
    htmlFiles.find((file) => preferredNames.includes(path.basename(file).toLowerCase())) ?? htmlFiles[0]
  );
}

async function isReadableFile(filePath: string): Promise<boolean> {
  try {
    await assertReadableFile(filePath);
    return true;
  } catch {
    return false;
  }
}

async function renderMultiPagePdf(
  entryFiles: string[],
  outputFile: string,
  options: PdfOptions,
  tempDir: string,
): Promise<void> {
  let browser: Browser | undefined;

  try {
    browser = await launchBrowser();
    const combinedHtml = await buildCombinedHtml(entryFiles, tempDir, browser);
    const page = await browser.newPage();
    await renderPageToPdf(page, combinedHtml, outputFile, options);
  } finally {
    await browser?.close();
  }
}

async function buildCombinedHtml(entryFiles: string[], tempDir: string, browser: Browser): Promise<string> {
  const page = await browser.newPage();
  const sections: string[] = [];
  const styles: string[] = [];

  try {
    for (let index = 0; index < entryFiles.length; index += 1) {
      const entryFile = entryFiles[index];
      console.log(`[${index + 1}/${entryFiles.length}] ${path.relative(tempDir, entryFile)}`);

      const snapshot = await renderHtmlSnapshot(page, entryFile);
      styles.push(...snapshot.styles);
      sections.push(buildSection(snapshot, entryFile));
    }
  } finally {
    await page.close();
  }

  const combinedHtml = [
    '<!doctype html>',
    '<html>',
    '<head>',
    '<meta charset="utf-8">',
    '<style>',
    'body { margin: 0; }',
    '.chm-page { break-after: page; page-break-after: always; }',
    '.chm-page:last-child { break-after: auto; page-break-after: auto; }',
    'img { max-width: 100%; }',
    '</style>',
    ...dedupe(styles),
    '</head>',
    '<body>',
    ...sections,
    '</body>',
    '</html>',
  ].join('\n');

  const outputFile = path.join(tempDir, 'combined.html');
  await fs.writeFile(outputFile, combinedHtml, 'utf8');
  return outputFile;
}

type HtmlSnapshot = {
  title?: string;
  bodyHtml: string;
  styles: string[];
  bodyBackground?: string;
  bodyColor?: string;
};

async function renderHtmlSnapshot(page: Page, entryFile: string): Promise<HtmlSnapshot> {
  await loadEntry(page, entryFile);
  await page.waitForTimeout(100);

  return page.evaluate(`(() => {
    const absoluteUrl = (value, base) => {
      try {
        return new URL(value, base).href;
      } catch {
        return value;
      }
    };

    document.querySelectorAll('[src]').forEach((node) => {
      const element = node;
      const value = element.getAttribute('src');
      if (value && !value.startsWith('#')) {
        element.setAttribute('src', absoluteUrl(value, document.location.href));
      }
    });

    document.querySelectorAll('[href]').forEach((node) => {
      const element = node;
      const value = element.getAttribute('href');
      if (value && !value.startsWith('#')) {
        element.setAttribute('href', absoluteUrl(value, document.location.href));
      }
    });

    document.querySelectorAll('script').forEach((script) => script.remove());

    const styles = Array.from(document.querySelectorAll('style, link[rel~="stylesheet"]')).map((node) => {
      if (node instanceof HTMLLinkElement) {
        const href = node.getAttribute('href');
        if (href) {
          node.setAttribute('href', absoluteUrl(href, document.location.href));
        }
      }

      return node.outerHTML;
    });

    return {
      title: document.title || undefined,
      bodyHtml: document.body?.innerHTML ?? '',
      styles,
      bodyBackground: document.body?.getAttribute('background')
        ? absoluteUrl(document.body.getAttribute('background'), document.location.href)
        : undefined,
      bodyColor: document.body?.getAttribute('bgcolor') ?? undefined,
    };
  })()`) as Promise<HtmlSnapshot>;
}

function buildSection(snapshot: HtmlSnapshot, entryFile: string): string {
  const title = snapshot.title ?? path.basename(entryFile);
  const sectionStyle = buildSectionStyle(snapshot);

  return [
    `<section class="chm-page" data-source="${escapeHtmlAttribute(entryFile)}"${sectionStyle}>`,
    `<h1>${escapeHtml(title)}</h1>`,
    snapshot.bodyHtml,
    '</section>',
  ].join('\n');
}

function buildSectionStyle(snapshot: HtmlSnapshot): string {
  const styles: string[] = [];

  if (snapshot.bodyBackground) {
    styles.push(`background-image: url("${escapeHtmlAttribute(snapshot.bodyBackground)}")`);
  }

  if (snapshot.bodyColor) {
    styles.push(`background-color: ${snapshot.bodyColor}`);
  }

  return styles.length > 0 ? ` style="${styles.join('; ')}"` : '';
}

function dedupe(values: string[]): string[] {
  return [...new Set(values)];
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeHtmlAttribute(value: string): string {
  return escapeHtml(value);
}

async function renderPdf(entryFile: string, outputFile: string, options: PdfOptions): Promise<void> {
  let browser: Browser | undefined;

  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    await renderPageToPdf(page, entryFile, outputFile, options);
  } finally {
    await browser?.close();
  }
}

async function renderPageToPdf(
  page: Page,
  entryFile: string,
  outputFile: string,
  options: PdfOptions,
): Promise<void> {
  await loadEntry(page, entryFile);
  await page.pdf({
    path: outputFile,
    format: options.format,
    landscape: options.landscape,
    printBackground: true,
    margin: {
      top: options.margin,
      right: options.margin,
      bottom: options.margin,
      left: options.margin,
    },
  });
}

async function launchBrowser(): Promise<Browser> {
  try {
    return await chromium.launch();
  } catch (error) {
    const chromePath = await findSystemChrome();
    if (!chromePath) {
      throw error;
    }

    console.warn(`Playwright Chromium is not installed. Falling back to system Chrome: ${chromePath}`);
    return chromium.launch({ executablePath: chromePath });
  }
}

async function findSystemChrome(): Promise<string | undefined> {
  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  ];

  for (const candidate of candidates) {
    if (await isReadableFile(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

async function loadEntry(page: Page, entryFile: string): Promise<void> {
  await page.goto(pathToFileURL(entryFile).href, {
    waitUntil: 'networkidle',
  });
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  process.exit(1);
});
