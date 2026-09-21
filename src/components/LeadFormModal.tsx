import { useState } from 'react'
import type { Lead, LeadField } from '../types'
import { keyToLabel } from '../lib/csv'
import { XIcon, PlusIcon, TrashIcon } from './Icons'

interface LeadFormModalProps {
  /** Existing lead to edit, or null for a new manual lead */
  lead: Lead | null
  importantFields: LeadField[]
  busy: boolean
  onClose: () => void
  onSave: (data: { fields: Record<string, string>; name: string; phone: string }) => Promise<void>
}

interface Row {
  key: string
  label: string
  value: string
}

export default function LeadFormModal({ lead, importantFields, busy, onClose, onSave }: LeadFormModalProps) {
  const [name, setName] = useState(lead?.name ?? '')
  const [phone, setPhone] = useState(lead?.phone ?? '')
  const [rows, setRows] = useState<Row[]>(() =>
    lead
      ? Object.entries(lead.fields)
          .filter(([k]) => k !== 'name' && k !== 'phone')
          .map(([key, value]) => ({ key, label: keyToLabel(key), value }))
      : [],
  )

  const addRow = () => setRows((r) => [...r, { key: '', label: '', value: '' }])

  const updateRow = (idx: number, patch: Partial<Row>) =>
    setRows((r) => r.map((row, i) => (i === idx ? { ...row, ...patch } : row)))

  const removeRow = (idx: number) => setRows((r) => r.filter((_, i) => i !== idx))

  const canSave = phone.trim().length > 0 && !busy

  const handleSave = async () => {
    const fields: Record<string, string> = {}
    for (const row of rows) {
      const key =
        row.key ||
        row.label
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '')
      if (key && row.value.trim()) fields[key] = row.value.trim()
    }
    await onSave({ fields, name: name.trim(), phone: phone.trim() })
  }

  const importantKeys = importantFields.map((f) => f.key)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl animate-sheet-up max-h-[92dvh] flex flex-col">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">
            {lead ? 'Edit lead' : 'New lead'}
          </h2>
          <button onClick={onClose} className="p-2 -mr-2 rounded-xl text-slate-400 hover:bg-slate-100" aria-label="Close">
            <XIcon />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 space-y-4">
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

          {rows.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500">Additional fields</p>
              {rows.map((row, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    value={row.label}
                    onChange={(e) => updateRow(idx, { label: e.target.value, key: '' })}
                    placeholder="Label"
                    className="w-1/3 min-w-0 rounded-xl border-0 bg-slate-50 px-3 py-2.5 text-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-brand-400 outline-none placeholder:text-slate-300"
                  />
                  <input
                    value={row.value}
                    onChange={(e) => updateRow(idx, { value: e.target.value })}
                    placeholder="Value"
                    className="flex-1 min-w-0 rounded-xl border-0 bg-slate-50 px-3 py-2.5 text-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-brand-400 outline-none placeholder:text-slate-300"
                  />
                  <button
                    onClick={() => removeRow(idx)}
                    className="shrink-0 p-2.5 rounded-xl text-slate-300 hover:text-rose-500"
                    aria-label="Remove field"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={addRow}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3.5 py-2.5 text-sm font-semibold text-slate-600 active:scale-[0.98] transition"
          >
            <PlusIcon className="w-4 h-4" />
            Add field
          </button>

          {!lead && importantKeys.length > 0 && (
            <p className="text-xs text-slate-400">
              Tip: after saving, use the field manager to mark fields as "always show".
            </p>
          )}
        </div>

        <div className="px-5 pb-5 pt-2">
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="w-full rounded-2xl bg-brand-600 px-4 py-4 text-base font-semibold text-white shadow-lg shadow-brand-600/25 transition active:scale-[0.98] disabled:opacity-40 disabled:shadow-none"
          >
            {busy ? 'Saving…' : lead ? 'Save changes' : 'Add lead'}
          </button>
        </div>
      </div>
    </div>
  )
}
