import { memo } from 'react'
import type { RentalPostSummary } from '../../api/types'
import type { MapPlaceDetails } from '../../lib/mapPlace'
import { RentalMap } from './RentalMap'

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
  focus: HomeMapFocus | null
  focusToken: number
  userLocation: { lat: number; lng: number } | null
  onLocate: () => void
  locating: boolean
  locationError: string
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
  focus,
  focusToken,
  userLocation,
  onLocate,
  locating,
  locationError,
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
      focus={focus}
      userLocation={userLocation}
      onLocate={onLocate}
      locating={locating}
      locationError={locationError}
      focusToken={focusToken}
      selectionPad={HOME_SELECTION_PAD}
    />
  )
})
