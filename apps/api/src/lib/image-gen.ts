/**
 * 使用阿里云百炼 qwen-image-2.0-pro 生成图片
 *
 * 文档参考：
 * - https://www.alibabacloud.com/help/zh/model-studio/qwen-image-api
 * - 百炼控制台：https://bailian.console.aliyun.com/cn-beijing
 *
 * 前提条件：
 * - 在百炼控制台获取 API Key：https://www.alibabacloud.com/help/zh/model-studio/get-api-key
 * - 配置 DASHSCOPE_API_KEY 到 apps/api/.env
 * - 北京地域：dashscope.aliyuncs.com；新加坡：dashscope-intl.aliyuncs.com（API Key 不可混用）
 */
import { env } from '../env'
import { logger } from './logger'

const MODEL = 'qwen-image-2.0-pro'
const DEFAULT_NEGATIVE_PROMPT =
  '低分辨率，低画质，肢体畸形，手指畸形，画面过饱和，蜡像感，人脸无细节，过度光滑，画面具有AI感。构图混乱。文字模糊，扭曲。'

export interface GenerateImageOptions {
  /** 正向提示词，描述期望生成的图像 */
  prompt: string
  /** 反向提示词，描述不希望出现的内容 */
  negativePrompt?: string
  /** 分辨率，如 1024*1024 */
  size?: string
}

export interface GenerateImageResult {
  /** 生成的图片 URL（有效期为 24 小时） */
  imageUrl: string
}

/**
 * 调用 qwen-image-2.0-pro 生成图片
 */
export async function generateImage(
  options: GenerateImageOptions
): Promise<GenerateImageResult> {
  const { DASHSCOPE_API_KEY, DASHSCOPE_BASE_URL } = env
  if (!DASHSCOPE_API_KEY) {
    throw new Error(
      'DASHSCOPE_API_KEY 未配置，无法使用封面图生成功能。请在 apps/api/.env 中配置。'
    )
  }

  // qwen-image API 使用标准 DashScope 路径，不能带 compatible-mode/v1（仅 chat/embeddings 用）
  const base = new URL(DASHSCOPE_BASE_URL).origin
  const url = `${base}/api/v1/services/aigc/multimodal-generation/generation`
  logger.debug({
    url,
    model: MODEL,
    promptLength: options.prompt.length,
    promptPreview: options.prompt.slice(0, 120) + (options.prompt.length > 120 ? '...' : ''),
  }, 'image-gen request')

  const body = {
    model: MODEL,
    input: {
      messages: [
        {
          role: 'user',
          content: [
            {
              text: options.prompt.slice(0, 800), // API 限制 800 字符
            },
          ],
        },
      ],
    },
    parameters: {
      negative_prompt: options.negativePrompt ?? DEFAULT_NEGATIVE_PROMPT,
      prompt_extend: true,
      watermark: false,
      size: options.size ?? '1024*1024',
      n: 1,
    },
  }

  const start = Date.now()
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DASHSCOPE_API_KEY}`,
    },
    body: JSON.stringify(body),
  })

  const elapsed = Date.now() - start
  logger.debug({ status: res.status, elapsed: `${elapsed}ms` }, 'image-gen response')

  if (!res.ok) {
    const errText = await res.text()
    let errMsg = `DashScope 请求失败: ${res.status}`
    try {
      const errJson = JSON.parse(errText) as { message?: string; code?: string }
      errMsg = errJson.message ?? errMsg
    } catch {
      if (errText) errMsg += ` - ${errText.slice(0, 200)}`
    }
    throw new Error(errMsg)
  }

  const data = (await res.json()) as {
    output?: {
      choices?: Array<{
        message?: {
          content?: Array<{ image?: string }>
        }
      }>
    }
    code?: string
    message?: string
  }

  if (data.code) {
    throw new Error(data.message ?? `DashScope 返回错误: ${data.code}`)
  }

  const imageUrl =
    data.output?.choices?.[0]?.message?.content?.[0]?.image
  logger.debug({
    requestId: (data as { request_id?: string }).request_id,
    imageUrl: imageUrl ? `${imageUrl.slice(0, 60)}...` : null,
  }, 'image-gen success')
  if (!imageUrl) {
    throw new Error('未从 DashScope 返回中获取到图片 URL')
  }

  return { imageUrl }
}
