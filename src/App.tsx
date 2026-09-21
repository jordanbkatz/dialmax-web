import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Timestamp } from 'firebase/firestore'
import { useAuth } from './hooks/useAuth'
import { useFieldConfig, useLeads } from './hooks/useLeads'
import {
  addLeads,
  deleteLead,
  logCallResult,
  resetLeadToNew,
  saveLeadDetails,
} from './lib/firestore'
import type { CallResultInput } from './lib/firestore'
import type { Lead, LeadField, NewLeadInput } from './types'
import LoginScreen from './components/LoginScreen'
import LeadCard from './components/LeadCard'
import Dialer from './components/Dialer'
import ResultSheet from './components/ResultSheet'
import UploadModal from './components/UploadModal'
import LeadFormModal from './components/LeadFormModal'
import FieldManager from './components/FieldManager'
import {
  LogoMark,
  LogoutIcon,
  PhoneIcon,
  PlusIcon,
  SearchIcon,
  SlidersIcon,
  UploadIcon,
  UsersIcon,
} from './components/Icons'

type View = 'list' | 'dialer'
type Filter = 'queue' | 'callbacks' | 'logged'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'queue', label: 'Queue' },
  { id: 'callbacks', label: 'Callbacks' },
  { id: 'logged', label: 'Logged' },
]

export default function App() {
  const { user, loading: authLoading, signIn, logout } = useAuth()
  const uid = user?.uid ?? null
  const { leads, loading: leadsLoading, error: leadsError } = useLeads(uid)
  const fieldCfg = useFieldConfig(uid, leads)

  const [view, setView] = useState<View>('list')
  const [filter, setFilter] = useState<Filter>('queue')
  const [search, setSearch] = useState('')
  const [dialIndex, setDialIndex] = useState(0)
  const [pinnedLeadId, setPinnedLeadId] = useState<string | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const [showFields, setShowFields] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [leadForm, setLeadForm] = useState<{ lead: Lead | null } | null>(null)
  const [resultLead, setResultLead] = useState<Lead | null>(null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2600)
  }
  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current)
    },
    [],
  )

  const importantFields = fieldCfg.importantFields

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list: Lead[]
    if (filter === 'queue') {
      list = leads.filter((l) => l.status === 'new')
    } else if (filter === 'callbacks') {
      list = leads
        .filter((l) => l.callbackAt)
        .sort((a, b) => tsMillis(a.callbackAt) - tsMillis(b.callbackAt))
    } else {
      list = leads.filter((l) => l.status === 'called')
    }
    if (q) {
      list = list.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.phone.replace(/\D/g, '').includes(q.replace(/\D/g, '')) ||
          Object.values(l.fields).some((v) => v.toLowerCase().includes(q)),
      )
    }
    return list
  }, [leads, filter, search])

  const dialQueue = useMemo(() => leads.filter((l) => l.status === 'new'), [leads])
  const dialLead = useMemo(() => {
    if (pinnedLeadId) {
      const pinned = leads.find((l) => l.id === pinnedLeadId)
      if (pinned) return pinned
    }
    if (dialQueue.length === 0) return null
    return dialQueue[Math.min(dialIndex, dialQueue.length - 1)]
  }, [pinnedLeadId, leads, dialQueue, dialIndex])

  const stats = useMemo(() => {
    const called = leads.filter((l) => l.status === 'called')
    return {
      total: leads.length,
      new: leads.length - called.length,
      positive: called.filter((l) => l.result === 'positive').length,
      callbacks: leads.filter((l) => l.callbackAt).length,
      logged: called.length,
    }
  }, [leads])

  // ---------- actions ----------

  const handleImport = async (newLeads: NewLeadInput[], config: LeadField[]) => {
    if (!uid) return
    setBusy(true)
    try {
      await addLeads(uid, newLeads)
      const merged: LeadField[] = [...fieldCfg.config]
      for (const f of config) {
        const idx = merged.findIndex((m) => m.key === f.key)
        if (idx >= 0) merged[idx] = f
        else merged.push(f)
      }
      await fieldCfg.persist(merged)
      setShowUpload(false)
      setFilter('queue')
      showToast(`Imported ${newLeads.length} leads`)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setBusy(false)
    }
  }

  const handleSaveResult = async (lead: Lead, input: CallResultInput) => {
    if (!uid) return
    setBusy(true)
    try {
      await logCallResult(uid, lead.id, input)
      setResultLead(null)
      setPinnedLeadId(null)
      const label =
        input.result === 'positive'
          ? 'Positive'
          : input.result === 'negative'
            ? 'Negative'
            : 'Callback'
      showToast(`Saved: ${label}`)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not save result')
    } finally {
      setBusy(false)
    }
  }

  const handleReset = async (lead: Lead) => {
    if (!uid) return
    setBusy(true)
    try {
      await resetLeadToNew(uid, lead.id)
      showToast('Lead requeued')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not requeue lead')
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async (lead: Lead) => {
    if (!uid) return
    if (!window.confirm(`Delete ${lead.name || 'this lead'}? This cannot be undone.`)) return
    setBusy(true)
    try {
      await deleteLead(uid, lead.id)
      showToast('Lead deleted')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not delete lead')
    } finally {
      setBusy(false)
    }
  }

  const handleSaveLead = async (data: { fields: Record<string, string>; name: string; phone: string }) => {
    if (!uid || !leadForm) return
    setBusy(true)
    try {
      if (leadForm.lead) {
        await saveLeadDetails(uid, leadForm.lead.id, data)
        showToast('Lead updated')
      } else {
        await addLeads(uid, [data])
        showToast('Lead added')
      }
      setLeadForm(null)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not save lead')
    } finally {
      setBusy(false)
    }
  }

  const openDialer = () => {
    setPinnedLeadId(null)
    setDialIndex(0)
    setView('dialer')
  }

  const callLead = (lead: Lead) => {
    setPinnedLeadId(lead.id)
    setView('dialer')
    window.location.href = `tel:${lead.phone.replace(/[^\d+]/g, '')}`
  }

  // ---------- render ----------

  if (authLoading) {
    return <Splash />
  }

  if (!user) {
    return <LoginScreen onSignIn={signIn} />
  }

  return (
    <div className="min-h-full flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-lg border-b border-slate-200/70">
        <div className="max-w-md mx-auto md:max-w-2xl lg:max-w-4xl flex items-center gap-3 px-4 pt-[calc(env(safe-area-inset-top)+12px)] pb-3">
          <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center shadow-sm shadow-brand-600/30">
            <LogoMark className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold tracking-tight text-slate-900 leading-none">Dialmax</h1>
            <p className="text-[11px] text-slate-400 mt-0.5 truncate">
              {user.displayName || user.email}
            </p>
          </div>
          <button
            onClick={() => setShowFields(true)}
            className="p-2.5 rounded-xl text-slate-500 hover:bg-slate-100"
            aria-label="Manage fields"
          >
            <SlidersIcon />
          </button>
          <button
            onClick={() => setShowMenu(true)}
            className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold text-slate-600 overflow-hidden"
            aria-label="Menu"
          >
            {user.photoURL ? (
              <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
            ) : (
              (user.displayName || user.email || '?').charAt(0).toUpperCase()
            )}
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto md:max-w-2xl lg:max-w-4xl w-full">
        {leadsError ? (
          <div className="m-4 rounded-2xl bg-rose-50 ring-1 ring-rose-200 p-4 text-sm text-rose-700">
            {leadsError}
          </div>
        ) : view === 'list' ? (
          <ListView />
        ) : (
          <Dialer
            lead={dialLead}
            done={stats.logged}
            remaining={dialQueue.length}
            importantFields={importantFields}
            onLogResult={() => dialLead && setResultLead(dialLead)}
            onSkip={() => setDialIndex((i) => i + 1)}
            onBackToQueue={() => setView('list')}
          />
        )}
      </main>

      {/* Bottom nav */}
      <nav className="sticky bottom-0 z-30 bg-white/90 backdrop-blur-lg border-t border-slate-200/70">
        <div className="max-w-md mx-auto md:max-w-2xl lg:max-w-4xl grid grid-cols-3 px-4 pb-[calc(env(safe-area-inset-bottom)+8px)] pt-2">
          <NavButton
            active={view === 'list'}
            onClick={() => setView('list')}
            icon={<UsersIcon />}
            label="Leads"
          />
          <NavButton
            active={view === 'dialer'}
            onClick={openDialer}
            icon={<PhoneIcon />}
            label="Dial"
            badge={stats.new || undefined}
          />
          <NavButton
            active={false}
            onClick={() => setLeadForm({ lead: null })}
            icon={<PlusIcon />}
            label="Add"
          />
        </div>
      </nav>

      {/* Toast */}
      {toast && (
        <div className="fixed top-[calc(env(safe-area-inset-top)+70px)] inset-x-0 z-50 flex justify-center px-4 pointer-events-none">
          <div className="animate-fade-in rounded-full bg-slate-900/90 backdrop-blur px-4 py-2.5 text-sm font-medium text-white shadow-xl">
            {toast}
          </div>
        </div>
      )}

      {/* Sheets & modals */}
      {showUpload && (
        <UploadModal
          busy={busy}
          existingConfig={fieldCfg.config}
          onClose={() => setShowUpload(false)}
          onImport={handleImport}
        />
      )}
      {showFields && (
        <FieldManager
          allKeys={fieldCfg.allKeys}
          config={fieldCfg.config}
          busy={busy}
          onClose={() => setShowFields(false)}
          onToggleImportant={fieldCfg.toggleImportant}
          onMove={fieldCfg.moveField}
          onSetLabel={fieldCfg.setLabel}
        />
      )}
      {leadForm && (
        <LeadFormModal
          key={leadForm.lead?.id ?? 'new'}
          lead={leadForm.lead}
          importantFields={importantFields}
          busy={busy}
          onClose={() => setLeadForm(null)}
          onSave={handleSaveLead}
        />
      )}
      {resultLead && (
        <ResultSheet
          lead={resultLead}
          busy={busy}
          onSave={(input) => handleSaveResult(resultLead, input)}
          onClose={() => setResultLead(null)}
        />
      )}
      {showMenu && (
        <MenuSheet
          email={user.email || ''}
          onClose={() => setShowMenu(false)}
          onUpload={() => {
            setShowMenu(false)
            setShowUpload(true)
          }}
          onFields={() => {
            setShowMenu(false)
            setShowFields(true)
          }}
          onLogout={() => {
            setShowMenu(false)
            logout()
          }}
        />
      )}
    </div>
  )

  function ListView() {
    return (
      <div className="px-4 pt-4 pb-8">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-2">
          <StatTile label="Leads" value={stats.total} />
          <StatTile label="New" value={stats.new} accent="text-brand-600" />
          <StatTile label="Calls" value={stats.logged} accent="text-slate-900" />
          <StatTile label="Callbacks" value={stats.callbacks} accent="text-amber-500" />
        </div>

        {/* Search */}
        <div className="mt-4 relative">
          <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads…"
            className="w-full rounded-xl border-0 bg-white pl-10 pr-4 py-2.5 text-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-brand-400 outline-none placeholder:text-slate-400 shadow-sm"
          />
        </div>

        {/* Filter tabs */}
        <div className="mt-3 flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition active:scale-[0.97] ${
                filter === f.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-500 ring-1 ring-slate-200'
              }`}
            >
              {f.label}
              {f.id === 'callbacks' && stats.callbacks > 0 && (
                <span className={`ml-1.5 text-xs ${filter === f.id ? 'text-white/70' : 'text-slate-400'}`}>
                  {stats.callbacks}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="mt-4 space-y-3">
          {leadsLoading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : filtered.length === 0 ? (
            <EmptyState
              filter={filter}
              hasLeads={leads.length > 0}
              onUpload={() => setShowUpload(true)}
              onAdd={() => setLeadForm({ lead: null })}
            />
          ) : (
            filtered.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                importantFields={importantFields}
                fieldMeta={fieldCfg.fieldMeta}
                onCall={callLead}
                onLogResult={(l) => setResultLead(l)}
                onEdit={(l) => setLeadForm({ lead: l })}
                onReset={handleReset}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>

        {/* Upload CTA */}
        {leads.length > 0 && (
          <button
            onClick={() => setShowUpload(true)}
            className="mt-4 w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-white/60 px-4 py-3.5 text-sm font-semibold text-slate-500 hover:border-brand-300 hover:text-brand-600 transition"
          >
            <UploadIcon className="w-4 h-4" />
            Upload more leads
          </button>
        )}
      </div>
    )
  }
}

function tsMillis(ts: Timestamp | null): number {
  return ts ? ts.toDate().getTime() : 0
}

function Splash() {
  return (
    <div className="min-h-full flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-600/30">
          <LogoMark className="w-7 h-7 text-white" />
        </div>
        <span className="w-5 h-5 border-2 border-slate-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    </div>
  )
}

function StatTile({ label, value, accent = 'text-slate-900' }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`text-xl font-bold ${accent}`}>{value}</p>
    </div>
  )
}

function NavButton({
  active,
  onClick,
  icon,
  label,
  badge,
}: {
  active: boolean
  onClick: () => void
  icon: ReactNode
  label: string
  badge?: number
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center gap-0.5 rounded-xl py-1.5 transition ${
        active ? 'text-brand-600' : 'text-slate-400'
      }`}
    >
      <span className="relative">
        {icon}
        {badge !== undefined && (
          <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </span>
      <span className="text-[10px] font-semibold">{label}</span>
    </button>
  )
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70 p-4 animate-pulse">
      <div className="h-4 w-1/3 bg-slate-200 rounded" />
      <div className="mt-2.5 h-3.5 w-1/4 bg-slate-100 rounded" />
      <div className="mt-4 flex gap-2">
        <div className="h-10 flex-1 bg-slate-100 rounded-xl" />
        <div className="h-10 flex-1 bg-slate-100 rounded-xl" />
      </div>
    </div>
  )
}

function EmptyState({
  filter,
  hasLeads,
  onUpload,
  onAdd,
}: {
  filter: Filter
  hasLeads: boolean
  onUpload: () => void
  onAdd: () => void
}) {
  if (!hasLeads) {
    return (
      <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/70 px-6 py-12 text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-brand-50 ring-1 ring-brand-100 flex items-center justify-center">
          <UsersIcon className="w-7 h-7 text-brand-500" />
        </div>
        <h3 className="mt-4 text-base font-bold text-slate-900">No leads yet</h3>
        <p className="mt-1.5 text-sm text-slate-500">Upload a CSV or add your first lead manually.</p>
        <div className="mt-6 flex gap-2 justify-center">
          <button
            onClick={onUpload}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-600/30 active:scale-[0.98] transition"
          >
            <UploadIcon className="w-4 h-4" />
            Upload CSV
          </button>
          <button
            onClick={onAdd}
            className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-600 active:scale-[0.98] transition"
          >
            Add manually
          </button>
        </div>
      </div>
    )
  }
  const msg: Record<Filter, string> = {
    queue: 'No new leads in the queue. Upload more or requeue a logged lead.',
    callbacks: 'No scheduled callbacks. Mark a call as "Callback" to schedule one.',
    logged: 'No calls logged yet. Work the queue to see results here.',
  }
  return (
    <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/70 px-6 py-12 text-center">
      <p className="text-sm text-slate-500">{msg[filter]}</p>
    </div>
  )
}

function MenuSheet({
  email,
  onClose,
  onUpload,
  onFields,
  onLogout,
}: {
  email: string
  onClose: () => void
  onUpload: () => void
  onFields: () => void
  onLogout: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <div className="relative w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl animate-sheet-up p-2">
        <p className="px-4 pt-3 pb-2 text-xs font-medium text-slate-400 truncate">{email}</p>
        <button
          onClick={onUpload}
          className="w-full flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <UploadIcon className="w-5 h-5 text-slate-400" />
          Upload leads
        </button>
        <button
          onClick={onFields}
          className="w-full flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <SlidersIcon className="w-5 h-5 text-slate-400" />
          Manage lead fields
        </button>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-semibold text-rose-500 hover:bg-rose-50"
        >
          <LogoutIcon className="w-5 h-5" />
          Sign out
        </button>
      </div>
    </div>
  )
}
