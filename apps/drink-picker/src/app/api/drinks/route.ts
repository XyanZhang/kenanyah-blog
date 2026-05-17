import { NextResponse } from 'next/server'
import { z } from 'zod'
import { brandSchema, drinkPatchSchema, drinkSchema } from '@/lib/drink-schema'
import {
  createDrink,
  deleteDrink,
  listDrinks,
  setDrinkAvailability,
  updateDrink,
} from '@/lib/drink-repository'

const listQuerySchema = z.object({
  brand: brandSchema.optional(),
  includeUnavailable: z.enum(['true', 'false']).optional(),
})

const updateBodySchema = z.object({
  id: z.string().min(1),
  patch: drinkPatchSchema,
})

const deleteBodySchema = z.object({
  id: z.string().min(1),
  mode: z.enum(['soft', 'hard']).optional(),
})

function assertCanWrite(request: Request): NextResponse | null {
  const adminToken = process.env.DRINK_ADMIN_TOKEN
  if (!adminToken) {
    return NextResponse.json(
      { success: false, error: '未配置商品管理令牌' },
      { status: 503 },
    )
  }

  const requestToken = request.headers.get('x-drink-admin-token')
  if (requestToken !== adminToken) {
    return NextResponse.json(
      { success: false, error: '无权修改商品数据' },
      { status: 401 },
    )
  }

  return null
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const parsed = listQuerySchema.safeParse({
    brand: url.searchParams.get('brand') ?? undefined,
    includeUnavailable: url.searchParams.get('includeUnavailable') ?? undefined,
  })

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: '参数错误', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const drinks = listDrinks({
    brand: parsed.data.brand,
    includeUnavailable: parsed.data.includeUnavailable === 'true',
  })

  return NextResponse.json({ success: true, data: drinks })
}

export async function POST(request: Request) {
  try {
    const guard = assertCanWrite(request)
    if (guard) return guard

    const body = await request.json()
    const parsed = drinkSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: '参数错误', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const drink = createDrink(parsed.data)
    return NextResponse.json({ success: true, data: drink }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '创建失败' },
      { status: 500 },
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const guard = assertCanWrite(request)
    if (guard) return guard

    const body = await request.json()
    const parsed = updateBodySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: '参数错误', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const drink = updateDrink(parsed.data.id, parsed.data.patch)
    return NextResponse.json({ success: true, data: drink })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '更新失败' },
      { status: 500 },
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const guard = assertCanWrite(request)
    if (guard) return guard

    const body = await request.json()
    const parsed = deleteBodySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: '参数错误', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const drink = parsed.data.mode === 'hard'
      ? deleteDrink(parsed.data.id)
      : setDrinkAvailability(parsed.data.id, false)

    return NextResponse.json({ success: true, data: drink })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '删除失败' },
      { status: 500 },
    )
  }
}
