import { Package, ShoppingCart } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { CatalogProduct } from '../types'
import { formatMoney } from '../utils/format'
import { Button } from './ui/Button'
import { StockBadge } from './ui/Badges'

interface Props { product: CatalogProduct; onAdd?: (p: CatalogProduct) => void; adding?: boolean }

export function ProductCard({ product, onAdd, adding }: Props) {
  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <Link to={`/shop/products/${product.id}`} className="flex h-32 items-center justify-center bg-gradient-to-br from-brand-50 to-slate-100 text-brand-500" aria-label={`View ${product.name}`}>
        <Package className="h-12 w-12" aria-hidden />
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-sm font-semibold text-slate-900"><Link to={`/shop/products/${product.id}`} className="hover:text-brand-700">{product.name}</Link></h3>
          <StockBadge status={product.stockStatus} />
        </div>
        {product.categoryName && <p className="text-xs text-slate-500">{product.categoryName}</p>}
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-lg font-semibold text-slate-900">{formatMoney(product.price)}</span>
          {onAdd && (
            <Button size="sm" disabled={!product.available} loading={adding} onClick={() => onAdd(product)} aria-label={`Add ${product.name} to cart`}>
              <ShoppingCart className="h-4 w-4" aria-hidden />{product.available ? 'Add' : 'Sold out'}
            </Button>
          )}
        </div>
      </div>
    </article>
  )
}
