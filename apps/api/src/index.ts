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
import search from './routes/search'
import home from './routes/home'
import uploads from './routes/uploads'

const app = new Hono()

// Global middleware
app.use('*', requestLogger)
app.use('*', cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
}))
app.use('*', errorHandler)

// Health check
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

// Root endpoint
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
        search: '/search',
        home: '/home',
      },
    },
  })
})

// API routes
app.route('/auth', auth)
app.route('/ai', ai)
app.route('/posts', posts)
app.route('/categories', categories)
app.route('/tags', tags)
app.route('/comments', comments)
app.route('/users', users)
app.route('/weather', weather)
app.route('/search', search)
app.route('/home', home)
app.route('/uploads', uploads)

const port = parseInt(env.PORT)

logger.info({ msg: 'Server started', port, env: env.NODE_ENV })

serve({
  fetch: app.fetch,
  port,
})
