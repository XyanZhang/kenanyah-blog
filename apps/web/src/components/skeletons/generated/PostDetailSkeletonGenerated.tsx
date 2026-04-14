import {
  GeneratedSkeletonScene,
  type GeneratedSkeletonFrame,
  type GeneratedSkeletonShape,
} from '@/components/skeletons/GeneratedSkeletonScene'

const frame: GeneratedSkeletonFrame = {
  tag: 'main',
  width: 1140,
  height: 980,
  paddingTop: 32,
  paddingRight: 16,
  paddingBottom: 48,
  paddingLeft: 16,
  centered: true,
}

const shapes: GeneratedSkeletonShape[] = [
  { id: 'line-1', kind: 'line', x: 0, y: 0, width: 12, height: 1.4, radius: 9999, opacity: 0.95 },
  { id: 'surface-2', kind: 'surface', x: 0, y: 6, width: 79, height: 82, radius: 20, opacity: 0.7 },
  { id: 'line-3', kind: 'line', x: 3.5, y: 11.5, width: 54, height: 2.2, radius: 9999, opacity: 0.95 },
  { id: 'line-4', kind: 'line', x: 3.5, y: 15.4, width: 36, height: 1.35, radius: 9999, opacity: 0.92 },
  { id: 'line-5', kind: 'line', x: 3.5, y: 20, width: 44, height: 1.5, radius: 9999, opacity: 0.9 },
  { id: 'block-6', kind: 'block', x: 0, y: 28, width: 79, height: 26, radius: 18, opacity: 0.88 },
  { id: 'line-7', kind: 'line', x: 3.5, y: 59.5, width: 63, height: 1.3, radius: 9999, opacity: 0.95 },
  { id: 'line-8', kind: 'line', x: 3.5, y: 63, width: 58, height: 1.3, radius: 9999, opacity: 0.95 },
  { id: 'line-9', kind: 'line', x: 3.5, y: 66.5, width: 61, height: 1.3, radius: 9999, opacity: 0.95 },
  { id: 'line-10', kind: 'line', x: 3.5, y: 70, width: 42, height: 1.3, radius: 9999, opacity: 0.9 },
  { id: 'line-11', kind: 'line', x: 3.5, y: 76.2, width: 56, height: 1.3, radius: 9999, opacity: 0.95 },
  { id: 'line-12', kind: 'line', x: 3.5, y: 79.6, width: 60, height: 1.3, radius: 9999, opacity: 0.95 },
  { id: 'line-13', kind: 'line', x: 3.5, y: 83, width: 48, height: 1.3, radius: 9999, opacity: 0.9 },
]

export default function PostDetailSkeletonGenerated() {
  return <GeneratedSkeletonScene frame={frame} shapes={shapes} />
}
