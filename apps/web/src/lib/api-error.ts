import { HTTPError } from 'ky'
import { toast } from 'sonner'

/** 后端错误响应体格式（与 apps/api 的 errorHandler 一致） */
export type ApiErrorBody = {
  success?: boolean
  error?: string
  code?: string
  details?: Array<{ path: string; message: string }>
}

/** 已知错误码对应的用户友好中文提示（可扩展） */
const FRIENDLY_MESSAGES: Record<string, string> = {
  FORBIDDEN: '您没有权限执行此操作',
  UNAUTHORIZED: '请先登录',
  NOT_FOUND: '资源不存在',
  BAD_REQUEST: '请求参数有误',
  CONFLICT: '操作冲突，请稍后重试',
  TOO_MANY_REQUESTS: '操作过于频繁，请稍后再试',
}

/** 后端英文文案到中文的映射（可扩展） */
const MESSAGE_I18N: Record<string, string> = {
  'You can only edit your own posts': '您只能编辑自己的文章',
  'You can only delete your own posts': '您只能删除自己的文章',
}

/** ky beforeError 中挂到 error 上的后端 code（见 api-client） */
export type ApiErrorWithCode = Error & { apiCode?: string; apiDetails?: ApiErrorBody['details'] }

/**
 * 从任意错误中提取可展示给用户的错误信息（优先后端 error 字段，其次 code 友好文案）
 * api-client 的 beforeError 已把 body.error 写入 error.message、body.code 写入 apiCode
 */
export function getApiErrorMessage(err: unknown): string {
  if (err instanceof HTTPError) {
    const withCode = err as ApiErrorWithCode
    const byMessage = err.message && MESSAGE_I18N[err.message]
    if (byMessage) return byMessage
    const byCode = withCode.apiCode && FRIENDLY_MESSAGES[withCode.apiCode]
    if (byCode) return byCode
    if (withCode.apiDetails?.length) {
      return withCode.apiDetails.map((d) => `${d.path}: ${d.message}`).join('；')
    }
    return err.message || '请求失败，请稍后重试'
  }
  if (err && typeof err === 'object' && 'message' in err && typeof (err as Error).message === 'string') {
    return (err as Error).message
  }
  return '请求失败，请稍后重试'
}

/**
 * 展示 API 错误为全局 Toast（仅浏览器端调用）
 */
export function showApiError(err: unknown, fallbackTitle = '操作失败'): void {
  if (typeof window === 'undefined') return
  const message = getApiErrorMessage(err)
  toast.error(fallbackTitle, { description: message, duration: 5000 })
}

/**
 * 展示成功提示
 */
export function showApiSuccess(message: string, description?: string): void {
  if (typeof window === 'undefined') return
  toast.success(message, { description, duration: 3000 })
}
