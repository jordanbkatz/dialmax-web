import Papa from 'papaparse'

export interface ParsedCsv {
  headers: string[]
  rows: Record<string, string>[]
}

export function parseCsv(text: string): ParsedCsv {
  const result = Papa.parse<Record<string, string>>(text.trim(), {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim(),
  })
  const rows = (result.data || []).filter((r) =>
    Object.values(r).some((v) => (v ?? '').trim() !== ''),
  )
  const headers = (result.meta.fields || []).filter(Boolean)
  return { headers, rows }
}

/** Slugify a CSV header into a stable field key */
export function headerToKey(header: string): string {
  const key = header
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return key || 'field'
}

/** Humanize a field key into a label */
export function keyToLabel(key: string): string {
  return key
    .split('_')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

const PHONE_HEADER_HINTS = ['phone', 'mobile', 'cell', 'number', 'tel', 'telephone']
const NAME_HEADER_HINTS = ['name', 'contact', 'full_name', 'fullname', 'lead']
const COMPANY_HEADER_HINTS = ['company', 'organization', 'business', 'account', 'org', 'corp']

export function detectPhoneColumn(headers: string[]): string | null {
  for (const h of headers) {
    const k = headerToKey(h)
    if (PHONE_HEADER_HINTS.some((hint) => k.includes(hint))) return k
  }
  return null
}

export function detectNameColumn(headers: string[], phoneKey: string | null): string | null {
  const candidates = headers.filter((h) => headerToKey(h) !== phoneKey)
  for (const h of candidates) {
    const k = headerToKey(h)
    if (NAME_HEADER_HINTS.some((hint) => k === hint || k.endsWith(hint))) return k
  }
  return null
}

export function detectCompanyColumn(headers: string[], excludeKeys: (string | null)[]): string | null {
  const candidates = headers.filter((h) => !excludeKeys.includes(headerToKey(h)))
  for (const h of candidates) {
    const k = headerToKey(h)
    if (COMPANY_HEADER_HINTS.some((hint) => k === hint || k.includes(hint))) return k
  }
  return null
}
