import { UserPublic } from './user'

export interface LoginDto {
  email: string
  password: string
}

export interface RegisterDto {
  email: string
  username: string
  password: string
  name?: string
}

export interface AuthResponse {
  user: UserPublic
  accessToken?: string
  refreshToken?: string
}

export interface JwtPayload {
  userId: string
  email: string
  role: string
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
}
