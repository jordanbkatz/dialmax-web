import { useEffect, useMemo, useState } from 'react'
import { getFieldConfig, saveFieldConfig, subscribeLeads } from '../lib/firestore'
import type { Lead, LeadField } from '../types'
import { headerToKey, keyToLabel } from '../lib/csv'

export function useLeads(uid: string | null) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!uid) {
      setLeads([])
      setLoading(false)
      return
    }
    setLoading(true)
    const unsub = subscribeLeads(
      uid,
      (ls) => {
        setLeads(ls)
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      },
    )
    return unsub
  }, [uid])

  return { leads, loading, error }
}

/**
 * Field configuration persisted per user in Firestore.
 * `allKeys` is the union of dynamic field keys found across leads,
 * so fields from CSV uploads can be reclassified at any time.
 */
export function useFieldConfig(uid: string | null, leads: Lead[]) {
  const [config, setConfig] = useState<LeadField[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!uid) return
    setLoaded(false)
    getFieldConfig(uid)
      .then((fields) => setConfig(fields))
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [uid])

  const allKeys = useMemo(() => {
    const keys = new Set<string>()
    for (const lead of leads) {
      for (const key of Object.keys(lead.fields)) {
        if (key !== 'name' && key !== 'phone') keys.add(key)
      }
    }
    // Keep config order first, then any unseen keys
    const known = config.map((f) => f.key).filter((k) => keys.has(k))
    const fresh = [...keys].filter((k) => !config.some((f) => f.key === k))
    return [...known, ...fresh]
  }, [leads, config])

  const persist = async (fields: LeadField[]) => {
    setConfig(fields)
    if (uid) await saveFieldConfig(uid, fields).catch(() => {})
  }

  const toggleImportant = async (key: string) => {
    const existing = config.find((f) => f.key === key)
    let next: LeadField[]
    if (existing) {
      next = config.map((f) => (f.key === key ? { ...f, important: !f.important } : f))
    } else {
      next = [...config, { key, label: keyToLabel(key), important: true }]
    }
    await persist(next)
  }

  const moveField = async (key: string, dir: -1 | 1) => {
    const list = allKeys.map((k) => config.find((f) => f.key === k) ?? { key: k, label: keyToLabel(k), important: false })
    const idx = list.findIndex((f) => f.key === key)
    const target = idx + dir
    if (idx < 0 || target < 0 || target >= list.length) return
    const swapped = [...list]
    ;[swapped[idx], swapped[target]] = [swapped[target], swapped[idx]]
    await persist(swapped)
  }

  const setLabel = async (key: string, label: string) => {
    const existing = config.find((f) => f.key === key)
    let next: LeadField[]
    if (existing) {
      next = config.map((f) => (f.key === key ? { ...f, label } : f))
    } else {
      next = [...config, { key, label, important: false }]
    }
    await persist(next)
  }

  /** Fields to always show on a card, in order */
  const importantFields = useMemo(
    () => config.filter((f) => f.important && allKeys.includes(f.key)),
    [config, allKeys],
  )

  /** Config entry for a key (or a sensible default) */
  const fieldMeta = (key: string): LeadField =>
    config.find((f) => f.key === key) ?? { key: headerToKey(key), label: keyToLabel(key), important: false }

  return {
    config,
    loaded,
    allKeys,
    importantFields,
    fieldMeta,
    persist,
    toggleImportant,
    moveField,
    setLabel,
  }
}
