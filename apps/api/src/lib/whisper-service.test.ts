import { describe, expect, it } from 'vitest'
import { normalizeWhisperTranscript } from './whisper-transcript'

describe('normalizeWhisperTranscript', () => {
  it('removes whisper timestamp prefixes from transcript lines', () => {
    const input = [
      '[00:00:00.000 --> 00:00:04.860] 你好，帮我写一段摘要',
      '[00:00:04.860 --> 00:00:07.120] 再补充三个要点',
    ].join('\n')

    expect(normalizeWhisperTranscript(input)).toBe(
      '你好，帮我写一段摘要\n再补充三个要点'
    )
  })

  it('drops standalone timestamp lines and keeps normal text intact', () => {
    const input = [
      '[00:00:00.000 --> 00:00:04.860]',
      '这一行是真正的识别文本',
      '',
      '保留原本没有时间戳的内容',
    ].join('\n')

    expect(normalizeWhisperTranscript(input)).toBe(
      '这一行是真正的识别文本\n保留原本没有时间戳的内容'
    )
  })
})
