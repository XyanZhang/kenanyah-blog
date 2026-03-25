import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { env } from './env'
import { logger } from './lib/logger'
import { requestLogger } from './middleware/request-logger'
import { errorHandler } from './middleware/error'

// Import routes
import auth from './routes/auth'
import posts from './routes/posts'
import categories from './routes/categories'
import tags from './routes/tags'
import comments from './routes/comments'
import users from './routes/users'
import weather from './routes/weather'
import ai from './routes/ai'
import chat from './routes/chat'
import search from './routes/search'
import home from './routes/home'
import uploads from './routes/uploads'
import countdown from './routes/countdown'
import calendar from './routes/calendar'
import pdf from './routes/pdf'
import bookmarks from './routes/bookmarks'
import pictures from './routes/pictures'
import statics from './routes/statics'
import thoughts from './routes/thoughts'

// 根应用：/uploads 在根路径（图片等静态资源无需 /api 前缀），/api 下为接口
const root = new Hono()
root.use('*', requestLogger)
// CORS_ORIGIN 支持逗号分隔多域名，如 https://xyan.store,https://www.xyan.store
const corsOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean)
root.use('*', cors({
  origin: corsOrigins.length > 1 ? corsOrigins : corsOrigins[0] ?? env.CORS_ORIGIN,
  credentials: true,
}))
root.use('*', errorHandler)

// 图片等上传资源：http://localhost:3001/uploads/:subdir/:filename（无 basePath，便于前端 UPLOAD_BASE_URL 不包含 /api）
root.route('/uploads', uploads)
root.route('/statics', statics)

// API 接口挂到 /api 下（mount 后子应用收到的是 /health、/posts 等，不再带 /api 前缀，故不再用 basePath）
const app = new Hono()
app.get('/health', (c) => {
  return c.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
    },
  })
})
app.get('/', (c) => {
  return c.json({
    success: true,
    data: {
      message: 'Blog API Server',
      version: '0.1.0',
      endpoints: {
        auth: '/auth',
        posts: '/posts',
        categories: '/categories',
        tags: '/tags',
        comments: '/comments',
        users: '/users',
        weather: '/weather',
        ai: '/ai',
        chat: '/chat',
        search: '/search',
        home: '/home',
        uploads: '/uploads',
        pictures: '/pictures',
        thoughts: '/thoughts',
      },
    },
  })
})
app.route('/auth', auth)
app.route('/ai', ai)
app.route('/chat', chat)
app.route('/posts', posts)
app.route('/categories', categories)
app.route('/tags', tags)
app.route('/comments', comments)
app.route('/users', users)
app.route('/weather', weather)
app.route('/search', search)
app.route('/home', home)
app.route('/countdown', countdown)
app.route('/calendar', calendar)
app.route('/pdf', pdf)
app.route('/bookmarks', bookmarks)
app.route('/pictures', pictures)
app.route('/thoughts', thoughts)

root.route('/api', app)

const port = parseInt(env.PORT)

logger.info({ msg: 'Server started', port, env: env.NODE_ENV })

serve({
  fetch: root.fetch,
  hostname: '0.0.0.0',
  port,
})
