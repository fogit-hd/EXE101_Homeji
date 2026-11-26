/** The Premium label must never be inferred from an editorial highlight tag. */
export function listingHighlight(post: { highlightTag?: string | null; isOwnerPremium?: boolean }): string | null {
  const tag = post.highlightTag?.trim() || null
  return tag?.toLocaleLowerCase('vi') === 'nổi bật' && post.isOwnerPremium !== true ? null : tag
}
