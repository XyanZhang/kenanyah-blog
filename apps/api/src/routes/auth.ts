import { Hono } from 'hono'
import { setCookie, deleteCookie } from 'hono/cookie'
import { prisma } from '../lib/db'
import { generateTokenPair, verifyRefreshToken } from '../lib/jwt'
import { hashPassword, verifyPassword } from '../lib/password'
import { validateBody } from '../middleware/validation'
import { rateLimit } from '../middleware/rate-limit'
import { authMiddleware } from '../middleware/auth'
import {
  registerSchema,
  loginSchema,
  type RegisterInput,
  type LoginInput,
} from '@blog/validation'
import { ConflictError, UnauthorizedError, BadRequestError } from '../middleware/error'

const auth = new Hono()

// Rate limiting for auth endpoints
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many authentication attempts, please try again later',
})

// Register
auth.post('/register', authRateLimit, validateBody(registerSchema), async (c) => {
  const data = c.get('validatedBody') as RegisterInput

  // Check if user already exists
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ email: data.email }, { username: data.username }],
    },
  })

  if (existingUser) {
    if (existingUser.email === data.email) {
      throw new ConflictError('Email already registered')
    }
    throw new ConflictError('Username already taken')
  }

  // Hash password
  const passwordHash = await hashPassword(data.password)

  // Create user
  const user = await prisma.user.create({
    data: {
      email: data.email,
      username: data.username,
      passwordHash,
      name: data.name,
    },
    select: {
      id: true,
      email: true,
      username: true,
      name: true,
      role: true,
      createdAt: true,
    },
  })

  // Generate tokens
  const tokens = generateTokenPair({
    userId: user.id,
    email: user.email,
    role: user.role,
  })

  // Set cookies
  setCookie(c, 'access_token', tokens.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    maxAge: 15 * 60, // 15 minutes
  })

  setCookie(c, 'refresh_token', tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  })

  return c.json({
    success: true,
    data: { user },
  }, 201)
})

// Login
auth.post('/login', authRateLimit, validateBody(loginSchema), async (c) => {
  const data = c.get('validatedBody') as LoginInput

  // Find user
  const user = await prisma.user.findUnique({
    where: { email: data.email },
  })

  if (!user || !user.passwordHash) {
    throw new UnauthorizedError('Invalid credentials')
  }

  // Verify password
  const isValid = await verifyPassword(data.password, user.passwordHash)

  if (!isValid) {
    throw new UnauthorizedError('Invalid credentials')
  }

  // Generate tokens
  const tokens = generateTokenPair({
    userId: user.id,
    email: user.email,
    role: user.role,
  })

  // Set cookies
  setCookie(c, 'access_token', tokens.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    maxAge: 15 * 60,
  })

  setCookie(c, 'refresh_token', tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    maxAge: 7 * 24 * 60 * 60,
  })

  return c.json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        role: user.role,
      },
    },
  })
})

// Logout
auth.post('/logout', authMiddleware, async (c) => {
  deleteCookie(c, 'access_token')
  deleteCookie(c, 'refresh_token')

  return c.json({
    success: true,
    data: { message: 'Logged out successfully' },
  })
})

// Refresh token
auth.post('/refresh', async (c) => {
  const refreshToken = c.req.header('x-refresh-token')

  if (!refreshToken) {
    throw new BadRequestError('Refresh token required')
  }

  try {
    const payload = verifyRefreshToken(refreshToken)

    // Generate new tokens
    const tokens = generateTokenPair(payload)

    // Set new cookies
    setCookie(c, 'access_token', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      maxAge: 15 * 60,
    })

    return c.json({
      success: true,
      data: { accessToken: tokens.accessToken },
    })
  } catch (error) {
    throw new UnauthorizedError('Invalid refresh token')
  }
})

// Get current user
auth.get('/me', authMiddleware, async (c) => {
  const { userId } = c.get('user')

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      username: true,
      name: true,
      bio: true,
      avatar: true,
      role: true,
      createdAt: true,
    },
  })

  if (!user) {
    throw new UnauthorizedError('User not found')
  }

  return c.json({
    success: true,
    data: { user },
  })
})

export default auth
