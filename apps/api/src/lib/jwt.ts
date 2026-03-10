import jwt, { SignOptions } from 'jsonwebtoken'
import { env } from '../env'

export interface JwtPayload {
  userId: string
  email: string
  role: string
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
}

export function generateAccessToken(payload: JwtPayload): string {
  const options: SignOptions = {
    // jsonwebtoken v9 types only accept `number | StringValue`
    expiresIn: env.JWT_EXPIRES_IN as unknown as SignOptions['expiresIn'],
  }
  return jwt.sign(payload, env.JWT_SECRET, options)
}

export function generateRefreshToken(payload: JwtPayload): string {
  const options: SignOptions = {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as unknown as SignOptions['expiresIn'],
  }
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, options)
}

export function generateTokenPair(payload: JwtPayload): TokenPair {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  }
}

export function verifyAccessToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, env.JWT_SECRET) as JwtPayload
  } catch (error) {
    throw new Error('Invalid or expired access token')
  }
}

export function verifyRefreshToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload
  } catch (error) {
    throw new Error('Invalid or expired refresh token')
  }
}
