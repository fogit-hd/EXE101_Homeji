export type ChatGif = { id: string }
export type ResolvedChatGif = ChatGif & { title: string; url: string; creator?: string }
const prefix = 'homeji:gif:v1:'
export function parseChatGif(body: string): ChatGif | null {
  if (!body.startsWith(prefix) || body.length > 2000) return null
  try {
    const data = JSON.parse(body.slice(prefix.length))
    // Stored messages use the server's serializer; support both casing conventions.
    const id = data.id ?? data.Id
    if (typeof id !== 'string' || !/^[a-zA-Z0-9]{1,80}$/.test(id) || Object.keys(data).some(key => key !== 'id' && key !== 'Id')) return null
    return { id }
  } catch { return null }
}
