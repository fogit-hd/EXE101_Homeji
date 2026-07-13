import { useCallback, useState } from 'react'
import { getSavedPosts, unsavePost, type RentalPostSummary } from '../api'
import { HomejiLoader, usePersistentLoad } from '../components/HomejiLoader'
import { RentalPostCard } from '../components/RentalPostCard'

export function SavedPostsPage({ embedded = false }: { embedded?: boolean }) {
  const [posts, setPosts] = useState<RentalPostSummary[]>([])

  const loadFn = useCallback(async () => {
    setPosts(await getSavedPosts())
  }, [])

  const { showLoader, onIntroComplete, error, disrupted } = usePersistentLoad(loadFn)

  const handleUnsave = async (postId: string) => {
    await unsavePost(postId)
    setPosts((prev) => prev.filter((p) => p.id !== postId))
  }

  return (
    <div className={embedded ? 'map-embed' : 'container page'}>
      {!embedded ? (
        <>
          <h1 className="page-title">Tin đã lưu</h1>
          <p className="page-subtitle">Danh sách phòng bạn quan tâm</p>
        </>
      ) : null}
      {error && !disrupted && <div className="alert alert-error">{error}</div>}

      {showLoader ? (
        <HomejiLoader
          onIntroComplete={onIntroComplete}
          message={disrupted ? error : undefined}
        />
      ) : posts.length === 0 ? (
        <div className="empty-state card">Chưa có tin nào được lưu.</div>
      ) : (
        <div className="grid-posts">
          {posts.map((post) => (
            <RentalPostCard
              key={post.id}
              post={post}
              showSave
              isSaved
              onUnsave={() => void handleUnsave(post.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
