import type { Metadata } from 'next'
import { Camera } from 'lucide-react'

export const metadata: Metadata = {
  title: '摄影',
}

export default function PhotographyPage() {
  return (
    <main className="min-h-screen pl-24 pr-8 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-100 to-blue-100">
            <Camera className="h-6 w-6 text-purple-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">摄影</h1>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
            <div
              key={i}
              className="aspect-square rounded-2xl bg-gradient-to-br from-purple-200 via-blue-200 to-cyan-200 transition-transform hover:scale-105"
            />
          ))}
        </div>
      </div>
    </main>
  )
}
