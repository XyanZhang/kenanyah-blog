import { env } from '../env'

export interface OAuthProvider {
  name: string
  authUrl: string
  tokenUrl: string
  userInfoUrl: string
  clientId: string
  clientSecret: string
  redirectUri: string
  scope: string
}

export interface OAuthTokenResponse {
  access_token: string
  token_type: string
  expires_in?: number
  refresh_token?: string
  scope?: string
}

export interface OAuthUserInfo {
  id: string
  email: string
  name?: string
  avatar?: string
}

export const googleProvider: OAuthProvider = {
  name: 'google',
  authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
  clientId: env.GOOGLE_CLIENT_ID || '',
  clientSecret: env.GOOGLE_CLIENT_SECRET || '',
  redirectUri: env.GOOGLE_REDIRECT_URI || '',
  scope: 'openid email profile',
}

export const githubProvider: OAuthProvider = {
  name: 'github',
  authUrl: 'https://github.com/login/oauth/authorize',
  tokenUrl: 'https://github.com/login/oauth/access_token',
  userInfoUrl: 'https://api.github.com/user',
  clientId: env.GITHUB_CLIENT_ID || '',
  clientSecret: env.GITHUB_CLIENT_SECRET || '',
  redirectUri: env.GITHUB_REDIRECT_URI || '',
  scope: 'read:user user:email',
}

export function getAuthorizationUrl(provider: OAuthProvider, state: string): string {
  const params = new URLSearchParams({
    client_id: provider.clientId,
    redirect_uri: provider.redirectUri,
    scope: provider.scope,
    response_type: 'code',
    state,
  })

  return `${provider.authUrl}?${params.toString()}`
}

export async function exchangeCodeForToken(
  provider: OAuthProvider,
  code: string
): Promise<OAuthTokenResponse> {
  const response = await fetch(provider.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_id: provider.clientId,
      client_secret: provider.clientSecret,
      code,
      redirect_uri: provider.redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to exchange code for token')
  }

  return response.json()
}

export async function fetchUserInfo(
  provider: OAuthProvider,
  accessToken: string
): Promise<OAuthUserInfo> {
  const response = await fetch(provider.userInfoUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch user info')
  }

  const data = await response.json()

  // Normalize user info based on provider
  if (provider.name === 'google') {
    return {
      id: data.id,
      email: data.email,
      name: data.name,
      avatar: data.picture,
    }
  }

  if (provider.name === 'github') {
    return {
      id: data.id.toString(),
      email: data.email,
      name: data.name || data.login,
      avatar: data.avatar_url,
    }
  }

  throw new Error('Unsupported OAuth provider')
}
