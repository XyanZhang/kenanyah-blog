const names = ['青禾', '墨白', '林间', '南栀', '望舒', '清越', '澄明', '砚秋']
const colors = ['#c24162', '#2f6f73', '#8b5e34', '#5b6c9d', '#8f4c38', '#486b42', '#7a5b92', '#b35c24']

const pixelIdStorageKey = 'collab-editor-pixel-id'
const legacyUserStorageKey = 'collab-editor-user'

export type LocalPresenceUser = {
  pixelId: string
  name: string
  color: string
}

export function getLocalPixelId() {
  const cached = window.localStorage.getItem(pixelIdStorageKey)
  if (cached) return cached

  const pixelId = crypto.randomUUID()
  window.localStorage.setItem(pixelIdStorageKey, pixelId)
  return pixelId
}

export function getFallbackUser(pixelId = getLocalPixelId()): LocalPresenceUser {
  const cached = window.localStorage.getItem(legacyUserStorageKey)
  if (cached) {
    const user = JSON.parse(cached) as { name: string; color: string }
    return { pixelId, name: user.name, color: user.color }
  }

  const index = Math.floor(Math.random() * names.length)
  const user = {
    pixelId,
    name: `${names[index]} ${Math.floor(Math.random() * 90 + 10)}`,
    color: colors[index % colors.length],
  }
  window.localStorage.setItem(legacyUserStorageKey, JSON.stringify({ name: user.name, color: user.color }))
  return user
}

export function toPresenceUser(input: { pixelId: string; nickname: string; color: string }): LocalPresenceUser {
  return {
    pixelId: input.pixelId,
    name: input.nickname,
    color: input.color,
  }
}
