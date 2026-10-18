import { BarChart3, ClipboardCheck, PackageCheck } from 'lucide-react'
import type { ReactNode } from 'react'
import { Brand } from './AppLayout'

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-900 via-brand-700 to-brand-600 p-12 text-white lg:flex">
        <Brand light />
        <div>
          <h2 className="text-3xl font-bold leading-tight">Every shelf, every sale, always in sync.</h2>
          <p className="mt-4 max-w-md text-brand-100">Track stock in real time, record every movement, and let customers order with confidence.</p>
          <ul className="mt-8 space-y-4 text-sm">
            <li className="flex items-center gap-3"><PackageCheck className="h-5 w-5 text-brand-100" aria-hidden />Audited stock-in, stock-out and adjustments</li>
            <li className="flex items-center gap-3"><ClipboardCheck className="h-5 w-5 text-brand-100" aria-hidden />Oversell-proof checkout</li>
            <li className="flex items-center gap-3"><BarChart3 className="h-5 w-5 text-brand-100" aria-hidden />Low-stock alerts and valuation reports</li>
          </ul>
        </div>
        <p className="text-xs text-brand-100/70">© StockPilot Store Inventory</p>
      </div>
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  )
}
