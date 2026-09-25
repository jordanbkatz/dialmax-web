import { useState } from 'react'
import type { Lead } from '../types'
import { RESULT_META } from '../types'
import type { LeadField } from '../types'
import { formatDateTime, formatPhone, isOverdue, telHref } from '../lib/format'
import {
  CalendarIcon,
  ChevronDownIcon,
  MailIcon,
  PencilIcon,
  PhoneIcon,
  RefreshIcon,
  TrashIcon,
} from './Icons'

export function ResultChip({ lead }: { lead: Lead }) {
  if (lead.status !== 'called' || !lead.result) return null
  const meta = RESULT_META[lead.result]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${meta.chip}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  )
}

export function NewChip() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 ring-1 ring-inset ring-brand-200">
      <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
      New
    </span>
  )
}

interface LeadCardProps {
  lead: Lead
  importantFields: LeadField[]
  fieldMeta: (key: string) => LeadField
  onCall: (lead: Lead) => void
  onLogResult: (lead: Lead) => void
  onEdit: (lead: Lead) => void
  onReset: (lead: Lead) => void
  onDelete: (lead: Lead) => void
}

export default function LeadCard({
  lead,
  importantFields,
  fieldMeta,
  onCall,
  onLogResult,
  onEdit,
  onReset,
  onDelete,
}: LeadCardProps) {
  const [expanded, setExpanded] = useState(false)
  const extraFields = importantFields.length
    ? Object.keys(lead.fields).filter(
        (k) => k !== 'name' && k !== 'phone' && !importantFields.some((f) => f.key === k),
      )
    : Object.keys(lead.fields).filter((k) => k !== 'name' && k !== 'phone')
  const hasExtra = extraFields.length > 0

  return (
    <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70 overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-[15px] font-semibold text-slate-900 truncate">
                {lead.name || 'Unnamed lead'}
              </h3>
              {lead.status === 'new' ? <NewChip /> : <ResultChip lead={lead} />}
            </div>
            <a
              href={telHref(lead.phone)}
              className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 hover:underline transition-colors"
            >
              <PhoneIcon className="w-3.5 h-3.5" />
              {formatPhone(lead.phone)}
            </a>
          </div>
          {hasExtra && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="shrink-0 p-1.5 -m-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 active:scale-95 transition-all duration-150"
              aria-label={expanded ? 'Collapse details' : 'Expand details'}
            >
              <ChevronDownIcon
                className={`w-5 h-5 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
              />
            </button>
          )}
        </div>

        {importantFields.length > 0 && (
          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
            {importantFields.map((f) => (
              <div key={f.key} className="min-w-0">
                <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400 truncate">
                  {f.label}
                </dt>
                <dd className="text-sm text-slate-700 truncate">{lead.fields[f.key] || '—'}</dd>
              </div>
            ))}
          </dl>
        )}

        {(lead.callbackAt || lead.meetingAt || lead.emailFollowUp) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {lead.callbackAt && (
              <span
                className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                  isOverdue(lead.callbackAt)
                    ? 'bg-amber-50 text-amber-700 ring-amber-200'
                    : 'bg-slate-50 text-slate-600 ring-slate-200'
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                Callback {formatDateTime(lead.callbackAt)}
              </span>
            )}
            {lead.meetingAt && (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-violet-50 px-2 py-1 text-xs font-medium text-violet-700 ring-1 ring-inset ring-violet-200">
                <CalendarIcon className="w-3.5 h-3.5" />
                Meeting {formatDateTime(lead.meetingAt)}
              </span>
            )}
            {lead.emailFollowUp && (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-sky-50 px-2 py-1 text-xs font-medium text-sky-700 ring-1 ring-inset ring-sky-200">
                <MailIcon className="w-3.5 h-3.5" />
                Email follow-up
              </span>
            )}
          </div>
        )}

        <div className="mt-4 flex gap-2">
          {lead.status === 'called' ? (
            <button
              onClick={() => onReset(lead)}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200 hover:text-slate-900 hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 active:scale-[0.98] transition-all duration-150"
            >
              <RefreshIcon className="w-4 h-4" />
              Requeue
            </button>
          ) : (
            <button
              onClick={() => onCall(lead)}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-600/30 hover:bg-brand-500 hover:shadow-md hover:shadow-brand-600/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-150"
            >
              <PhoneIcon className="w-4 h-4" />
              Call
            </button>
          )}
          <button
            onClick={() => onLogResult(lead)}
            className="flex-1 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-150"
          >
            {lead.status === 'called' ? 'Update result' : 'Log result'}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3">
          {hasExtra && (
            <dl className="space-y-2">
              {extraFields.map((k) => (
                <div key={k} className="flex justify-between gap-4">
                  <dt className="text-xs font-medium text-slate-400 shrink-0">{fieldMeta(k).label}</dt>
                  <dd className="text-sm text-slate-700 text-right break-words">{lead.fields[k] || '—'}</dd>
                </div>
              ))}
            </dl>
          )}
          {lead.note && (
            <div className={hasExtra ? 'mt-3 pt-3 border-t border-slate-200/70' : ''}>
              <p className="text-xs font-medium text-slate-400 mb-1">Last call note</p>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{lead.note}</p>
            </div>
          )}
          <div className="mt-3 pt-3 border-t border-slate-200/70 flex justify-end gap-1">
            <button
              onClick={() => onEdit(lead)}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-200/80 hover:scale-105 active:scale-95 transition-all duration-150"
            >
              <PencilIcon className="w-3.5 h-3.5" />
              Edit
            </button>
            <button
              onClick={() => onDelete(lead)}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-rose-500 hover:text-rose-600 hover:bg-rose-50 hover:scale-105 active:scale-95 transition-all duration-150"
            >
              <TrashIcon className="w-3.5 h-3.5" />
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
