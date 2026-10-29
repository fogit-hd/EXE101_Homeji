import { apiRequest } from '../api/client'
import type { ResolvedChatGif } from './chatGif'

export function readGiphyItem(data: unknown): ResolvedChatGif {
  const item = data as { id?: unknown; title?: unknown; rating?: unknown; images?: { fixed_height?: { url?: unknown } } }
  if (!item || typeof item.id !== 'string' || !/^[a-zA-Z0-9]{1,80}$/.test(item.id) || item.rating !== 'g' || typeof item.title !== 'string' || typeof item.images?.fixed_height?.url !== 'string') throw new Error('GIF này không còn khả dụng.')
  const uri = new URL(item.images.fixed_height.url)
  if (uri.protocol !== 'https:' || !/^media\d*\.giphy\.com$/.test(uri.hostname) || uri.username || uri.password || uri.port) throw new Error('Đường dẫn GIF không hợp lệ.')
  return { id: item.id, title: item.title, url: item.images.fixed_height.url }
}

async function request(path: string, params: URLSearchParams, signal: AbortSignal): Promise<{ data: unknown }> {
  const { apiKey } = await apiRequest<{ apiKey: string }>('/api/chat/gif-config', { signal })
  signal.throwIfAborted()
  params.set('api_key', apiKey)
  // Provider rules require direct browser requests and prohibit response/URL caching.
  const timeout = AbortSignal.timeout(10000)
  const response = await fetch(`https://api.giphy.com/v1/gifs/${path}?${params}`, { signal: AbortSignal.any([signal, timeout]), cache: 'no-store', referrerPolicy: 'no-referrer' })
  if (!response.ok) throw new Error('Dịch vụ GIF đang bận. Vui lòng thử lại sau.')
  return response.json()
}

export async function searchChatGifs(query: string, signal: AbortSignal): Promise<ResolvedChatGif[]> {
  if (query.length > 50) throw new Error('Từ khóa GIF không quá 50 ký tự.')
  const params = new URLSearchParams({ limit: '24', rating: 'g', lang: 'vi' })
  if (query.trim()) params.set('q', query)
  const result = await request(query.trim() ? 'search' : 'trending', params, signal)
  if (!Array.isArray(result.data)) throw new Error('Không tải được danh sách GIF.')
  return result.data.map(readGiphyItem)
}

export async function resolveChatGif(id: string, signal: AbortSignal): Promise<ResolvedChatGif> {
  if (!/^[a-zA-Z0-9]{1,80}$/.test(id)) throw new Error('Mã GIF không hợp lệ.')
  const result = await request(encodeURIComponent(id), new URLSearchParams(), signal)
  const gif = readGiphyItem(result.data)
  if (gif.id !== id) throw new Error('Mã GIF không khớp.')
  return gif
}
