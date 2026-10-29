export const VOICE_SAMPLE_RATE = 16000
export const MAX_VOICE_SECONDS = 120

/** Canonical mono PCM WAV: the API validates this same, deliberately small format. */
export function encodeVoiceWav(chunks: Int16Array[]): Blob {
  const samples = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  if (samples < VOICE_SAMPLE_RATE * 0.3 || samples > VOICE_SAMPLE_RATE * MAX_VOICE_SECONDS) throw new Error('Bản ghi cần dài từ 0,3 giây đến 2 phút.')
  const bytes = new ArrayBuffer(44 + samples * 2)
  const view = new DataView(bytes)
  const text = (offset: number, value: string) => { for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i)) }
  text(0, 'RIFF'); view.setUint32(4, bytes.byteLength - 8, true); text(8, 'WAVE'); text(12, 'fmt ')
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true)
  view.setUint32(24, VOICE_SAMPLE_RATE, true); view.setUint32(28, VOICE_SAMPLE_RATE * 2, true)
  view.setUint16(32, 2, true); view.setUint16(34, 16, true); text(36, 'data'); view.setUint32(40, samples * 2, true)
  let offset = 44
  for (const chunk of chunks) for (const sample of chunk) { view.setInt16(offset, sample, true); offset += 2 }
  return new Blob([bytes], { type: 'audio/wav' })
}
