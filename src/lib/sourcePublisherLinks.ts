import rows from './sourcePublisherLinks.generated.json'

type PublisherLink = { sourceId: string; ownerId: string; nativePostId: string | null }
// Public IDs exported by the idempotent publisher import. No contacts or credentials.
const links = new Map<string, PublisherLink>(rows.map(row => [row.sourceId, row]))
export function sourcePublisherLink(id: string): PublisherLink | undefined { return links.get(id) }
export function isImportedRentalPost(post: { id?: string; isImportedSource?: boolean }): boolean {
  return post.isImportedSource === true || Boolean(post.id && links.get(post.id)?.nativePostId === post.id)
}
