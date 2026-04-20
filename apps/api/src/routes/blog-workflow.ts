import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { z } from 'zod'
import { authMiddlewareStrict } from '../middleware/auth'
import { rateLimit } from '../middleware/rate-limit'
import { createAbortError, isAbortError } from '../lib/abort'
import { runBlogReactOrchestrator } from '../orchestrators/blog-react-orchestrator'
import { env } from '../env'
import { logger } from '../lib/logger'

type WorkflowVariables = {
  user: { userId: string; role: string }
}

const bodySchema = z.object({
  conversationId: z.string().cuid(),
  message: z.string().min(1).max(4000),
  publishDirectly: z.boolean().optional().default(true),
})

const cancelSchema = bodySchema.pick({
  conversationId: true,
})

const workflow = new Hono<{ Variables: WorkflowVariables }>()
const activeWorkflowRuns = new Map<string, AbortController>()

workflow.use('*', authMiddlewareStrict)
workflow.use('*', rateLimit({ windowMs: 60_000, max: 12, message: '请求过于频繁，请稍后再试' }))

function getWorkflowRunKey(userId: string, conversationId: string) {
  return `${userId}:${conversationId}`
}

function cleanupWorkflowRun(runKey: string, controller: AbortController) {
  if (activeWorkflowRuns.get(runKey) === controller) {
    activeWorkflowRuns.delete(runKey)
  }
}

workflow.post('/run', async (c) => {
  const parsed = bodySchema.safeParse(await c.req.json().catch(() => ({})))
  if (!parsed.success) {
    return c.json(
      {
        success: false,
        error: '请求参数无效',
        ...(env.NODE_ENV === 'development' ? { details: parsed.error.flatten() } : {}),
      },
      400
    )
  }

  const user = c.get('user')
  const canPublish = user.role === 'ADMIN' || user.role === 'MODERATOR'
  const publishDirectly = canPublish ? parsed.data.publishDirectly : false

  try {
    const result = await runBlogReactOrchestrator({
      conversationId: parsed.data.conversationId,
      userId: user.userId,
      latestUserMessage: parsed.data.message.trim(),
      publishDirectly,
      siteBaseUrl: env.CORS_ORIGIN.split(',')[0]?.trim() || 'http://localhost:3000',
    })

    return c.json({
      success: true,
      data: result,
    })
  } catch (error) {
    logger.error(
      {
        err: error,
        conversationId: parsed.data.conversationId,
        userId: user.userId,
      },
      'blog_workflow.run.failed'
    )
    return c.json(
      {
        success: false,
        error: '工作流执行失败，请稍后重试',
      },
      500
    )
  }
})

workflow.post('/run/stream', async (c) => {
  const parsed = bodySchema.safeParse(await c.req.json().catch(() => ({})))
  if (!parsed.success) {
    return c.json(
      {
        success: false,
        error: '请求参数无效',
        ...(env.NODE_ENV === 'development' ? { details: parsed.error.flatten() } : {}),
      },
      400
    )
  }

  const user = c.get('user')
  const canPublish = user.role === 'ADMIN' || user.role === 'MODERATOR'
  const publishDirectly = canPublish ? parsed.data.publishDirectly : false
  const runKey = getWorkflowRunKey(user.userId, parsed.data.conversationId)
  const controller = new AbortController()
  const existing = activeWorkflowRuns.get(runKey)

  if (existing && !existing.signal.aborted) {
    existing.abort(createAbortError('已有新的博客生成任务接管当前任务'))
  }

  activeWorkflowRuns.set(runKey, controller)

  const requestSignal = c.req.raw.signal
  const handleRequestAbort = () => {
    controller.abort(createAbortError('客户端已断开连接'))
  }

  if (requestSignal.aborted) {
    controller.abort(createAbortError('客户端已断开连接'))
  } else {
    requestSignal.addEventListener('abort', handleRequestAbort, { once: true })
  }

  return streamSSE(c, async (stream) => {
    try {
      await stream.writeSSE({ data: JSON.stringify({ type: 'start' }) })

      const result = await runBlogReactOrchestrator({
        conversationId: parsed.data.conversationId,
        userId: user.userId,
        latestUserMessage: parsed.data.message.trim(),
        publishDirectly,
        siteBaseUrl: env.CORS_ORIGIN.split(',')[0]?.trim() || 'http://localhost:3000',
        signal: controller.signal,
        onEvent: async (event) => {
          await stream.writeSSE({
            data: JSON.stringify(event),
          })
        },
      })

      await stream.writeSSE({
        data: JSON.stringify({
          type: 'result',
          result,
        }),
      })
      await stream.writeSSE({ data: '[DONE]' })
    } catch (error) {
      if (isAbortError(error) || controller.signal.aborted) {
        return
      }

      logger.error(
        {
          err: error,
          conversationId: parsed.data.conversationId,
          userId: user.userId,
        },
        'blog_workflow.stream.failed'
      )

      try {
        await stream.writeSSE({
          data: JSON.stringify({
            error: '工作流执行失败，请稍后重试',
          }),
        })
      } catch {
        // ignore stream write failure after disconnect
      }
    } finally {
      requestSignal.removeEventListener('abort', handleRequestAbort)
      cleanupWorkflowRun(runKey, controller)
      try {
        stream.close()
      } catch {
        // ignore double close
      }
    }
  })
})

workflow.post('/cancel', async (c) => {
  const parsed = cancelSchema.safeParse(await c.req.json().catch(() => ({})))
  if (!parsed.success) {
    return c.json(
      {
        success: false,
        error: '请求参数无效',
        ...(env.NODE_ENV === 'development' ? { details: parsed.error.flatten() } : {}),
      },
      400
    )
  }

  const user = c.get('user')
  const runKey = getWorkflowRunKey(user.userId, parsed.data.conversationId)
  const controller = activeWorkflowRuns.get(runKey)

  if (controller && !controller.signal.aborted) {
    controller.abort(createAbortError('用户取消了博客生成任务'))
  }
  activeWorkflowRuns.delete(runKey)

  return c.json({
    success: true,
    data: {
      cancelled: Boolean(controller),
    },
  })
})

export default workflow
