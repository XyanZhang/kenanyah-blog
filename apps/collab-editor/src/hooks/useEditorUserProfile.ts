import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchEditorUser, saveEditorUser } from '../lib/documents-api'
import { getFallbackUser, getLocalPixelId, toPresenceUser } from '../lib/user-presence'
import type { LocalPresenceUser } from '../lib/user-presence'

type ProfileStatus = 'loading' | 'ready' | 'needs-nickname' | 'error'

export function useEditorUserProfile() {
  const pixelId = useMemo(() => getLocalPixelId(), [])
  const fallbackUser = useMemo(() => getFallbackUser(pixelId), [pixelId])
  const [user, setUser] = useState<LocalPresenceUser>(fallbackUser)
  const [status, setStatus] = useState<ProfileStatus>('loading')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    fetchEditorUser(pixelId)
      .then((profile) => {
        if (cancelled) return
        if (!profile.nickname) {
          setUser({ pixelId: profile.pixelId, name: fallbackUser.name, color: profile.color })
          setStatus('needs-nickname')
          return
        }

        setUser(toPresenceUser({ pixelId: profile.pixelId, nickname: profile.nickname, color: profile.color }))
        setStatus('ready')
      })
      .catch((caught) => {
        if (cancelled) return
        setError(caught instanceof Error ? caught.message : '用户资料读取失败')
        setStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [fallbackUser.name, pixelId])

  const saveNickname = useCallback(
    async (nickname: string) => {
      const profile = await saveEditorUser(pixelId, nickname, user.color)
      const nextUser = toPresenceUser({
        pixelId: profile.pixelId,
        nickname: profile.nickname ?? nickname,
        color: profile.color,
      })
      setUser(nextUser)
      setError(null)
      setStatus('ready')
    },
    [pixelId, user.color]
  )

  return {
    error,
    pixelId,
    saveNickname,
    status,
    user,
  }
}
