import { NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import path from 'path'

/**
 * POST /api/home-config/sync-static
 * 将当前布局与导航配置写入 public/home-config.json，
 * 数据库不可用时首页会从此文件加载配置。
 * 注意：Vercel 等 serverless 环境文件系统只读，此接口在开发/自托管 Node 下可用。
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { layout, nav, canvas = null, theme = null } = body as {
      layout?: unknown
      nav?: unknown
      canvas?: unknown
      theme?: unknown
    }

    if (!layout || !nav || typeof layout !== 'object' || typeof nav !== 'object') {
      return NextResponse.json(
        { success: false, error: 'layout 和 nav 必填且需为对象' },
        { status: 400 }
      )
    }

    const config = { layout, nav, canvas, theme }
    const outputPath = path.join(process.cwd(), 'public', 'home-config.json')
    await writeFile(outputPath, JSON.stringify(config, null, 2), 'utf-8')

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : '写入静态配置失败'
    // EROFS = 只读文件系统（如 Vercel）
    const isReadOnly =
      err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code === 'EROFS'
    return NextResponse.json(
      {
        success: false,
        error: isReadOnly
          ? '当前环境不支持写入文件系统，请在本机或自托管 Node 环境中使用'
          : message,
      },
      { status: 500 }
    )
  }
}
