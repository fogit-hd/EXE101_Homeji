import type {
  AiHighlightResponse,
  AiParsedSearchCriteria,
  ChatbotFoodContext,
  ChatbotFoodCriteria,
  ChatbotFoodResponse,
  ChatbotMessage,
  ChatbotNavigationAction,
  ChatbotRentalContext,
} from '../../../api'
import type { ChatbotDraftAttachment } from '../../../lib/chatbotMedia'
import type { ChatbotLocation } from '../../../lib/chatbotLocation'
import type { NearbyPlaceCategory } from '../../../lib/placeAutocomplete'
import type { DecisionResponse } from '../../../api/rentalAssistant'
import type { RentalAssistantComparison, RentalAssistantSelection } from '../../../contexts/rental-assistant-context'
import type { AgentPostDraft, AgentRoommateCandidate, ChatbotSourceMatch } from '../../../api/chatbotAgent'
import type { ChatbotNearbyResponse } from '../../ai/ChatbotNearbyResults'

export type ChatRequest = {
  location?: ChatbotLocation
  agentDraftId?: string
  postingAgent?: boolean
  sessionMessages?: ChatbotMessage[]
  attachments?: ChatbotDraftAttachment[]
  message: string
  context?: RentalAssistantSelection & { task?: ChatbotRentalContext['task'] }
  selection?: RentalAssistantComparison & { task?: 'compare' | 'cost' | 'questions' | 'details' }
  conversationId?: string
  previousCriteria?: AiParsedSearchCriteria
  saveHistory: boolean
  foodContext?: ChatbotFoodContext
  previousFoodCriteria?: ChatbotFoodCriteria
}

export type DisplayMessage = ChatbotMessage & {
  roommateCandidates?: AgentRoommateCandidate[] | null
  nearbyRooms?: ChatbotNearbyResponse | null
  sourceRooms?: ChatbotSourceMatch | null
  agentDraft?: AgentPostDraft | null
  upgradeRequired?: boolean
  attachments?: ChatbotDraftAttachment[]
  pending?: boolean
  retry?: ChatRequest
  failure?: string
  rentalContext?: RentalAssistantSelection
  rentalSelection?: RentalAssistantComparison
  rentalDecision?: DecisionResponse | null
  actions?: ChatbotNavigationAction[]
  searchUpdate?: AiHighlightResponse | null
  foodDiscovery?: ChatbotFoodResponse | null
  foodQuery?: string
}

export type { NearbyPlaceCategory }
