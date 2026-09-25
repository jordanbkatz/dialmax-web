import {
  arrayRemove,
  arrayUnion,
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
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../firebase'
import type { Campaign, Lead, LeadField, LeadResult, NewLeadInput } from '../types'

// ========================
// CAMPAIGNS
// ========================

function campaignsCol() {
  return collection(db, 'campaigns')
}

interface CampaignDoc {
  name?: string
  ownerUid?: string
  ownerEmail?: string
  sharedWithEmails?: string[]
  memberUids?: string[]
  createdAt?: Timestamp
  updatedAt?: Timestamp
}

function toCampaign(id: string, data: CampaignDoc): Campaign {
  return {
    id,
    name: data.name ?? 'Untitled Campaign',
    ownerUid: data.ownerUid ?? '',
    ownerEmail: data.ownerEmail ?? '',
    sharedWithEmails: Array.isArray(data.sharedWithEmails) ? data.sharedWithEmails : [],
    memberUids: Array.isArray(data.memberUids) ? data.memberUids : [],
    createdAt: data.createdAt ?? Timestamp.now(),
    updatedAt: data.updatedAt ?? Timestamp.now(),
  }
}

export function subscribeCampaigns(
  uid: string,
  userEmail: string | null,
  cb: (campaigns: Campaign[]) => void,
  onError: (e: Error) => void,
) {
  const emailNorm = userEmail ? userEmail.trim().toLowerCase() : ''
  let ownedDocs: Campaign[] = []
  let sharedDocs: Campaign[] = []

  const mergeAndEmit = () => {
    const map = new Map<string, Campaign>()
    for (const c of ownedDocs) map.set(c.id, c)
    for (const c of sharedDocs) map.set(c.id, c)
    const list = Array.from(map.values())
    list.sort((a, b) => {
      const timeA = a.createdAt ? a.createdAt.toDate().getTime() : 0
      const timeB = b.createdAt ? b.createdAt.toDate().getTime() : 0
      return timeB - timeA
    })
    cb(list)
  }

  const qOwned = query(campaignsCol(), where('ownerUid', '==', uid))
  const unsubOwned = onSnapshot(
    qOwned,
    (snap) => {
      ownedDocs = snap.docs.map((d) => toCampaign(d.id, d.data() as CampaignDoc))
      mergeAndEmit()
    },
    (err) => onError(err),
  )

  let unsubShared: (() => void) | null = null
  if (emailNorm) {
    const qShared = query(campaignsCol(), where('sharedWithEmails', 'array-contains', emailNorm))
    unsubShared = onSnapshot(
      qShared,
      (snap) => {
        sharedDocs = snap.docs.map((d) => toCampaign(d.id, d.data() as CampaignDoc))
        mergeAndEmit()
      },
      (err) => {
        console.warn('Shared campaigns subscription warning:', err)
      },
    )
  }

  return () => {
    unsubOwned()
    if (unsubShared) unsubShared()
  }
}

export async function createCampaign(
  uid: string,
  userEmail: string,
  name: string,
): Promise<string> {
  const ref = doc(campaignsCol())
  await setDoc(ref, {
    name: name.trim() || 'Untitled Campaign',
    ownerUid: uid,
    ownerEmail: userEmail.trim().toLowerCase(),
    sharedWithEmails: [],
    memberUids: [uid],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateCampaign(
  campaignId: string,
  data: { name?: string },
): Promise<void> {
  const ref = doc(campaignsCol(), campaignId)
  await updateDoc(ref, {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export async function shareCampaign(campaignId: string, email: string): Promise<void> {
  const emailNorm = email.trim().toLowerCase()
  if (!emailNorm) return
  const ref = doc(campaignsCol(), campaignId)
  await updateDoc(ref, {
    sharedWithEmails: arrayUnion(emailNorm),
    updatedAt: serverTimestamp(),
  })
}

export async function removeCollaborator(campaignId: string, email: string): Promise<void> {
  const emailNorm = email.trim().toLowerCase()
  if (!emailNorm) return
  const ref = doc(campaignsCol(), campaignId)
  await updateDoc(ref, {
    sharedWithEmails: arrayRemove(emailNorm),
    updatedAt: serverTimestamp(),
  })
}

export async function deleteCampaign(campaignId: string): Promise<void> {
  const ref = doc(campaignsCol(), campaignId)
  await deleteDoc(ref)
}

// ========================
// LEADS (Campaign Scoped)
// ========================

function leadsCol(campaignId: string) {
  return collection(db, 'campaigns', campaignId, 'leads')
}

interface LeadDoc {
  fields?: Record<string, string>
  name?: string
  phone?: string
  company?: string
  website?: string
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

function toLead(id: string, campaignId: string, data: LeadDoc): Lead {
  return {
    id,
    campaignId,
    fields: data.fields ?? {},
    name: data.name ?? '',
    phone: data.phone ?? '',
    company: data.company ?? '',
    website: data.website ?? '',
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
  campaignId: string,
  cb: (leads: Lead[]) => void,
  onError: (e: Error) => void,
) {
  const q = query(leadsCol(campaignId), orderBy('order', 'asc'))
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => toLead(d.id, campaignId, d.data() as LeadDoc))),
    (err) => onError(err),
  )
}

const MAX_BATCH = 450

export async function addLeads(campaignId: string, leads: NewLeadInput[]): Promise<void> {
  const orderBase = Date.now()
  for (let i = 0; i < leads.length; i += MAX_BATCH) {
    const batch = writeBatch(db)
    const chunk = leads.slice(i, i + MAX_BATCH)
    chunk.forEach((lead, j) => {
      const ref = doc(leadsCol(campaignId))
      batch.set(ref, {
        fields: lead.fields ?? {},
        name: lead.name,
        phone: lead.phone,
        company: lead.company,
        website: lead.website ?? '',
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
  campaignId: string,
  leadId: string,
  input: CallResultInput,
): Promise<void> {
  const ref = doc(leadsCol(campaignId), leadId)
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
  campaignId: string,
  leadId: string,
  data: { fields?: Record<string, string>; name: string; phone: string; company: string; website?: string },
): Promise<void> {
  const ref = doc(leadsCol(campaignId), leadId)
  await updateDoc(ref, data)
}

export async function deleteLead(campaignId: string, leadId: string): Promise<void> {
  await deleteDoc(doc(leadsCol(campaignId), leadId))
}

export async function deleteLeads(campaignId: string, leadIds: string[]): Promise<void> {
  for (let i = 0; i < leadIds.length; i += MAX_BATCH) {
    const batch = writeBatch(db)
    const chunk = leadIds.slice(i, i + MAX_BATCH)
    chunk.forEach((id) => {
      batch.delete(doc(leadsCol(campaignId), id))
    })
    await batch.commit()
  }
}

export async function resetLeadToNew(campaignId: string, leadId: string): Promise<void> {
  const ref = doc(leadsCol(campaignId), leadId)
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

// ========================
// FIELD CONFIG (Campaign Scoped)
// ========================

function fieldConfigRef(campaignId: string) {
  return doc(db, 'campaigns', campaignId, 'settings', 'leadFields')
}

export async function getFieldConfig(campaignId: string): Promise<LeadField[]> {
  const snap = await getDoc(fieldConfigRef(campaignId))
  if (snap.exists()) {
    const data = snap.data() as { fields?: LeadField[] }
    return Array.isArray(data.fields) ? data.fields : []
  }
  return []
}

export async function saveFieldConfig(campaignId: string, fields: LeadField[]): Promise<void> {
  await setDoc(fieldConfigRef(campaignId), { fields })
}

// ========================
// USER PROFILES
// ========================

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
