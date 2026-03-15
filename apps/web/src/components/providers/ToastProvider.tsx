'use client'

import { Toaster } from 'sonner'

export function ToastProvider() {
  return (
    <Toaster
      position="top-center"
      richColors
      closeButton
      toastOptions={{
        style: { maxWidth: 'min(420px, 100vw - 24px)' },
      }}
    />
  )
}
