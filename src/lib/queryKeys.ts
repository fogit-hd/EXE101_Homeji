export const SAVED_POSTS_CHANGED = 'homeji:saved-posts-changed'
export const savedPostsKey = (accountId: string | null) => ['saved-posts', accountId] as const
