import { createContext, useContext, useEffect } from 'react'

export type RentalAssistantSelection = { postId: string; title: string }
export type RegisterRentalAssistantSelection = (selection: RentalAssistantSelection) => () => void

export const RentalAssistantSelectionContext = createContext<RegisterRentalAssistantSelection | null>(null)
export const RentalAssistantOpenerContext = createContext<(() => void) | undefined>(undefined)

export function useRentalAssistantOpener() {
  return useContext(RentalAssistantOpenerContext)
}

/** The room stays selected only while the registering surface is mounted. */
export function useRentalAssistantSelection(selection: RentalAssistantSelection | null) {
  const register = useContext(RentalAssistantSelectionContext)
  const postId = selection?.postId
  const title = selection?.title
  useEffect(() => {
    if (!register || !postId) return
    return register({ postId, title: title ?? '' })
  }, [register, postId, title])
}
