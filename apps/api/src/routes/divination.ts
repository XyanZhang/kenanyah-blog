import { Hono } from 'hono'
import {
  createDivinationConsultationSchema,
  type CreateDivinationConsultationInput,
} from '@blog/validation'
import { runDivinationConsultationAgent } from '../agents/divination-consultation-agent'
import { authMiddleware } from '../middleware/auth'
import { validateBody } from '../middleware/validation'
import { createAbortError, isAbortError } from '../lib/abort'

const DIVINATION_AGENT_TIMEOUT_MS = 45_000

type DivinationVariables = {
  user: { userId: string }
  validatedBody?: unknown
}

const divination = new Hono<{ Variables: DivinationVariables }>()

function createLinkedTimeoutSignal(requestSignal: AbortSignal): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController()
  const timeout = setTimeout(() => {
    controller.abort(createAbortError('AI 回复超时，请稍后重试'))
  }, DIVINATION_AGENT_TIMEOUT_MS)

  const handleRequestAbort = () => {
    controller.abort(createAbortError('客户端已断开连接'))
  }

  if (requestSignal.aborted) {
    handleRequestAbort()
  } else {
    requestSignal.addEventListener('abort', handleRequestAbort, { once: true })
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timeout)
      requestSignal.removeEventListener('abort', handleRequestAbort)
    },
  }
}

divination.post(
  '/consultations',
  authMiddleware,
  validateBody(createDivinationConsultationSchema),
  async (c) => {
    const body = (c.get('validatedBody') ?? {}) as CreateDivinationConsultationInput
    const { signal, cleanup } = createLinkedTimeoutSignal(c.req.raw.signal)

    try {
      const consultation = await runDivinationConsultationAgent(body, signal)

      return c.json({
        success: true,
        data: consultation,
      })
    } catch (error) {
      if (isAbortError(error)) {
        return c.json(
          {
            success: false,
            error: error instanceof Error ? error.message : 'AI 回复超时，请稍后重试',
          },
          504
        )
      }
      throw error
    } finally {
      cleanup()
    }
  }
)

export default divination
