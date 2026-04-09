const WHISPER_TIMESTAMP_LINE_PATTERN =
  /^\s*\[(\d{2}:){2}\d{2}(?:[.,]\d{3})?\s*-->\s*(\d{2}:){2}\d{2}(?:[.,]\d{3})?\]\s*/

export function normalizeWhisperTranscript(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(WHISPER_TIMESTAMP_LINE_PATTERN, '').trim())
    .filter(Boolean)
    .join('\n')
    .trim()
}
