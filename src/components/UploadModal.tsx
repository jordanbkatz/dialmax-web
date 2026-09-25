import { useRef, useState } from 'react'
import { detectNameColumn, detectPhoneColumn, headerToKey, keyToLabel, parseCsv } from '../lib/csv'
import type { ParsedCsv } from '../lib/csv'
import type { LeadField, NewLeadInput } from '../types'
import { ChevronDownIcon, ChevronUpIcon, UploadIcon, XIcon } from './Icons'

interface UploadModalProps {
  busy: boolean
  existingConfig: LeadField[]
  onClose: () => void
  onImport: (leads: NewLeadInput[], config: LeadField[]) => Promise<void>
}

interface ColumnMeta {
  key: string
  label: string
  important: boolean
}

export default function UploadModal({ busy, existingConfig, onClose, onImport }: UploadModalProps) {
  const [parsed, setParsed] = useState<ParsedCsv | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [columns, setColumns] = useState<ColumnMeta[]>([])
  const [nameKey, setNameKey] = useState<string>('')
  const [phoneKey, setPhoneKey] = useState<string>('')
  const fileInput = useRef<HTMLInputElement>(null)

  const loadCsv = (text: string) => {
    try {
      const result = parseCsv(text)
      if (!result.headers.length || !result.rows.length) {
        setError('Could not find any rows with a header line. Expected CSV like "Name,Phone".')
        return
      }
      const phone = detectPhoneColumn(result.headers)
      const name = detectNameColumn(result.headers, phone)
      setParsed(result)
      setColumns(
        result.headers.map((h) => {
          const key = headerToKey(h)
          const existing = existingConfig.find((f) => f.key === key)
          return {
            key,
            label: existing?.label ?? keyToLabel(key),
            important: existing?.important ?? ['company', 'email'].includes(key),
          }
        }),
      )
      setPhoneKey(phone ?? '')
      setNameKey(name ?? '')
      setError(null)
    } catch {
      setError('Failed to parse the file. Make sure it is valid CSV text.')
    }
  }

  const handleFile = (file: File | undefined) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => loadCsv(String(reader.result || ''))
    reader.onerror = () => setError('Could not read that file.')
    reader.readAsText(file)
  }

  const moveColumn = (key: string, dir: -1 | 1) => {
    setColumns((cols) => {
      const idx = cols.findIndex((c) => c.key === key)
      const target = idx + dir
      if (idx < 0 || target < 0 || target >= cols.length) return cols
      const next = [...cols]
      ;[next[idx], next[target]] = [next[target], next[idx]]
      return next
    })
  }

  const toggleImportant = (key: string) => {
    setColumns((cols) => cols.map((c) => (c.key === key ? { ...c, important: !c.important } : c)))
  }

  const handleImport = async () => {
    if (!parsed || !phoneKey) return
    const config: LeadField[] = columns.map((c) => ({ key: c.key, label: c.label, important: c.important }))
    const leads: NewLeadInput[] = []
    for (const row of parsed.rows) {
      const fields: Record<string, string> = {}
      for (const col of columns) {
        const header = parsed.headers.find((h) => headerToKey(h) === col.key)
        const value = (header ? row[header] : '').toString().trim()
        fields[col.key] = value
      }
      const phone = (fields[phoneKey] || '').trim()
      if (!phone) continue
      const name = nameKey ? (fields[nameKey] || '').trim() : ''
      leads.push({ fields, name, phone })
    }
    if (!leads.length) {
      setError('No rows had a phone number.')
      return
    }
    await onImport(leads, config)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl animate-sheet-up max-h-[92dvh] flex flex-col">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">Upload leads</h2>
          <button onClick={onClose} className="p-2 -mr-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 active:scale-95 transition-all duration-150" aria-label="Close">
            <XIcon />
          </button>
        </div>

        {!parsed ? (
          <div className="p-5 space-y-4 overflow-y-auto">
            <button
              onClick={() => fileInput.current?.click()}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragOver(false)
                handleFile(e.dataTransfer.files[0])
              }}
              className={`w-full flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 transition-all duration-150 ${
                dragOver
                  ? 'border-brand-400 bg-brand-50 shadow-sm'
                  : 'border-slate-200 bg-slate-50 hover:border-brand-400 hover:bg-brand-50/60 hover:shadow-sm'
              }`}
            >
              <span className="w-12 h-12 rounded-2xl bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-600/25">
                <UploadIcon className="w-6 h-6 text-white" />
              </span>
              <span className="text-sm font-semibold text-slate-700">Choose a CSV file</span>
              <span className="text-xs text-slate-400">or drag &amp; drop it here</span>
            </button>
            <input
              ref={fileInput}
              type="file"
              accept=".csv,.txt,text/csv,text/plain"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs font-medium text-slate-400">or paste</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <PasteBox onLoad={loadCsv} />

            {error && <p className="text-sm text-rose-500">{error}</p>}
            <p className="text-xs text-slate-400 leading-relaxed">
              The first line should be headers, e.g. <span className="font-mono">Name, Phone, Company</span>.
              You'll map the columns next.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-y-auto px-5 py-4 space-y-4">
              <div className="flex items-center justify-between rounded-xl bg-brand-50 ring-1 ring-brand-100 px-3.5 py-2.5">
                <span className="text-sm font-semibold text-brand-800">
                  {parsed.rows.length} lead{parsed.rows.length === 1 ? '' : 's'} found
                </span>
                <button
                  onClick={() => {
                    setParsed(null)
                    setError(null)
                  }}
                  className="text-xs font-semibold text-brand-600 hover:text-brand-800 hover:underline transition-colors"
                >
                  Start over
                </button>
              </div>

              {error && <p className="text-sm text-rose-500">{error}</p>}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-500">Name column</label>
                  <select
                    value={nameKey}
                    onChange={(e) => setNameKey(e.target.value)}
                    className="mt-1 w-full rounded-xl border-0 bg-slate-50 px-3 py-2.5 text-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-brand-400 outline-none"
                  >
                    <option value="">— none —</option>
                    {columns.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500">Phone column</label>
                  <select
                    value={phoneKey}
                    onChange={(e) => setPhoneKey(e.target.value)}
                    className={`mt-1 w-full rounded-xl border-0 bg-slate-50 px-3 py-2.5 text-sm ring-1 outline-none ${
                      phoneKey ? 'ring-slate-200 focus:ring-2 focus:ring-brand-400' : 'ring-rose-300'
                    }`}
                  >
                    <option value="">— required —</option>
                    {columns.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-500 mb-2">
                  Fields — star the ones that should always show on a card
                </p>
                <div className="rounded-2xl ring-1 ring-slate-200 divide-y divide-slate-100 overflow-hidden">
                  {columns
                    .filter((c) => c.key !== nameKey && c.key !== phoneKey)
                    .map((c) => (
                      <div key={c.key} className="flex items-center gap-2 px-3.5 py-2.5 bg-white">
                        <button
                          onClick={() => toggleImportant(c.key)}
                          className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-lg transition-transform hover:scale-110 active:scale-95 ${
                            c.important ? 'text-amber-400' : 'text-slate-200 hover:text-slate-300'
                          }`}
                          aria-label={c.important ? 'Remove from card' : 'Always show on card'}
                        >
                          ★
                        </button>
                        <input
                          value={c.label}
                          onChange={(e) =>
                            setColumns((cols) =>
                              cols.map((x) => (x.key === c.key ? { ...x, label: e.target.value } : x)),
                            )
                          }
                          className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-700 outline-none"
                        />
                        {c.important && (
                          <div className="flex flex-col">
                            <button
                              onClick={() => moveColumn(c.key, -1)}
                              className="p-0.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                              aria-label="Move up"
                            >
                              <ChevronUpIcon className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => moveColumn(c.key, 1)}
                              className="p-0.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                              aria-label="Move down"
                            >
                              <ChevronDownIcon className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>

              {parsed.rows[0] && (
                <div className="rounded-2xl ring-1 ring-slate-200 overflow-hidden">
                  <p className="px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400 bg-slate-50">
                    Preview
                  </p>
                  <div className="px-3.5 py-2.5 text-xs text-slate-600 space-y-0.5">
                    {columns
                      .filter((c) => c.key === nameKey || c.key === phoneKey || c.important)
                      .slice(0, 4)
                      .map((c) => (
                        <div key={c.key} className="flex justify-between gap-3">
                          <span className="text-slate-400">{c.label}</span>
                          <span className="truncate">
                            {rowValue(parsed, c.key) || '—'}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 pb-5 pt-2">
              <button
                onClick={handleImport}
                disabled={!phoneKey || busy}
                className="w-full rounded-2xl bg-brand-600 px-4 py-4 text-base font-semibold text-white shadow-lg shadow-brand-600/25 hover:bg-brand-500 hover:shadow-xl hover:shadow-brand-600/35 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:opacity-40 disabled:shadow-none disabled:hover:bg-brand-600 disabled:hover:translate-y-0 disabled:cursor-not-allowed transition-all duration-150"
              >
                {busy ? 'Importing…' : `Import ${parsed.rows.length} leads`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function rowValue(parsed: ParsedCsv, key: string): string {
  const header = parsed.headers.find((h) => headerToKey(h) === key)
  if (!header) return ''
  const raw = parsed.rows[0][header] ?? ''
  return String(raw).trim()
}

function PasteBox({ onLoad }: { onLoad: (text: string) => void }) {
  const [text, setText] = useState('')
  return (
    <div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder={'Jane Doe,(555) 201-8845,Acme Inc\nJohn Smith,(555) 322-1109,Globex'}
        className="w-full rounded-2xl border-0 bg-slate-50 px-3.5 py-3 text-sm font-mono ring-1 ring-slate-200 focus:ring-2 focus:ring-brand-400 outline-none resize-none placeholder:text-slate-300 placeholder:font-mono"
      />
      <button
        onClick={() => onLoad(text)}
        disabled={!text.trim()}
        className="mt-2 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:opacity-40 disabled:hover:bg-slate-900 disabled:hover:translate-y-0 disabled:cursor-not-allowed transition-all duration-150"
      >
        Parse pasted leads
      </button>
    </div>
  )
}
