import type { Timestamp } from 'firebase/firestore'

export type LeadResult = 'positive' | 'negative' | 'indeterminate'
export type LeadStatus = 'new' | 'called'
export type LeadFilter = 'all' | 'queue' | 'finished'

export interface Campaign {
  id: string
  name: string
  ownerUid: string
  ownerEmail: string
  sharedWithEmails: string[]
  memberUids: string[]
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface Lead {
  id: string
  campaignId: string
  /** Dynamic field map — retained for compatibility or additional attributes */
  fields: Record<string, string>
  /** Denormalized core fields for display + search */
  name: string
  phone: string
  company: string
  website: string
  status: LeadStatus
  result: LeadResult | null
  note: string
  callbackAt: Timestamp | null
  meetingAt: Timestamp | null
  emailFollowUp: boolean
  calledAt: Timestamp | null
  createdAt: Timestamp
  /** Queue position (ms epoch at upload). Lower = earlier in queue. */
  order: number
}

export interface LeadField {
  key: string
  label: string
  /** Important fields always appear on cards; others hide behind expand */
  important: boolean
}

export interface NewLeadInput {
  fields?: Record<string, string>
  name: string
  phone: string
  company: string
  website?: string
}

export const CORE_FIELD_KEYS = ['phone', 'name', 'company', 'website'] as const

export const RESULT_META: Record<
  LeadResult,
  { label: string; dot: string; chip: string; button: string }
> = {
  positive: {
    label: 'Positive',
    dot: 'bg-emerald-500',
    chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    button: 'bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700',
  },
  indeterminate: {
    label: 'Callback',
    dot: 'bg-amber-500',
    chip: 'bg-amber-50 text-amber-700 ring-amber-200',
    button: 'bg-amber-500 hover:bg-amber-600 active:bg-amber-700',
  },
  negative: {
    label: 'Negative',
    dot: 'bg-rose-500',
    chip: 'bg-rose-50 text-rose-700 ring-rose-200',
    button: 'bg-rose-500 hover:bg-rose-600 active:bg-rose-700',
  },
}
