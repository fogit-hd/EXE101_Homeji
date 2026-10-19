import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { MarketplaceListingType, type MarketplacePost } from '../../api/types'
import { groupMarketplaceBySeller, marketplaceStoreUrl } from '../../lib/marketplaceSellers'
import './MarketplaceSellerCatalog.css'

type Props = {
  posts: MarketplacePost[]
  renderItem: (post: MarketplacePost) => ReactNode
  selectedSellerId?: string | null
}

export function MarketplaceSellerCatalog({ posts, renderItem, selectedSellerId }: Props) {
  const sellers = useMemo(() => groupMarketplaceBySeller(posts), [posts])
  return <div className="seller-catalog" aria-label="Sản phẩm theo người bán">
    {sellers.map(seller => {
      const visiblePosts = selectedSellerId === seller.sellerId ? seller.posts : seller.posts.slice(0, 3)
      return <section key={seller.sellerId || seller.posts[0].id} className="seller-catalog__shop" aria-label={`Cửa hàng ${seller.sellerName}`}>
      <header className="seller-catalog__head">
        <span className="seller-catalog__avatar" aria-hidden="true">{seller.sellerName.slice(0, 1).toUpperCase()}</span>
        <div className="seller-catalog__identity">
          <h3>{seller.sellerName}</h3>
          <p>{seller.posts.length} sản phẩm trong kết quả này</p>
        </div>
        {seller.sellerId && selectedSellerId !== seller.sellerId && <Link className="btn btn-secondary seller-catalog__open"
          to={marketplaceStoreUrl(seller.sellerId, seller.posts.every(post => post.listingType === MarketplaceListingType.Food))}>
          Xem cửa hàng<span className="sr-only"> của {seller.sellerName}</span>
        </Link>}
      </header>
      <ul className="seller-catalog__items">
        {visiblePosts.map(post => <li key={post.id}>{renderItem(post)}</li>)}
      </ul>
      {visiblePosts.length < seller.posts.length ? <p className="seller-catalog__more">Đang xem {visiblePosts.length}/{seller.posts.length} sản phẩm trong kết quả. Mở cửa hàng để xem thêm.</p> : null}
    </section>})}
  </div>
}
