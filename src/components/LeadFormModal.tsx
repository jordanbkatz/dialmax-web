import { useState } from 'react'
import type { Lead } from '../types'
import { XIcon } from './Icons'

interface LeadFormModalProps {
  /** Existing lead to edit, or null for a new manual lead */
  lead: Lead | null
  busy: boolean
  onClose: () => void
  onSave: (data: { name: string; phone: string; company: string }) => Promise<void>
}

export default function LeadFormModal({ lead, busy, onClose, onSave }: LeadFormModalProps) {
  const [phone, setPhone] = useState(lead?.phone ?? '')
  const [name, setName] = useState(lead?.name ?? '')
  const [company, setCompany] = useState(lead?.company ?? '')

  const canSave = phone.trim().length > 0 && !busy

  const handleSave = async () => {
    await onSave({
      name: name.trim(),
      phone: phone.trim(),
      company: company.trim(),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl animate-sheet-up max-h-[92dvh] flex flex-col">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">
            {lead ? 'Edit lead' : 'New lead'}
          </h2>
          <button onClick={onClose} className="p-2 -mr-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 active:scale-95 transition-all duration-150" aria-label="Close">
            <XIcon />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500">Phone *</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 201-8845"
              type="tel"
              autoComplete="off"
              className="mt-1 w-full rounded-xl border-0 bg-slate-50 px-3.5 py-3 text-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-brand-400 outline-none placeholder:text-slate-300"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
              autoComplete="off"
              className="mt-1 w-full rounded-xl border-0 bg-slate-50 px-3.5 py-3 text-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-brand-400 outline-none placeholder:text-slate-300"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">Company</label>
            <input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Acme Corp"
              autoComplete="off"
              className="mt-1 w-full rounded-xl border-0 bg-slate-50 px-3.5 py-3 text-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-brand-400 outline-none placeholder:text-slate-300"
            />
          </div>
        </div>

        <div className="px-5 pb-5 pt-2">
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="w-full rounded-2xl bg-brand-600 px-4 py-4 text-base font-semibold text-white shadow-lg shadow-brand-600/25 hover:bg-brand-500 hover:shadow-xl hover:shadow-brand-600/35 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:opacity-40 disabled:shadow-none disabled:hover:bg-brand-600 disabled:hover:translate-y-0 disabled:cursor-not-allowed transition-all duration-150"
          >
            {busy ? 'Saving…' : lead ? 'Save changes' : 'Add lead'}
          </button>
        </div>
      </div>
    </div>
  )
}
