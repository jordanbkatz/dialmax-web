import type { LeadField } from '../types'
import { keyToLabel } from '../lib/csv'
import { XIcon } from './Icons'

interface FieldManagerProps {
  allKeys: string[]
  config: LeadField[]
  busy: boolean
  onClose: () => void
  onToggleImportant: (key: string) => Promise<void>
  onMove: (key: string, dir: -1 | 1) => Promise<void>
  onSetLabel: (key: string, label: string) => Promise<void>
}

export default function FieldManager({
  allKeys,
  config,
  busy,
  onClose,
  onToggleImportant,
  onMove,
  onSetLabel,
}: FieldManagerProps) {
  const order = allKeys

  const metaFor = (key: string): LeadField =>
    config.find((f) => f.key === key) ?? { key, label: keyToLabel(key), important: false }

  const importantKeys = order.filter((k) => metaFor(k).important)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl animate-sheet-up max-h-[92dvh] flex flex-col">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Lead fields</h2>
            <p className="text-xs text-slate-400 mt-0.5">Star fields to always show them on cards.</p>
          </div>
          <button onClick={onClose} className="p-2 -mr-2 rounded-xl text-slate-400 hover:bg-slate-100" aria-label="Close">
            <XIcon />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4">
          {order.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-10">
              No extra fields yet. They appear here once you upload leads with columns or add custom fields.
            </p>
          ) : (
            <div className="rounded-2xl ring-1 ring-slate-200 divide-y divide-slate-100 overflow-hidden">
              {order.map((key) => {
                const meta = metaFor(key)
                const isImportant = meta.important
                const idx = importantKeys.indexOf(key)
                return (
                  <div key={key} className="flex items-center gap-2 px-3.5 py-2.5 bg-white">
                    <button
                      onClick={() => onToggleImportant(key)}
                      disabled={busy}
                      className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-lg transition ${
                        isImportant ? 'text-amber-400' : 'text-slate-200 hover:text-slate-300'
                      }`}
                      aria-label={isImportant ? 'Remove from card' : 'Always show on card'}
                    >
                      ★
                    </button>
                    <input
                      value={meta.label}
                      onChange={(e) => onSetLabel(key, e.target.value)}
                      className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-700 outline-none"
                    />
                    {isImportant && (
                      <div className="flex flex-col">
                        <button
                          onClick={() => onMove(key, -1)}
                          disabled={busy || idx <= 0}
                          className="p-0.5 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                          aria-label="Move up"
                        >
                          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15" /></svg>
                        </button>
                        <button
                          onClick={() => onMove(key, 1)}
                          disabled={busy || idx >= importantKeys.length - 1}
                          className="p-0.5 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                          aria-label="Move down"
                        >
                          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="px-5 pb-5 pt-2 border-t border-slate-100">
          <button
            onClick={onClose}
            className="w-full rounded-2xl bg-slate-900 px-4 py-3.5 text-base font-semibold text-white transition active:scale-[0.98]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
