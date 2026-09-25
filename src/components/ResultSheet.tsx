import { useEffect, useMemo, useState } from 'react'
import type { Lead, LeadResult } from '../types'
import { RESULT_META } from '../types'
import type { CallResultInput } from '../lib/firestore'
import { localInputToDate, tsToLocalInput } from '../lib/format'
import { CalendarIcon, CheckIcon, MailIcon, XIcon } from './Icons'

const RESULT_ORDER: LeadResult[] = ['positive', 'indeterminate', 'negative']

interface ResultSheetProps {
  lead: Lead
  busy: boolean
  onSave: (input: CallResultInput) => void
  onClose: () => void
}

export default function ResultSheet({ lead, busy, onSave, onClose }: ResultSheetProps) {
  const [result, setResult] = useState<LeadResult | null>(lead.result)
  const [note, setNote] = useState(lead.note)
  const [callbackAt, setCallbackAt] = useState(tsToLocalInput(lead.callbackAt))
  const [meetingAt, setMeetingAt] = useState(tsToLocalInput(lead.meetingAt))
  const [emailFollowUp, setEmailFollowUp] = useState(lead.emailFollowUp)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  const callbackRequired = result === 'indeterminate'
  const canSave = result !== null && (!callbackRequired || !!callbackAt)

  const hint = useMemo(() => {
    switch (result) {
      case 'positive':
        return 'Great! Optionally schedule a callback, meeting, or email follow-up.'
      case 'indeterminate':
        return 'When should this lead be called back?'
      case 'negative':
        return 'No follow-up needed. Add a note for context if you like.'
      default:
        return 'How did the call go?'
    }
  }, [result])

  const handleSave = () => {
    if (!result) return
    onSave({
      result,
      note: note.trim(),
      callbackAt: callbackAt ? localInputToDate(callbackAt) : null,
      meetingAt: meetingAt ? localInputToDate(meetingAt) : null,
      emailFollowUp: result === 'positive' ? emailFollowUp : false,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl animate-sheet-up max-h-[92dvh] flex flex-col">
        <div className="flex items-center justify-between px-5 pt-4 pb-2 border-b border-slate-100">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Call result</p>
            <h2 className="text-base font-semibold text-slate-900 truncate">{lead.name || lead.company || 'Unnamed lead'}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 -mr-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 active:scale-95 transition-all duration-150"
            aria-label="Close"
          >
            <XIcon />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 space-y-5">
          <div>
            <p className="text-sm text-slate-500 mb-3">{hint}</p>
            <div className="grid grid-cols-3 gap-2">
              {RESULT_ORDER.map((r) => {
                const meta = RESULT_META[r]
                const selected = result === r
                return (
                  <button
                    key={r}
                    onClick={() => setResult(r)}
                    className={`relative flex flex-col items-center gap-1.5 rounded-2xl px-2 py-3.5 text-sm font-semibold ring-1 transition-all duration-150 active:scale-[0.97] ${
                      selected
                        ? `${meta.button} text-white ring-transparent shadow-md hover:brightness-105 hover:shadow-lg hover:-translate-y-0.5`
                        : 'bg-white text-slate-600 ring-slate-200 hover:ring-slate-300 hover:bg-slate-50 hover:text-slate-900 hover:-translate-y-0.5 hover:shadow-sm'
                    }`}
                  >
                    {selected && (
                      <span className="absolute top-1.5 right-1.5">
                        <CheckIcon className="w-3.5 h-3.5" />
                      </span>
                    )}
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${selected ? 'bg-white/90' : meta.dot}`}
                    />
                    {meta.label}
                  </button>
                )
              })}
            </div>
          </div>

          {result === 'indeterminate' && (
            <div className="rounded-2xl bg-amber-50 ring-1 ring-amber-200 p-4">
              <label className="flex items-center gap-2 text-sm font-semibold text-amber-800">
                <CalendarIcon className="w-4 h-4" />
                Callback date &amp; time <span className="text-amber-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={callbackAt}
                onChange={(e) => setCallbackAt(e.target.value)}
                className="mt-2.5 w-full rounded-xl border-0 bg-white px-3.5 py-3 text-sm text-slate-800 ring-1 ring-amber-200 focus:ring-2 focus:ring-amber-400 outline-none"
              />
            </div>
          )}

          {result === 'positive' && (
            <div className="space-y-3">
              <div className="rounded-2xl bg-slate-50 ring-1 ring-slate-200 p-4">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <CalendarIcon className="w-4 h-4 text-slate-400" />
                  Schedule a callback
                  <span className="text-xs font-normal text-slate-400">(optional)</span>
                </label>
                <input
                  type="datetime-local"
                  value={callbackAt}
                  onChange={(e) => setCallbackAt(e.target.value)}
                  className="mt-2.5 w-full rounded-xl border-0 bg-white px-3.5 py-3 text-sm text-slate-800 ring-1 ring-slate-200 focus:ring-2 focus:ring-brand-400 outline-none"
                />
              </div>
              <div className="rounded-2xl bg-slate-50 ring-1 ring-slate-200 p-4">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <CalendarIcon className="w-4 h-4 text-violet-400" />
                  Schedule a meeting
                  <span className="text-xs font-normal text-slate-400">(optional)</span>
                </label>
                <input
                  type="datetime-local"
                  value={meetingAt}
                  onChange={(e) => setMeetingAt(e.target.value)}
                  className="mt-2.5 w-full rounded-xl border-0 bg-white px-3.5 py-3 text-sm text-slate-800 ring-1 ring-slate-200 focus:ring-2 focus:ring-violet-400 outline-none"
                />
              </div>
              <button
                onClick={() => setEmailFollowUp((v) => !v)}
                className={`w-full flex items-center justify-between rounded-2xl px-4 py-3.5 ring-1 transition-all duration-150 active:scale-[0.99] hover:shadow-sm ${
                  emailFollowUp
                    ? 'bg-sky-50 ring-sky-300 hover:bg-sky-100/70'
                    : 'bg-white ring-slate-200 hover:bg-slate-50 hover:ring-slate-300'
                }`}
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <MailIcon className={`w-4 h-4 ${emailFollowUp ? 'text-sky-500' : 'text-slate-400'}`} />
                  Email follow-up needed
                </span>
                <span
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                    emailFollowUp ? 'bg-sky-500' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                      emailFollowUp ? 'translate-x-[22px]' : 'translate-x-0.5'
                    }`}
                  />
                </span>
              </button>
            </div>
          )}

          <div>
            <label className="text-sm font-semibold text-slate-700">Notes</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Anything worth remembering from the call…"
              className="mt-2 w-full rounded-xl border-0 bg-slate-50 px-3.5 py-3 text-sm text-slate-800 ring-1 ring-slate-200 focus:ring-2 focus:ring-brand-400 outline-none resize-none placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="px-5 pb-5 pt-2 border-t border-slate-100">
          <button
            onClick={handleSave}
            disabled={!canSave || busy}
            className="w-full rounded-2xl bg-brand-600 px-4 py-4 text-base font-semibold text-white shadow-lg shadow-brand-600/25 hover:bg-brand-500 hover:shadow-xl hover:shadow-brand-600/35 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:opacity-40 disabled:shadow-none disabled:hover:bg-brand-600 disabled:hover:translate-y-0 disabled:cursor-not-allowed transition-all duration-150"
          >
            {busy ? 'Saving…' : 'Save result'}
          </button>
        </div>
      </div>
    </div>
  )
}
