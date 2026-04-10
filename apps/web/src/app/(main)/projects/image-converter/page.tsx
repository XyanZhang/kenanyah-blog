import type { Metadata } from 'next'
import { ImageConverterStudio } from '@/components/projects/ImageConverterStudio'

export const metadata: Metadata = {
  title: '图片格式转换',
}

export default function ImageConverterPage() {
  return <ImageConverterStudio />
}
