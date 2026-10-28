import { createContext, useContext } from 'react'
import type { CostScenario } from '../api/rentalAssistant'
import type { RentalChoice } from '../lib/rentalJourney'

export type RentalJourney = {
  enabled: boolean
  maxChoices?: number
  choices: RentalChoice[]
  scenario: CostScenario
  toggle: (choice: RentalChoice) => void
  remove: (postId: string) => void
  setScenario: (scenario: CostScenario) => void
}
export const RentalJourneyContext = createContext<RentalJourney | null>(null)
export const useRentalJourney = () => useContext(RentalJourneyContext)
