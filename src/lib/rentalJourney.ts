import type { CostScenario, DecisionResponse } from '../api/rentalAssistant'

export type RentalChoice = { postId: string; title: string }
export const MAX_RENTAL_CHOICES = 3
export const initialRentalScenario: CostScenario = {
  occupants: 1, electricityKwh: 0, waterM3: 0,
  electricityUnit: 'unknown', waterUnit: 'unknown', internetUnit: 'unknown',
}

/** Keep only the IDs and bounded display titles needed by this account's journey. */
export function toggleRentalChoice(current: RentalChoice[], choice: RentalChoice, limit = MAX_RENTAL_CHOICES): RentalChoice[] {
  if (!choice.postId.trim() || choice.postId.length > 128) return current
  if (current.some(item => item.postId === choice.postId)) return current.filter(item => item.postId !== choice.postId)
  const cap = limit === 5 ? 5 : MAX_RENTAL_CHOICES
  if (current.length >= cap) return current
  return [...current, { postId: choice.postId, title: choice.title.slice(0, 200) }]
}

export function rentalScenarioSnapshot(scenario: CostScenario): CostScenario {
  return {
    occupants: scenario.occupants, electricityKwh: scenario.electricityKwh, waterM3: scenario.waterM3,
    electricityUnit: scenario.electricityUnit, waterUnit: scenario.waterUnit, internetUnit: scenario.internetUnit,
    otherMonthlyFees: scenario.otherMonthlyFees, otherInitialFees: scenario.otherInitialFees,
    electricityFreeConfirmed: scenario.electricityFreeConfirmed, waterFreeConfirmed: scenario.waterFreeConfirmed,
    internetFreeConfirmed: scenario.internetFreeConfirmed, depositFreeConfirmed: scenario.depositFreeConfirmed,
  }
}

export function decisionMatchesChoices(decision: DecisionResponse | null | undefined, postIds: string[]): boolean {
  if (!decision) return false
  const received = [...decision.posts.map(item => item.post.id), ...decision.unavailablePostIds]
  return received.length === postIds.length && new Set(received).size === received.length
    && received.every(id => postIds.includes(id))
}
