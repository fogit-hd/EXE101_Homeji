export const showHubPremiumBadges = (posts: readonly { isOwnerPremium?: boolean | null }[]) =>
  posts.some(post => post.isOwnerPremium === true) && posts.some(post => post.isOwnerPremium !== true)
