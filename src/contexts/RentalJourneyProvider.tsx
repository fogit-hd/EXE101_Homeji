import { useState, type ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { RentalJourneyContext } from './rental-journey'
import { initialRentalScenario, toggleRentalChoice, type RentalChoice } from '../lib/rentalJourney'
import type { CostScenario } from '../api/rentalAssistant'

export function RentalJourneyProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, profile } = useAuth()
  const identity = isAuthenticated ? profile?.id ?? 'member-pending' : 'guest'
  return <OwnedRentalJourney key={identity} enabled={Boolean(isAuthenticated && profile?.id)}>{children}</OwnedRentalJourney>
}

function OwnedRentalJourney({ children, enabled }: { children: ReactNode; enabled: boolean }) {
  const [choices, setChoices] = useState<RentalChoice[]>([])
  const [scenario, setScenario] = useState<CostScenario>(() => ({ ...initialRentalScenario }))
  return <RentalJourneyContext.Provider value={{ enabled, choices, scenario,
    toggle: choice => { if (enabled) setChoices(current => toggleRentalChoice(current, choice)) },
    remove: postId => setChoices(current => current.filter(item => item.postId !== postId)), setScenario,
  }}>{children}</RentalJourneyContext.Provider>
}
