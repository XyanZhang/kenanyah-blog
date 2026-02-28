import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { env } from './env'
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

const app = new Hono()

// Global middleware
app.use('*', logger())
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

const port = parseInt(env.PORT)

console.log(`Server is running on port ${port}`)

serve({
  fetch: app.fetch,
  port,
})
