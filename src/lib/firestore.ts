import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../firebase'
import type { Lead, LeadField, LeadResult, NewLeadInput } from '../types'

function leadsCol(uid: string) {
  return collection(db, 'users', uid, 'leads')
}

interface LeadDoc {
  fields?: Record<string, string>
  name?: string
  phone?: string
  status?: 'new' | 'called'
  result?: LeadResult | null
  note?: string
  callbackAt?: Timestamp | null
  meetingAt?: Timestamp | null
  emailFollowUp?: boolean
  calledAt?: Timestamp | null
  createdAt?: Timestamp
  order?: number
}

function toLead(id: string, data: LeadDoc): Lead {
  return {
    id,
    fields: data.fields ?? {},
    name: data.name ?? '',
    phone: data.phone ?? '',
    status: data.status ?? 'new',
    result: data.result ?? null,
    note: data.note ?? '',
    callbackAt: data.callbackAt ?? null,
    meetingAt: data.meetingAt ?? null,
    emailFollowUp: data.emailFollowUp ?? false,
    calledAt: data.calledAt ?? null,
    createdAt: data.createdAt ?? Timestamp.now(),
    order: data.order ?? 0,
  }
}

export function subscribeLeads(
  uid: string,
  cb: (leads: Lead[]) => void,
  onError: (e: Error) => void,
) {
  const q = query(leadsCol(uid), orderBy('order', 'asc'))
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => toLead(d.id, d.data() as LeadDoc))),
    (err) => onError(err),
  )
}

const MAX_BATCH = 450

export async function addLeads(uid: string, leads: NewLeadInput[]): Promise<void> {
  const orderBase = Date.now()
  for (let i = 0; i < leads.length; i += MAX_BATCH) {
    const batch = writeBatch(db)
    const chunk = leads.slice(i, i + MAX_BATCH)
    chunk.forEach((lead, j) => {
      const ref = doc(leadsCol(uid))
      batch.set(ref, {
        fields: lead.fields,
        name: lead.name,
        phone: lead.phone,
        status: 'new',
        result: null,
        note: '',
        callbackAt: null,
        meetingAt: null,
        emailFollowUp: false,
        calledAt: null,
        createdAt: serverTimestamp(),
        order: orderBase + j,
      })
    })
    await batch.commit()
  }
}

export interface CallResultInput {
  result: LeadResult
  note: string
  callbackAt: Date | null
  meetingAt: Date | null
  emailFollowUp: boolean
}

export async function logCallResult(
  uid: string,
  leadId: string,
  input: CallResultInput,
): Promise<void> {
  const ref = doc(leadsCol(uid), leadId)
  await updateDoc(ref, {
    status: 'called',
    result: input.result,
    note: input.note,
    callbackAt: input.callbackAt ? Timestamp.fromDate(input.callbackAt) : null,
    meetingAt: input.meetingAt ? Timestamp.fromDate(input.meetingAt) : null,
    emailFollowUp: input.emailFollowUp,
    calledAt: serverTimestamp(),
  })
}

export async function saveLeadDetails(
  uid: string,
  leadId: string,
  data: { fields: Record<string, string>; name: string; phone: string },
): Promise<void> {
  const ref = doc(leadsCol(uid), leadId)
  await updateDoc(ref, data)
}

export async function deleteLead(uid: string, leadId: string): Promise<void> {
  await deleteDoc(doc(leadsCol(uid), leadId))
}

export async function resetLeadToNew(uid: string, leadId: string): Promise<void> {
  const ref = doc(leadsCol(uid), leadId)
  await updateDoc(ref, {
    status: 'new',
    result: null,
    note: '',
    callbackAt: null,
    meetingAt: null,
    emailFollowUp: false,
    calledAt: null,
  })
}

// ---------- Field config ----------

function fieldConfigRef(uid: string) {
  return doc(db, 'users', uid, 'settings', 'leadFields')
}

export async function getFieldConfig(uid: string): Promise<LeadField[]> {
  const snap = await getDoc(fieldConfigRef(uid))
  if (snap.exists()) {
    const data = snap.data() as { fields?: LeadField[] }
    return Array.isArray(data.fields) ? data.fields : []
  }
  return []
}

export async function saveFieldConfig(uid: string, fields: LeadField[]): Promise<void> {
  await setDoc(fieldConfigRef(uid), { fields })
}

export async function ensureUserDoc(
  uid: string,
  profile: { displayName?: string | null; photoURL?: string | null; email?: string | null },
): Promise<void> {
  await setDoc(
    doc(db, 'users', uid),
    {
      displayName: profile.displayName ?? '',
      photoURL: profile.photoURL ?? '',
      email: profile.email ?? '',
      lastSeenAt: serverTimestamp(),
    },
    { merge: true },
  )
}
