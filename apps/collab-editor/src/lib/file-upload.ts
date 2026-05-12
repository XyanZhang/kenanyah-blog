import { blogApiUrl } from './env'

type UploadImageResponse = {
  success: boolean
  data?: { url: string }
  error?: string
}

export async function uploadEditorFile(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('当前只支持上传图片文件')
  }

  const form = new FormData()
  form.set('file', file)

  const response = await fetchUpload(form)
  const payload = (await response.json().catch(() => null)) as UploadImageResponse | null
  if (!response.ok || !payload?.success || !payload.data?.url) {
    throw new Error(payload?.error || '图片上传失败')
  }

  return payload.data.url
}

async function fetchUpload(form: FormData): Promise<Response> {
  try {
    return await fetch(`${blogApiUrl}/collab/images`, {
      method: 'POST',
      credentials: 'include',
      body: form,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '网络请求失败'
    throw new Error(`图片上传接口无法访问：${message}。请确认 API 服务已启动，且 VITE_BLOG_API_URL 指向正确。`)
  }
}
