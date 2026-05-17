import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import type { Brand, Drink } from '@/types'
import { drinks as seedDrinks } from '@/data/drinks'

const dataDir = path.join(process.cwd(), 'data')
const dataFile = path.join(dataDir, 'drinks.json')

interface ListDrinksOptions {
  brand?: Brand
  includeUnavailable?: boolean
}

function ensureDataFile() {
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true })
  }

  if (!existsSync(dataFile)) {
    writeFileSync(dataFile, JSON.stringify(seedDrinks.map(normalizeDrink), null, 2), 'utf-8')
  }
}

function normalizeDrink(drink: Drink): Drink {
  return {
    ...drink,
    isAvailable: drink.isAvailable ?? true,
    source: drink.source ?? 'manual',
    updatedAt: drink.updatedAt ?? new Date().toISOString(),
  }
}

function readStoredDrinks(): Drink[] {
  ensureDataFile()
  const content = readFileSync(dataFile, 'utf-8')
  const parsed = JSON.parse(content) as Drink[]
  return parsed.map(normalizeDrink)
}

function writeStoredDrinks(drinks: Drink[]) {
  ensureDataFile()
  writeFileSync(dataFile, `${JSON.stringify(drinks, null, 2)}\n`, 'utf-8')
}

export function listDrinks(options: ListDrinksOptions = {}): Drink[] {
  return readStoredDrinks().filter((drink) => {
    if (options.brand && drink.brand !== options.brand) return false
    if (!options.includeUnavailable && drink.isAvailable === false) return false
    return true
  })
}

export function createDrink(input: Drink): Drink {
  const drinks = readStoredDrinks()
  if (drinks.some((drink) => drink.id === input.id)) {
    throw new Error(`Drink already exists: ${input.id}`)
  }

  const nextDrink = normalizeDrink({ ...input, updatedAt: new Date().toISOString() })
  writeStoredDrinks([...drinks, nextDrink])
  return nextDrink
}

export function updateDrink(id: string, patch: Partial<Drink>): Drink {
  const drinks = readStoredDrinks()
  const index = drinks.findIndex((drink) => drink.id === id)
  if (index < 0) {
    throw new Error(`Drink not found: ${id}`)
  }

  const nextDrink = normalizeDrink({
    ...drinks[index],
    ...patch,
    id,
    updatedAt: new Date().toISOString(),
  })
  const nextDrinks = [...drinks]
  nextDrinks[index] = nextDrink
  writeStoredDrinks(nextDrinks)
  return nextDrink
}

export function deleteDrink(id: string): Drink {
  const drinks = readStoredDrinks()
  const target = drinks.find((drink) => drink.id === id)
  if (!target) {
    throw new Error(`Drink not found: ${id}`)
  }

  writeStoredDrinks(drinks.filter((drink) => drink.id !== id))
  return target
}

export function setDrinkAvailability(id: string, isAvailable: boolean): Drink {
  return updateDrink(id, { isAvailable })
}
