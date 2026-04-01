import { Hono } from 'hono'
import { z } from 'zod'
import { authMiddlewareStrict } from '../middleware/auth'
import { rateLimit } from '../middleware/rate-limit'
import { runBlogReactOrchestrator } from '../orchestrators/blog-react-orchestrator'
import { env } from '../env'

type WorkflowVariables = {
  user: { userId: string; role: string }
}

const bodySchema = z.object({
  conversationId: z.string().cuid(),
  message: z.string().min(1).max(4000),
  publishDirectly: z.boolean().optional().default(true),
})

const workflow = new Hono<{ Variables: WorkflowVariables }>()

workflow.use('*', authMiddlewareStrict)
workflow.use('*', rateLimit({ windowMs: 60_000, max: 12, message: '请求过于频繁，请稍后再试' }))

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
    console.error('[blog-workflow] run failed:', error)
    return c.json(
      {
        success: false,
        error: '工作流执行失败，请稍后重试',
      },
      500
    )
  }
})

export default workflow
