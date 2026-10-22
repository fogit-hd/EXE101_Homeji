import { createContext, useContext, useEffect } from 'react'
import type { CostScenario } from '../api/rentalAssistant'

export type RentalAssistantSelection = { postId: string; title: string }
export type RegisterRentalAssistantSelection = (selection: RentalAssistantSelection) => () => void
export type RentalAssistantComparison = { postIds: string[]; title: string; scenario: CostScenario }
export type RegisterRentalAssistantComparison = (selection: RentalAssistantComparison) => () => void

export const RentalAssistantSelectionContext = createContext<RegisterRentalAssistantSelection | null>(null)
export const RentalAssistantOpenerContext = createContext<(() => void) | undefined>(undefined)
export const RentalAssistantComparisonContext = createContext<RegisterRentalAssistantComparison | null>(null)

export function useRentalAssistantOpener() {
  return useContext(RentalAssistantOpenerContext)
}

export function useRentalAssistantComparison(selection: RentalAssistantComparison | null) {
  const register = useContext(RentalAssistantComparisonContext)
  const key = selection ? JSON.stringify(selection) : ''
  useEffect(() => {
    if (!register || !key) return
    return register(JSON.parse(key) as RentalAssistantComparison)
  }, [register, key])
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
