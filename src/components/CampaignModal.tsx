import { useState } from 'react'
import type { Campaign } from '../types'
import { FolderIcon, XIcon } from './Icons'

interface CampaignModalProps {
  campaign: Campaign | null
  busy: boolean
  onClose: () => void
  onSave: (name: string) => Promise<void>
}

export default function CampaignModal({
  campaign,
  busy,
  onClose,
  onSave,
}: CampaignModalProps) {
  const [name, setName] = useState(campaign?.name ?? '')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Please enter a campaign name')
      return
    }
    setError(null)
    try {
      await onSave(trimmed)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save campaign')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl animate-sheet-up max-h-[92dvh] flex flex-col">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
              <FolderIcon className="w-4 h-4" />
            </div>
            <h2 className="text-base font-semibold text-slate-900">
              {campaign ? 'Edit Campaign' : 'New Campaign'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 -mr-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 active:scale-95 transition-all duration-150"
            aria-label="Close"
          >
            <XIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-600">Campaign Name</label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Q1 Cold Outreach, Inbound Followups"
              className="mt-1.5 w-full rounded-xl border-0 bg-slate-50 px-3.5 py-3 text-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-brand-400 outline-none placeholder:text-slate-400"
            />
          </div>

          {error && <p className="text-xs text-rose-500">{error}</p>}

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-200 hover:text-slate-900 active:scale-[0.98] transition-all duration-150"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || busy}
              className="flex-1 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-brand-600/30 hover:bg-brand-500 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:opacity-40 disabled:hover:bg-brand-600 disabled:hover:translate-y-0 disabled:cursor-not-allowed transition-all duration-150"
            >
              {busy ? 'Saving…' : campaign ? 'Save changes' : 'Create campaign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
