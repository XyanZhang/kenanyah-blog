'use client'

import { useDashboardStore } from '@/store/dashboard-store'

export function useDashboard() {
  return useDashboardStore()
}
