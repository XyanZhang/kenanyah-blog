import type { ApiResponse, DivinationConsultationDto } from '@blog/types'
import type {
  CreateDivinationConsultationInput,
  DivinationConsultationModeInput,
  DivinationQuestionTypeInput,
} from '@blog/validation'
import { getApiBaseUrl } from './api-client'

const DIVINATION_REPLY_TIMEOUT_MS = 60_000

export type DivinationConsultationMode = DivinationConsultationModeInput
export type DivinationQuestionType = DivinationQuestionTypeInput
export type CreateDivinationConsultationBody = CreateDivinationConsultationInput

export async function createDivinationConsultation(
  body: CreateDivinationConsultationBody
): Promise<DivinationConsultationDto> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => {
    controller.abort()
  }, DIVINATION_REPLY_TIMEOUT_MS)

  try {
    const response = await fetch(`${getApiBaseUrl().replace(/\/$/, '')}/divination/consultations`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    const res = (await response.json().catch(() => ({}))) as ApiResponse<DivinationConsultationDto>
    if (!response.ok || !res.success || !res.data) {
      throw new Error(res.error ?? '咨询生成失败')
    }
    return res.data
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('AI 回复超时，请稍后重试')
    }
    throw error
  } finally {
    window.clearTimeout(timeout)
  }
}
