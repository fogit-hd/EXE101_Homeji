/** UI routing only. The server independently chooses the domain and queries public stock. */
export function isFoodChat(text: string): boolean {
  const normalized = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd')
  const food = /\b(do an|thuc an|mon an|quan an|co gi an|an gi|an uong|doi bung|dang doi|minh doi|tui doi|toi doi|com|bun|pho|banh mi|mi xao|tra sua|an sang|an trua|an toi)\b/.exec(normalized)
  const housing = /\b(phong|tro|can ho|o ghep|nha thue)\b/.exec(normalized)
  return Boolean(food && (!housing || food.index < housing.index))
}

export function isFoodDiscoveryChat(text: string): boolean {
  const normalized = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd')
  return isFoodChat(text) && !/\b(cach|huong dan|lam sao|nhu the nao|gio hang|don hang|thanh toan|huy don|hoan tien|muon dat do an|muon mua do an)\b/.test(normalized)
}
