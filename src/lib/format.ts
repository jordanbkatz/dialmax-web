import type { Timestamp } from 'firebase/firestore'

export function telHref(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, '')
  return `tel:${digits}`
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  }
  return phone
}

function toDate(ts: Timestamp | null | undefined): Date | null {
  return ts ? ts.toDate() : null
}

export function formatDateTime(ts: Timestamp | null | undefined): string {
  const d = toDate(ts)
  if (!d) return ''
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatDate(ts: Timestamp | null | undefined): string {
  const d = toDate(ts)
  if (!d) return ''
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

/** Firestore Timestamp -> value usable by <input type="datetime-local"> */
export function tsToLocalInput(ts: Timestamp | null | undefined): string {
  const d = toDate(ts)
  if (!d) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function localInputToDate(value: string): Date | null {
  if (!value) return null
  const d = new Date(value)
  return isNaN(d.getTime()) ? null : d
}

export function isOverdue(ts: Timestamp | null | undefined): boolean {
  const d = toDate(ts)
  return !!d && d.getTime() <= Date.now()
}
