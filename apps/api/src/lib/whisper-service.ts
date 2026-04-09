/**
 * 语音识别服务：使用 nodejs-whisper 进行本地语音转文本
 */
import { execSync } from 'node:child_process'
import { existsSync, realpathSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { nodewhisper } from 'nodejs-whisper'
import { logger } from './logger'
import { normalizeWhisperTranscript } from './whisper-transcript'

const require = createRequire(import.meta.url)

/** 检查 ffmpeg 是否已安装 */
function checkFfmpeg(): boolean {
  try {
    execSync('which ffmpeg', { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

/** 检查 cmake 是否已安装（nodejs-whisper 需用它构建 whisper-cli） */
function checkCmake(): boolean {
  try {
    execSync('which cmake', { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

/** Whisper 模型列表 */
const MODELS_LIST = [
  'tiny',
  'tiny.en',
  'base',
  'base.en',
  'small',
  'small.en',
  'medium',
  'medium.en',
  'large-v1',
  'large',
  'large-v3-turbo',
]

/** 默认使用的模型：base（平衡速度和准确率） */
const DEFAULT_MODEL = 'base'

function getWhisperCppPath(): string {
  const packageJsonPath = realpathSync(require.resolve('nodejs-whisper/package.json'))
  return path.join(path.dirname(packageJsonPath), 'cpp', 'whisper.cpp')
}

function getWhisperExecutablePath(): string | null {
  const whisperCppPath = getWhisperCppPath()
  const execName = process.platform === 'win32' ? 'whisper-cli.exe' : 'whisper-cli'
  const possiblePaths = [
    path.join(whisperCppPath, 'build', 'bin', execName),
    path.join(whisperCppPath, 'build', 'bin', 'Release', execName),
    path.join(whisperCppPath, 'build', 'bin', 'Debug', execName),
    path.join(whisperCppPath, 'build', execName),
    path.join(whisperCppPath, execName),
  ]

  return possiblePaths.find(filePath => existsSync(filePath)) || null
}

function formatExecError(error: unknown): string {
  if (!(error instanceof Error)) {
    return String(error)
  }

  const stdout =
    typeof error === 'object' && error !== null && 'stdout' in error
      ? String((error as { stdout?: unknown }).stdout || '').trim()
      : ''
  const stderr =
    typeof error === 'object' && error !== null && 'stderr' in error
      ? String((error as { stderr?: unknown }).stderr || '').trim()
      : ''

  return [error.message, stderr, stdout].filter(Boolean).join('\n')
}

function ensureWhisperCli(): string {
  const existingExecutable = getWhisperExecutablePath()

  if (existingExecutable) {
    logger.info(`[Whisper] 检测到 whisper-cli: ${existingExecutable}`)
    return existingExecutable
  }

  const whisperCppPath = getWhisperCppPath()
  logger.warn(`[Whisper] 未找到 whisper-cli，尝试自动构建: ${whisperCppPath}`)

  try {
    execSync('cmake -B build', {
      cwd: whisperCppPath,
      encoding: 'utf8',
      stdio: 'pipe',
    })
    execSync('cmake --build build --config Release', {
      cwd: whisperCppPath,
      encoding: 'utf8',
      stdio: 'pipe',
    })
  } catch (error) {
    throw new Error(
      'whisper-cli 自动构建失败。请确认本机已安装可用的 C/C++ 编译工具链，然后重试。\n' +
        formatExecError(error)
    )
  }

  const builtExecutable = getWhisperExecutablePath()
  if (!builtExecutable) {
    throw new Error('whisper-cli 自动构建完成，但未找到生成的可执行文件。')
  }

  logger.info(`[Whisper] whisper-cli 构建完成: ${builtExecutable}`)
  return builtExecutable
}

/**
 * 语音转文本
 * @param filePath 音频文件绝对路径
 * @param options 可选配置
 * @returns 识别出的文本内容
 */
export async function transcribeAudio(
  filePath: string,
  options?: {
    modelName?: string
    language?: string // 'zh' for Chinese, 'en' for English, etc.
  }
): Promise<string> {
  // 检查 ffmpeg 是否安装
  if (!checkFfmpeg()) {
    throw new Error(
      '缺少 ffmpeg 依赖。请安装 ffmpeg：\n' +
        '- macOS: brew install ffmpeg\n' +
        '- Ubuntu/Debian: sudo apt-get install ffmpeg\n' +
        '- Windows: choco install ffmpeg 或从 https://ffmpeg.org/download.html 下载'
    )
  }
  if (!checkCmake()) {
    throw new Error(
      '缺少 cmake 依赖。nodejs-whisper 需要 cmake 构建 whisper-cli 可执行文件。\n' +
        '请先安装 cmake：\n' +
        '- macOS: brew install cmake\n' +
        '- Ubuntu/Debian: sudo apt-get install cmake\n' +
        '- Windows: choco install cmake\n' +
        '安装后重启 API 服务再试。'
    )
  }

  const modelName = options?.modelName || DEFAULT_MODEL

  try {
    ensureWhisperCli()

    logger.info(`[Whisper] 开始识别音频: ${filePath}`)
    logger.info(`[Whisper] 使用模型: ${modelName}`)

    const result = await nodewhisper(filePath, {
      modelName,
      autoDownloadModelName: modelName, // 自动下载模型（如果不存在）
      removeWavFileAfterTranscription: false, // 保留转换后的 WAV 文件
      withCuda: false, // 使用 CPU（适合大多数环境）
      logger: console, // 使用标准 console
      whisperOptions: {
        outputInText: true, // 输出为纯文本
        outputInSrt: false,
        outputInJson: false,
        outputInVtt: false,
        outputInLrc: false,
        outputInWords: false,
        outputInCsv: false,
        outputInJsonFull: false,
        translateToEnglish: false, // 不翻译，保持原语言
        wordTimestamps: false, // 不需要字级别时间戳
        splitOnWord: true, // 按单词分割
      },
    })

    logger.info(`[Whisper] 识别完成，结果长度: ${result.length} 字符`)

    // nodewhisper 返回的是字符串数组，取第一个元素（纯文本结果）
    // 如果返回的是数组，取第一个；如果直接是字符串，直接返回
    if (Array.isArray(result)) {
      return normalizeWhisperTranscript(result[0] || '')
    }

    return normalizeWhisperTranscript(result || '')
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    logger.error(`[Whisper] 识别失败: ${errorMsg}`)
    if (errorMsg.includes('whisper-cli executable not found')) {
      throw new Error(
        '语音识别失败：whisper-cli 未生成，且自动构建也没有成功。请确认已安装 cmake 与本机 C/C++ 编译工具链，随后重试一次识别。'
      )
    }
    throw new Error(`语音识别失败: ${errorMsg}`)
  }
}

/**
 * 获取支持的模型列表
 */
export function getSupportedModels(): string[] {
  return MODELS_LIST
}

/**
 * 检查模型是否有效
 */
export function isValidModel(modelName: string): boolean {
  return MODELS_LIST.includes(modelName)
}
