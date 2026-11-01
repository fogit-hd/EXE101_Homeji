export type MemoryCard = { id: string; kind: number }
export const GAME_CARD_NAMES = ['Chậu cây', 'Chìa khóa', 'Đèn bàn', 'Ly nước']
export type MemoryGameState = { cards: MemoryCard[]; shown: number[]; matched: number[]; moves: number }
export type MemoryGameAction = { type: 'pick'; index: number } | { type: 'settle' } | { type: 'restart'; cards: MemoryCard[] }

export function shuffledMemoryCards(random = Math.random): MemoryCard[] {
  const cards = Array.from({ length: 8 }, (_, index) => ({ id: `card-${index}`, kind: index % 4 }))
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[cards[i], cards[j]] = [cards[j], cards[i]]
  }
  return cards
}

export function newMemoryGame(cards = shuffledMemoryCards()): MemoryGameState {
  return { cards, shown: [], matched: [], moves: 0 }
}

export function memoryGameReducer(state: MemoryGameState, action: MemoryGameAction): MemoryGameState {
  if (action.type === 'restart') return newMemoryGame(action.cards)
  if (action.type === 'settle') return state.shown.length === 2 ? { ...state, shown: [] } : state
  const { index } = action
  if (!Number.isInteger(index) || !state.cards[index] || state.shown.length === 2 || state.shown.includes(index) || state.matched.includes(index)) return state
  if (!state.shown.length) return { ...state, shown: [index] }
  const first = state.shown[0]
  const matched = state.cards[first].kind === state.cards[index].kind
  return { ...state, moves: state.moves + 1, shown: matched ? [] : [first, index], matched: matched ? [...state.matched, first, index] : state.matched }
}

const BEST_KEY = 'homeji.memory-best.v1'
export function readMemoryBest(): number | null {
  try {
    const value = Number(localStorage.getItem(BEST_KEY))
    return Number.isSafeInteger(value) && value >= 4 ? value : null
  } catch { return null }
}
export function saveMemoryBest(moves: number) {
  try { localStorage.setItem(BEST_KEY, String(moves)) } catch { /* Playing does not depend on browser storage. */ }
}
