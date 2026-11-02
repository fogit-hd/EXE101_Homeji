import type { RentalAssistantComparison, RentalAssistantSelection } from '../../../contexts/rental-assistant-context'
import { rentalScenarioSnapshot } from '../../../lib/rentalJourney'

export function rentalTargetKey(room?: RentalAssistantSelection | null, selection?: RentalAssistantComparison | null) {
  return selection ? `choices:${JSON.stringify([selection.postIds, rentalScenarioSnapshot(selection.scenario)])}` : room ? `room:${room.postId}` : ''
}
