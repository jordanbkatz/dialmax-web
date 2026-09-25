import type { Lead } from '../types'
import { RESULT_META } from '../types'
import { formatDateTime, formatPhone, isOverdue, telHref } from '../lib/format'
import { CalendarIcon, ChevronRightIcon, PhoneIcon, SkipIcon, UsersIcon } from './Icons'

interface DialerProps {
  lead: Lead | null
  done: number
  remaining: number
  onLogResult: () => void
  onSkip: () => void
  onBackToQueue: () => void
}

export default function Dialer({
  lead,
  done,
  remaining,
  onLogResult,
  onSkip,
  onBackToQueue,
}: DialerProps) {
  if (!lead) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 ring-1 ring-emerald-200 flex items-center justify-center">
          <UsersIcon className="w-8 h-8 text-emerald-500" />
        </div>
        <h2 className="mt-5 text-xl font-bold text-slate-900">Queue complete</h2>
        <p className="mt-2 text-sm text-slate-500 max-w-xs">
          You've called every lead in the queue. {done > 0 ? `${done} logged this session.` : ''} Check
          the Callbacks tab for scheduled follow-ups.
        </p>
        <button
          onClick={onBackToQueue}
          className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-150"
        >
          Back to leads
          <ChevronRightIcon className="w-4 h-4" />
        </button>
      </div>
    )
  }

  const nextCallback = lead.callbackAt && isOverdue(lead.callbackAt) ? lead.callbackAt : null

  return (
    <div className="px-4 pt-2 pb-28">
      <div className="flex items-center justify-between text-xs font-medium text-slate-400 mb-3 px-1">
        <span>{remaining} left in queue</span>
        <span>{done} logged</span>
      </div>

      <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/70 p-6">
        {nextCallback && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-amber-50 ring-1 ring-amber-200 px-3 py-2 text-xs font-semibold text-amber-700">
            <CalendarIcon className="w-4 h-4 shrink-0" />
            Overdue callback from {formatDateTime(nextCallback)}
          </div>
        )}

        <div className="flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-brand-600/30 select-none">
            {(lead.name || lead.company || '?').trim().charAt(0).toUpperCase()}
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
            {lead.name || lead.company || 'Unnamed lead'}
          </h2>
          {lead.name && lead.company && (
            <p className="mt-0.5 text-sm font-semibold text-slate-500">
              {lead.company}
            </p>
          )}
          <p className="mt-1 text-slate-500 font-medium">{formatPhone(lead.phone)}</p>
          {lead.result && (
            <span
              className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${RESULT_META[lead.result].chip}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${RESULT_META[lead.result].dot}`} />
              Last: {RESULT_META[lead.result].label}
            </span>
          )}
        </div>

        {lead.note && (
          <div className="mt-5 rounded-xl bg-slate-50 ring-1 ring-slate-100 px-4 py-3 text-left">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1">
              Previous note
            </p>
            <p className="text-sm text-slate-600 whitespace-pre-wrap">{lead.note}</p>
          </div>
        )}

        <a
          href={telHref(lead.phone)}
          className="mt-7 flex w-full items-center justify-center gap-2.5 rounded-2xl bg-emerald-500 px-4 py-[1.1rem] text-lg font-bold text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-400 hover:shadow-xl hover:shadow-emerald-500/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-150"
        >
          <PhoneIcon className="w-6 h-6" />
          Call {formatPhone(lead.phone)}
        </a>

        <div className="mt-3 flex gap-2">
          <button
            onClick={onSkip}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-200 hover:text-slate-900 hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 active:scale-[0.98] transition-all duration-150"
          >
            <SkipIcon className="w-4 h-4" />
            Skip
          </button>
          <button
            onClick={onLogResult}
            className="flex-[2] rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-150"
          >
            Log call result
          </button>
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-slate-400">
        Tap "Call" to dial from your phone, then come back and log the result.
      </p>
    </div>
  )
}
