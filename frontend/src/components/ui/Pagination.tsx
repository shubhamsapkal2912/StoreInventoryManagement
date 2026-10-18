import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './Button'

interface Props { page: number; totalPages: number; totalElements: number; onPage: (p: number) => void }

export function Pagination({ page, totalPages, totalElements, onPage }: Props) {
  if (totalElements === 0) return null
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
      <p>{totalElements} result{totalElements === 1 ? '' : 's'} · Page {page + 1} of {Math.max(totalPages, 1)}</p>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" disabled={page <= 0} onClick={() => onPage(page - 1)} aria-label="Previous page"><ChevronLeft className="h-4 w-4" />Prev</Button>
        <Button variant="secondary" size="sm" disabled={page + 1 >= totalPages} onClick={() => onPage(page + 1)} aria-label="Next page">Next<ChevronRight className="h-4 w-4" /></Button>
      </div>
    </nav>
  )
}
