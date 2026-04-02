export function createAbortError(message = '请求已取消'): Error {
  const error = new Error(message)
  error.name = 'AbortError'
  return error
}

export function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (error instanceof Error && error.name === 'AbortError')
  )
}

export function throwIfAborted(signal?: AbortSignal): void {
  if (!signal?.aborted) {
    return
  }

  if (signal.reason instanceof Error) {
    if (signal.reason.name === 'AbortError') {
      throw signal.reason
    }

    const error = new Error(signal.reason.message)
    error.name = 'AbortError'
    throw error
  }

  if (typeof signal.reason === 'string' && signal.reason.trim()) {
    throw createAbortError(signal.reason)
  }

  throw createAbortError()
}
