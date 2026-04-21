import jwt, { SignOptions } from 'jsonwebtoken'
import { env } from '../env'

export interface AdminJwtPayload {
  adminUserId: string
  email: string
  role: string
  scope: 'admin'
}

export interface AdminTokenPair {
  accessToken: string
  refreshToken: string
}

export function generateAdminAccessToken(payload: AdminJwtPayload): string {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as unknown as SignOptions['expiresIn'],
  }
  return jwt.sign(payload, env.JWT_SECRET, options)
}

export function generateAdminRefreshToken(payload: AdminJwtPayload): string {
  const options: SignOptions = {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as unknown as SignOptions['expiresIn'],
  }
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, options)
}

export function generateAdminTokenPair(payload: AdminJwtPayload): AdminTokenPair {
  return {
    accessToken: generateAdminAccessToken(payload),
    refreshToken: generateAdminRefreshToken(payload),
  }
}

export function verifyAdminAccessToken(token: string): AdminJwtPayload {
  const payload = jwt.verify(token, env.JWT_SECRET) as AdminJwtPayload
  if (payload.scope !== 'admin') {
    throw new Error('Invalid admin access token')
  }
  return payload
}

export function verifyAdminRefreshToken(token: string): AdminJwtPayload {
  const payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as AdminJwtPayload
  if (payload.scope !== 'admin') {
    throw new Error('Invalid admin refresh token')
  }
  return payload
}
