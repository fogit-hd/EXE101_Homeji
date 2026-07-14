import { memo } from 'react'
import type { RentalPostSummary } from '../../api/types'
import type { MapPlaceDetails } from '../../lib/mapPlace'
import { RentalMap, type MarketplaceMapPin } from './RentalMap'
import type { MapPinLayers } from '../../lib/mapPinLayers'

const HOME_SELECTION_PAD = { top: 110, bottom: 100 }

export type HomeMapFocus = { lat: number; lng: number; zoom?: number }

type HomeMapStageProps = {
  posts: RentalPostSummary[]
  selectedPostId: string | null
  hoveredPostId: string | null
  onSelectPost: (postId: string) => void
  onClearSelection: () => void
  onSelectPlace?: (place: MapPlaceDetails) => void
  onPlaceLoading?: (loading: boolean) => void
  selectedPlacePin?: { lat: number; lng: number; title?: string } | null
  sharedLocationPin?: {
    lat: number
    lng: number
    title?: string
    kindLabel?: string
    token?: number
  } | null
  marketplacePins?: MarketplaceMapPin[]
  selectedMarketplaceId?: string | null
  onSelectMarketplace?: (id: string) => void
  pinLayers?: MapPinLayers
  focus: HomeMapFocus | null
  focusToken: number
  listingsFitToken?: number
  navigationRequest?: {
    origin: { lat: number; lng: number }
    destination: { lat: number; lng: number }
    token: number
    trafficAware?: boolean
    mode?: 'preview' | 'navigate'
  } | null
  onNavigationResult?: (
    summary: {
      distanceMeters: number
      durationMillis: number
      distanceText: string
      durationText: string
      steps: import('../../lib/mapRoutes').MapRouteStep[]
      trafficAware: boolean
      mode: 'preview' | 'navigate'
    } | null,
    error?: string | null,
  ) => void
  userLocation: { lat: number; lng: number } | null
  userAvatarUrl?: string | null
  userAvatarInitials?: string
  onLocate: () => void
  locating: boolean
}

/**
 * Memo shell around RentalMap — HomePage re-renders (omnibox typing, filters)
 * must not remount or re-reconcile the imperative map unless these props change.
 */
export const HomeMapStage = memo(function HomeMapStage({
  posts,
  selectedPostId,
  hoveredPostId,
  onSelectPost,
  onClearSelection,
  onSelectPlace,
  onPlaceLoading,
  selectedPlacePin = null,
  sharedLocationPin = null,
  marketplacePins = [],
  selectedMarketplaceId = null,
  onSelectMarketplace,
  pinLayers,
  focus,
  focusToken,
  listingsFitToken = 0,
  navigationRequest = null,
  onNavigationResult,
  userLocation,
  userAvatarUrl = null,
  userAvatarInitials = '?',
  onLocate,
  locating,
}: HomeMapStageProps) {
  return (
    <RentalMap
      posts={posts}
      selectedPostId={selectedPostId}
      hoveredPostId={hoveredPostId}
      onSelectPost={onSelectPost}
      onClearSelection={onClearSelection}
      onSelectPlace={onSelectPlace}
      onPlaceLoading={onPlaceLoading}
      selectedPlacePin={selectedPlacePin}
      sharedLocationPin={sharedLocationPin}
      marketplacePins={marketplacePins}
      selectedMarketplaceId={selectedMarketplaceId}
      onSelectMarketplace={onSelectMarketplace}
      pinLayers={pinLayers}
      focus={focus}
      userLocation={userLocation}
      userAvatarUrl={userAvatarUrl}
      userAvatarInitials={userAvatarInitials}
      onLocate={onLocate}
      locating={locating}
      focusToken={focusToken}
      listingsFitToken={listingsFitToken}
      navigationRequest={navigationRequest}
      onNavigationResult={onNavigationResult}
      selectionPad={HOME_SELECTION_PAD}
    />
  )
})
