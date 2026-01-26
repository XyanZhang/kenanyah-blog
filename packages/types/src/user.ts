export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
  MODERATOR = 'MODERATOR',
}

export enum AuthProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
  GITHUB = 'github',
}

export interface User {
  id: string
  email: string
  username: string
  passwordHash: string | null
  name: string | null
  bio: string | null
  avatar: string | null
  role: UserRole
  provider: AuthProvider
  providerId: string | null
  createdAt: Date
  updatedAt: Date
}

export type CreateUserDto = Pick<User, 'email' | 'username' | 'name'> & {
  password: string
}

export type UpdateUserDto = Partial<Pick<User, 'name' | 'bio' | 'avatar'>>

export type UserPublic = Omit<User, 'passwordHash' | 'providerId'>
