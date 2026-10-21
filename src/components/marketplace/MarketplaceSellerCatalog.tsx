import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { MarketplaceListingType, type MarketplacePost } from '../../api/types'
import { groupMarketplaceBySeller, marketplaceStoreUrl } from '../../lib/marketplaceSellers'
import './MarketplaceSellerCatalog.css'

type Props = {
  posts: MarketplacePost[]
  renderItem: (post: MarketplacePost) => ReactNode
  selectedSellerId?: string | null
  layout?: 'grid' | 'list'
}

export function MarketplaceSellerCatalog({ posts, renderItem, selectedSellerId, layout = 'grid' }: Props) {
  const sellers = useMemo(() => groupMarketplaceBySeller(posts), [posts])
  return <div className={`seller-catalog${layout === 'list' ? ' seller-catalog--list' : ''}`} aria-label="Sản phẩm theo người bán">
    {sellers.map(seller => {
      const visiblePosts = layout === 'list' || selectedSellerId === seller.sellerId ? seller.posts : seller.posts.slice(0, 3)
      return <section key={seller.sellerId || seller.posts[0].id} className="seller-catalog__shop" aria-label={`Cửa hàng ${seller.sellerName}`}>
      <header className="seller-catalog__head">
        <span className="seller-catalog__avatar" aria-hidden="true">{seller.sellerName.slice(0, 1).toUpperCase()}</span>
        <div className="seller-catalog__identity">
          <h3>{seller.sellerName}</h3>
          <p>{seller.posts.length} sản phẩm{layout === 'grid' ? ' trong kết quả này' : ''}</p>
        </div>
        {seller.sellerId && selectedSellerId !== seller.sellerId && <Link className={`seller-catalog__open${layout === 'grid' ? ' btn btn-secondary' : ''}`}
          data-glass-exclude={layout === 'list' || undefined}
          aria-label={`Xem cửa hàng của ${seller.sellerName}`}
          to={marketplaceStoreUrl(seller.sellerId, seller.posts.every(post => post.listingType === MarketplaceListingType.Food))}>
          Xem cửa hàng
        </Link>}
      </header>
      <ul className="seller-catalog__items">
        {visiblePosts.map(post => <li key={post.id}>{renderItem(post)}</li>)}
      </ul>
      {visiblePosts.length < seller.posts.length ? <p className="seller-catalog__more">Đang xem {visiblePosts.length}/{seller.posts.length} sản phẩm trong kết quả. Mở cửa hàng để xem thêm.</p> : null}
    </section>})}
  </div>
}
