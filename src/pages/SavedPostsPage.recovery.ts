/** Restore only this room, preserving cache updates made since removal. */
export function restoreSavedPost<T extends { id: string }>(posts: T[], post: T, index: number): T[] {
  if (posts.some(item => item.id === post.id)) return posts
  const restored = [...posts]
  restored.splice(Math.max(0, Math.min(index, restored.length)), 0, post)
  return restored
}
