import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '摄影',
}

export default function PhotographyPage() {
  return (
    <main className="min-h-screen pl-24 pr-8 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
            <div
              key={i}
              className="aspect-square rounded-2xl bg-linear-to-br from-accent-primary-light via-accent-secondary-light to-accent-tertiary-light transition-transform hover:scale-105"
            />
          ))}
        </div>
      </div>
    </main>
  )
}
