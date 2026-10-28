import { useEffect, useState, type ReactNode } from 'react'
import { getMySubscription } from '../api/index'
import { useAuth } from './AuthContext'
import { RentalJourneyContext } from './rental-journey'
import { initialRentalScenario, toggleRentalChoice, type RentalChoice } from '../lib/rentalJourney'
import type { CostScenario } from '../api/rentalAssistant'

export function RentalJourneyProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, profile } = useAuth()
  const identity = isAuthenticated ? profile?.id ?? 'member-pending' : 'guest'
  return <OwnedRentalJourney key={identity} enabled={Boolean(isAuthenticated && profile?.id)} premiumHint={profile?.isPremium === true}>{children}</OwnedRentalJourney>
}

function OwnedRentalJourney({ children, enabled, premiumHint }: { children: ReactNode; enabled: boolean; premiumHint: boolean }) {
  const [maxChoices, setMaxChoices] = useState(3)
  useEffect(() => {
    if (!enabled) return
    let active = true, loading = false
    const check = async () => {
      if (loading || document.hidden) return
      loading = true
      try {
        const subscription = await getMySubscription()
        const premium = subscription.isPremium === true && subscription.maxComparedPosts === 5
          && Boolean(subscription.premiumExpiresAt && Date.parse(subscription.premiumExpiresAt) > Date.now())
        if (active) setMaxChoices(premium ? 5 : 3)
      } catch { if (active) setMaxChoices(3) }
      finally { loading = false }
    }
    void check()
    const interval = setInterval(() => void check(), 60_000)
    window.addEventListener('focus', check)
    document.addEventListener('visibilitychange', check)
    return () => { active = false; clearInterval(interval); window.removeEventListener('focus', check); document.removeEventListener('visibilitychange', check) }
  }, [enabled, premiumHint])
  const [choices, setChoices] = useState<RentalChoice[]>([])
  const [scenario, setScenario] = useState<CostScenario>(() => ({ ...initialRentalScenario }))
  return <RentalJourneyContext.Provider value={{ enabled, choices, scenario, maxChoices,
    toggle: choice => { if (enabled) setChoices(current => toggleRentalChoice(current, choice, maxChoices)) },
    remove: postId => setChoices(current => current.filter(item => item.postId !== postId)), setScenario,
  }}>{children}</RentalJourneyContext.Provider>
}
