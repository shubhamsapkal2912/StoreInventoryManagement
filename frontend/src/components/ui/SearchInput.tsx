import { Search } from 'lucide-react'

interface Props { value: string; onChange: (v: string) => void; placeholder?: string; label?: string }

export function SearchInput({ value, onChange, placeholder = 'Search…', label = 'Search' }: Props) {
  return (
    <div className="relative min-w-0 flex-1 sm:max-w-xs">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
      <input type="search" aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="block w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
    </div>
  )
}
