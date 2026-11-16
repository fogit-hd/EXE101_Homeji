/*
 * The film as one H.264 stream (tmp/pack-film.mjs): a keyframe every 8th frame, no B-frames, and an
 * index of where each frame's bytes are. Any frame is decoded with WebCodecs by feeding its group
 * (keyframe → frame) to a VideoDecoder, which is what lets the scroll pick frames out of a video
 * without the lag of seeking a <video> element.
 *
 * File: "HJF1", u32 (LE) header length, JSON header, then the stream.
 */

type Header = { codec: string; width: number; height: number; frames: number[]; units: [number, number, number][] }

export function canDecodeVideo() {
  return typeof window !== 'undefined' && 'VideoDecoder' in window && 'EncodedVideoChunk' in window
}

export class FilmVideo {
  readonly frames: number[]
  private header: Header
  private data: Uint8Array
  private decoder: VideoDecoder | null = null
  /** Groups (by their keyframe's index) waiting to be decoded, nearest first. */
  private queue: number[] = []
  private busy = false
  /**
   * Software decoding: the hardware decoder restarts after every flush (~130 ms on the GPU, felt as a
   * stutter), while a 720p frame decodes in a few ms on the CPU, off the main thread.
   */
  private hardware: HardwareAcceleration = 'prefer-software'
  private closed = false
  private pending = new Map<number, Promise<void>>()
  /** Called with each decoded frame (its film frame number); the receiver owns the bitmap. */
  onFrame?: (frame: number, bitmap: ImageBitmap) => void
  /**
   * Called instead of onFrame when set, with the decoder's own frame (the receiver owns and closes it).
   * A WebGL receiver uploads it as it is, skipping the copy into an ImageBitmap on the main thread.
   */
  onVideoFrame?: (frame: number, video: VideoFrame) => void

  static async load(url: string): Promise<FilmVideo> {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`film missing: ${url}`)
    const buffer = await response.arrayBuffer()
    const view = new DataView(buffer)
    if (new TextDecoder().decode(new Uint8Array(buffer, 0, 4)) !== 'HJF1') throw new Error('not a film')
    const length = view.getUint32(4, true)
    const header = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 8, length))) as Header
    const support = await VideoDecoder.isConfigSupported({ codec: header.codec, codedWidth: header.width, codedHeight: header.height })
    if (!support.supported) throw new Error(`codec not supported: ${header.codec}`)
    return new FilmVideo(header, new Uint8Array(buffer, 8 + length))
  }

  private constructor(header: Header, data: Uint8Array) {
    this.header = header
    this.data = data
    this.frames = header.frames
  }

  private keyOf(index: number) {
    let k = index
    while (k > 0 && !this.header.units[k][2]) k -= 1
    return k
  }

  /** Decode the groups holding these frame indices, in the order given (nearest first). */
  want(indices: number[]) {
    if (this.closed) return
    const keys: number[] = []
    for (const index of indices) {
      if (index < 0 || index >= this.frames.length) continue
      const key = this.keyOf(index)
      if (!keys.includes(key) && !this.pending.has(key)) keys.push(key)
    }
    this.queue = keys
    void this.pump()
  }

  private ensureDecoder() {
    if (this.decoder && this.decoder.state !== 'closed') return this.decoder
    const decoder = new VideoDecoder({
      output: frame => {
        const index = Math.round(frame.timestamp / 1000)
        if (this.onVideoFrame) {
          if (this.closed) frame.close()
          else this.onVideoFrame(this.frames[index], frame)
          return
        }
        createImageBitmap(frame)
          .then(bitmap => {
            if (this.closed || !this.onFrame) return bitmap.close()
            this.onFrame(this.frames[index], bitmap)
          })
          .catch(() => {})
          .finally(() => frame.close())
      },
      error: error => {
        if (import.meta.env.DEV) console.warn('film decoder', error.message)
        this.decoder = null
      },
    })
    decoder.configure({ codec: this.header.codec, codedWidth: this.header.width, codedHeight: this.header.height, optimizeForLatency: true, hardwareAcceleration: this.hardware })
    this.decoder = decoder
    return decoder
  }

  private async pump() {
    if (this.busy) return
    this.busy = true
    try {
      while (!this.closed && this.queue.length) {
        const key = this.queue.shift()!
        const job = this.decodeGroup(key)
        this.pending.set(key, job)
        await job.catch(() => {})
        this.pending.delete(key)
      }
    } finally {
      this.busy = false
    }
  }

  private async decodeGroup(key: number) {
    const decoder = this.ensureDecoder()
    const { units } = this.header
    for (let i = key; i < units.length && (i === key || !units[i][2]); i += 1) {
      const [offset, size, isKey] = units[i]
      decoder.decode(new EncodedVideoChunk({ type: isKey ? 'key' : 'delta', timestamp: i * 1000, data: this.data.subarray(offset, offset + size) }))
    }
    await decoder.flush()
  }

  /** Stops decoding and lets the decoder go, keeping the bytes: want() starts again from here. */
  pause() {
    this.queue = []
    this.onFrame = this.onVideoFrame = undefined
    if (this.decoder && this.decoder.state !== 'closed') this.decoder.close()
    this.decoder = null
  }

  close() {
    this.closed = true
    this.queue = []
    if (this.decoder && this.decoder.state !== 'closed') this.decoder.close()
    this.decoder = null
  }
}
