import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { useCampaigns, useFieldConfig, useLeads } from './hooks/useLeads'
import {
  addLeads,
  deleteLead,
  deleteLeads,
  logCallResult,
  resetLeadToNew,
  saveLeadDetails,
} from './lib/firestore'
import type { CallResultInput } from './lib/firestore'
import type { Campaign, Lead, LeadField, LeadFilter, NewLeadInput } from './types'
import LoginScreen from './components/LoginScreen'
import LeadCard from './components/LeadCard'
import Dialer from './components/Dialer'
import ResultSheet from './components/ResultSheet'
import UploadModal from './components/UploadModal'
import LeadFormModal from './components/LeadFormModal'
import ShareCampaignModal from './components/ShareCampaignModal'
import CampaignModal from './components/CampaignModal'
import ConfirmModal from './components/ConfirmModal'
import {
  FolderIcon,
  LogoMark,
  LogoutIcon,
  PencilIcon,
  PhoneIcon,
  PlusIcon,
  SearchIcon,
  ShareIcon,
  TrashIcon,
  UploadIcon,
  UsersIcon,
  XIcon,
} from './components/Icons'

type View = 'list' | 'dialer'

function getUserInitials(name?: string | null, email?: string | null): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
    }
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase()
    }
  }
  if (email && email.trim()) {
    const local = email.trim().split('@')[0]
    const parts = local.split(/[._-]+/).filter(Boolean)
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase()
    }
    return local.slice(0, 2).toUpperCase()
  }
  return 'U'
}

const FILTERS: { id: LeadFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'queue', label: 'Queue' },
  { id: 'finished', label: 'Finished' },
]

export default function App() {
  const { user, loading: authLoading, signIn, logout } = useAuth()
  const uid = user?.uid ?? null
  const userEmail = user?.email ?? null

  const {
    campaigns,
    loading: campaignsLoading,
    error: campaignsError,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    shareCampaign,
    removeCollaborator,
  } = useCampaigns(uid, userEmail)

  // When selectedCampaignId is null, the default view is the Campaigns list screen.
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null)
  const [campaignSearch, setCampaignSearch] = useState('')

  const activeCampaign = useMemo(
    () => (selectedCampaignId ? campaigns.find((c) => c.id === selectedCampaignId) ?? null : null),
    [campaigns, selectedCampaignId],
  )

  const { leads, loading: leadsLoading, error: leadsError } = useLeads(activeCampaign?.id ?? null)
  const fieldCfg = useFieldConfig(activeCampaign?.id ?? null, leads)

  const [view, setView] = useState<View>('list')
  const [filter, setFilter] = useState<LeadFilter>('all')
  const [search, setSearch] = useState('')
  const [dialIndex, setDialIndex] = useState(0)
  const [pinnedLeadId, setPinnedLeadId] = useState<string | null>(null)

  // Modals state
  const [showUpload, setShowUpload] = useState(false)
  const [shareCampaignTarget, setShareCampaignTarget] = useState<Campaign | null>(null)
  const [campaignModal, setCampaignModal] = useState<{ mode: 'create' | 'edit'; target?: Campaign } | null>(null)
  const [deleteCampaignTarget, setDeleteCampaignTarget] = useState<Campaign | null>(null)
  const [deleteLeadTarget, setDeleteLeadTarget] = useState<Lead | null>(null)
  const [deleteBatchTarget, setDeleteBatchTarget] = useState<{ leads: Lead[]; query: string } | null>(null)
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

  // Filtered campaigns for campaigns list view
  const filteredCampaigns = useMemo(() => {
    const q = campaignSearch.trim().toLowerCase()
    if (!q) return campaigns
    return campaigns.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.ownerEmail.toLowerCase().includes(q) ||
        c.sharedWithEmails.some((e) => e.toLowerCase().includes(q)),
    )
  }, [campaigns, campaignSearch])

  // Filtered leads for campaign view
  const filteredLeads = useMemo(() => {
    const rawQ = search.trim()
    const q = rawQ.toLowerCase()
    const qDigits = rawQ.replace(/\D/g, '')

    let list: Lead[]
    if (filter === 'all') {
      list = leads
    } else if (filter === 'queue') {
      list = leads.filter((l) => l.status === 'new')
    } else {
      list = leads.filter((l) => l.status === 'called')
    }

    if (q) {
      list = list.filter((l) => {
        const name = (l.name || '').toLowerCase()
        const company = (l.company || '').toLowerCase()
        const website = (l.website || '').toLowerCase()
        const phone = (l.phone || '').toLowerCase()
        const phoneDigits = (l.phone || '').replace(/\D/g, '')

        const matchesName = name.includes(q)
        const matchesCompany = company.includes(q)
        const matchesWebsite = website.includes(q)
        const matchesPhoneText = phone.includes(q)
        const matchesPhoneDigits = qDigits.length > 0 && phoneDigits.includes(qDigits)

        return (
          matchesName ||
          matchesCompany ||
          matchesWebsite ||
          matchesPhoneText ||
          matchesPhoneDigits
        )
      })
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

  // Top stats: Total, Positive, Indeterminate, Negative
  const stats = useMemo(() => {
    return {
      total: leads.length,
      positive: leads.filter((l) => l.result === 'positive').length,
      indeterminate: leads.filter((l) => l.result === 'indeterminate').length,
      negative: leads.filter((l) => l.result === 'negative').length,
      queue: leads.filter((l) => l.status === 'new').length,
      finished: leads.filter((l) => l.status === 'called').length,
    }
  }, [leads])

  // ---------- Campaign actions ----------

  const handleSaveCampaign = async (name: string) => {
    setBusy(true)
    try {
      if (campaignModal?.mode === 'create') {
        const newId = await createCampaign(name)
        setSelectedCampaignId(newId)
        showToast('Campaign created')
      } else {
        const target = campaignModal?.target ?? activeCampaign
        if (target) {
          await updateCampaign(target.id, { name })
          showToast('Campaign renamed')
        }
      }
      setCampaignModal(null)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not save campaign')
    } finally {
      setBusy(false)
    }
  }

  const handleConfirmDeleteCampaign = async () => {
    if (!deleteCampaignTarget || !uid) return
    if (deleteCampaignTarget.ownerUid !== uid) {
      showToast('Only the campaign owner can delete it')
      setDeleteCampaignTarget(null)
      return
    }
    setBusy(true)
    try {
      await deleteCampaign(deleteCampaignTarget.id)
      if (selectedCampaignId === deleteCampaignTarget.id) {
        setSelectedCampaignId(null)
      }
      setDeleteCampaignTarget(null)
      showToast('Campaign deleted')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not delete campaign')
    } finally {
      setBusy(false)
    }
  }

  // ---------- Lead actions ----------

  const handleImport = async (newLeads: NewLeadInput[], config: LeadField[]) => {
    if (!activeCampaign) return
    setBusy(true)
    try {
      await addLeads(activeCampaign.id, newLeads)
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
    if (!activeCampaign) return
    setBusy(true)
    try {
      await logCallResult(activeCampaign.id, lead.id, input)
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
    if (!activeCampaign) return
    setBusy(true)
    try {
      await resetLeadToNew(activeCampaign.id, lead.id)
      showToast('Lead requeued')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not requeue lead')
    } finally {
      setBusy(false)
    }
  }

  const handleConfirmDeleteLead = async () => {
    if (!activeCampaign || !deleteLeadTarget) return
    setBusy(true)
    try {
      await deleteLead(activeCampaign.id, deleteLeadTarget.id)
      setDeleteLeadTarget(null)
      showToast('Lead deleted')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not delete lead')
    } finally {
      setBusy(false)
    }
  }

  const handleConfirmDeleteBatch = async () => {
    if (!activeCampaign || !deleteBatchTarget || deleteBatchTarget.leads.length === 0) return
    setBusy(true)
    try {
      const ids = deleteBatchTarget.leads.map((l) => l.id)
      await deleteLeads(activeCampaign.id, ids)
      const count = ids.length
      setDeleteBatchTarget(null)
      setSearch('')
      showToast(`Deleted ${count} lead${count === 1 ? '' : 's'}`)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not delete leads')
    } finally {
      setBusy(false)
    }
  }

  const handleSaveLead = async (data: { name: string; phone: string; company: string; website: string }) => {
    if (!activeCampaign || !leadForm) return
    setBusy(true)
    try {
      if (leadForm.lead) {
        await saveLeadDetails(activeCampaign.id, leadForm.lead.id, data)
        showToast('Lead updated')
      } else {
        await addLeads(activeCampaign.id, [data])
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

  if (authLoading || (uid && campaignsLoading)) {
    return <Splash />
  }

  if (!user) {
    return <LoginScreen onSignIn={signIn} />
  }

  return (
    <div className="min-h-full flex flex-col bg-slate-100">
      {/* Top Bar Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-md mx-auto md:max-w-2xl lg:max-w-4xl px-4 pt-[calc(env(safe-area-inset-top)+8px)] pb-2.5">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Brand Logo and App Name */}
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-brand-600 flex items-center justify-center shadow-md shadow-brand-600/30 shrink-0">
                <LogoMark className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900 leading-tight tracking-tight">Dialmax</h1>
                <p className="text-xs font-semibold text-slate-400">Cold Calling Tool</p>
              </div>
            </div>

            {/* Right Header Actions: User Menu */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowMenu(true)}
                className="w-11 h-11 rounded-full bg-gradient-to-br from-brand-600 to-slate-900 flex items-center justify-center text-sm font-black text-white shadow-sm ring-2 ring-brand-100 hover:ring-brand-400 hover:scale-105 active:scale-95 transition-all duration-150 shrink-0 select-none tracking-wider"
                aria-label="User menu"
              >
                {getUserInitials(user.displayName, user.email)}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-md mx-auto md:max-w-2xl lg:max-w-4xl w-full pb-12">
        {campaignsError || (activeCampaign && leadsError) ? (
          <div className="m-4 rounded-2xl bg-rose-50 ring-1 ring-rose-200 p-4 text-sm text-rose-700">
            {campaignsError || leadsError}
          </div>
        ) : !activeCampaign ? (
          /* Default View: Campaigns List */
          CampaignsListView()
        ) : view === 'dialer' ? (
          /* Dialer View */
          <div className="pt-4">
            <div className="px-4 mb-2 flex items-center justify-between">
              <button
                onClick={() => setView('list')}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 bg-white px-3 py-1.5 rounded-xl shadow-xs ring-1 ring-slate-200 hover:bg-slate-50 transition-all duration-150"
              >
                ← Back to campaign leads
              </button>
              <span className="text-xs font-semibold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-full ring-1 ring-brand-200">
                {activeCampaign.name}
              </span>
            </div>
            <Dialer
              lead={dialLead}
              done={stats.finished}
              remaining={dialQueue.length}
              onLogResult={() => dialLead && setResultLead(dialLead)}
              onSkip={() => setDialIndex((i) => i + 1)}
              onBackToQueue={() => setView('list')}
            />
          </div>
        ) : (
          /* Campaign Detail Leads View */
          CampaignDetailView()
        )}
      </main>

      {/* Toast */}
      {toast && (
        <div className="fixed top-[calc(env(safe-area-inset-top)+70px)] inset-x-0 z-50 flex justify-center px-4 pointer-events-none">
          <div className="animate-fade-in rounded-full bg-slate-900/90 backdrop-blur px-4 py-2.5 text-sm font-medium text-white shadow-xl">
            {toast}
          </div>
        </div>
      )}

      {/* Modals */}
      {showUpload && activeCampaign && (
        <UploadModal
          busy={busy}
          existingConfig={fieldCfg.config}
          onClose={() => setShowUpload(false)}
          onImport={handleImport}
        />
      )}
      {shareCampaignTarget && (
        <ShareCampaignModal
          campaign={shareCampaignTarget}
          currentUserUid={user.uid}
          onClose={() => setShareCampaignTarget(null)}
          onShare={async (email) => {
            await shareCampaign(shareCampaignTarget.id, email)
            showToast(`Shared with ${email}`)
          }}
          onRemoveCollaborator={async (email) => {
            await removeCollaborator(shareCampaignTarget.id, email)
            showToast(`Removed access for ${email}`)
          }}
        />
      )}
      {campaignModal && (
        <CampaignModal
          campaign={campaignModal.mode === 'edit' ? (campaignModal.target ?? activeCampaign) : null}
          busy={busy}
          onClose={() => setCampaignModal(null)}
          onSave={handleSaveCampaign}
        />
      )}
      {leadForm && activeCampaign && (
        <LeadFormModal
          key={leadForm.lead?.id ?? 'new'}
          lead={leadForm.lead}
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
          activeCampaign={activeCampaign}
          isOwner={activeCampaign?.ownerUid === uid}
          onClose={() => setShowMenu(false)}
          onNewCampaign={() => {
            setShowMenu(false)
            setCampaignModal({ mode: 'create' })
          }}
          onEditCampaign={() => {
            setShowMenu(false)
            if (activeCampaign) setCampaignModal({ mode: 'edit', target: activeCampaign })
          }}
          onDeleteCampaign={() => {
            setShowMenu(false)
            if (activeCampaign) setDeleteCampaignTarget(activeCampaign)
          }}
          onUpload={() => {
            setShowMenu(false)
            setShowUpload(true)
          }}
          onShare={() => {
            setShowMenu(false)
            if (activeCampaign) setShareCampaignTarget(activeCampaign)
          }}
          onLogout={() => {
            setShowMenu(false)
            logout()
          }}
        />
      )}

      {/* Delete Campaign Confirm Modal */}
      {deleteCampaignTarget && (
        <ConfirmModal
          title="Delete Campaign?"
          message={`Are you sure you want to delete "${deleteCampaignTarget.name}" and all its leads? This action cannot be undone.`}
          confirmLabel="Delete Campaign"
          busy={busy}
          onConfirm={handleConfirmDeleteCampaign}
          onClose={() => setDeleteCampaignTarget(null)}
        />
      )}

      {/* Delete Lead Confirm Modal */}
      {deleteLeadTarget && (
        <ConfirmModal
          title="Delete Lead?"
          message={`Are you sure you want to delete ${deleteLeadTarget.name || deleteLeadTarget.company ? `"${deleteLeadTarget.name || deleteLeadTarget.company}"` : 'this lead'}? This action cannot be undone.`}
          confirmLabel="Delete Lead"
          busy={busy}
          onConfirm={handleConfirmDeleteLead}
          onClose={() => setDeleteLeadTarget(null)}
        />
      )}

      {/* Delete Search Results Batch Confirm Modal */}
      {deleteBatchTarget && (
        <ConfirmModal
          title={`Delete ${deleteBatchTarget.leads.length} Search Result${deleteBatchTarget.leads.length === 1 ? '' : 's'}?`}
          message={`Are you sure you want to permanently delete all ${deleteBatchTarget.leads.length} lead${deleteBatchTarget.leads.length === 1 ? '' : 's'} matching "${deleteBatchTarget.query}"? This action cannot be undone.`}
          confirmLabel={`Delete ${deleteBatchTarget.leads.length} Lead${deleteBatchTarget.leads.length === 1 ? '' : 's'}`}
          busy={busy}
          onConfirm={handleConfirmDeleteBatch}
          onClose={() => setDeleteBatchTarget(null)}
        />
      )}
    </div>
  )

  /** Default View: All Campaigns */
  function CampaignsListView() {
    return (
      <div className="px-4 pt-4 pb-8 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Your Campaigns</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {campaigns.length} campaign{campaigns.length === 1 ? '' : 's'} available
            </p>
          </div>
          <button
            onClick={() => setCampaignModal({ mode: 'create' })}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm shadow-brand-600/30 hover:bg-brand-500 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-150"
          >
            <PlusIcon className="w-4 h-4" />
            New Campaign
          </button>
        </div>

        {/* Search campaigns */}
        {campaigns.length > 0 && (
          <div className="relative">
            <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              value={campaignSearch}
              onChange={(e) => setCampaignSearch(e.target.value)}
              placeholder="Search campaigns by name or collaborator…"
              className="w-full rounded-xl border-0 bg-white pl-10 pr-4 py-2.5 text-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-brand-400 outline-none placeholder:text-slate-400 shadow-xs"
            />
          </div>
        )}

        {/* Campaigns Grid */}
        {campaigns.length === 0 ? (
          <div className="mt-6 text-center">
            <div className="rounded-3xl bg-white shadow-xs ring-1 ring-slate-200/80 px-6 py-12">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-50 ring-1 ring-brand-100 flex items-center justify-center">
                <FolderIcon className="w-8 h-8 text-brand-600" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-slate-900">No campaigns yet</h3>
              <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto">
                Create your first campaign to upload leads and start making calls with your team.
              </p>
              <button
                onClick={() => setCampaignModal({ mode: 'create' })}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-brand-600/30 hover:bg-brand-500 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-150"
              >
                <PlusIcon className="w-4 h-4" />
                Create Campaign
              </button>
            </div>
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="rounded-3xl bg-white shadow-xs ring-1 ring-slate-200/70 px-6 py-12 text-center">
            <p className="text-sm text-slate-500">No campaigns found matching "{campaignSearch}".</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredCampaigns.map((c) => {
              const isOwner = c.ownerUid === uid
              return (
                <div
                  key={c.id}
                  onDoubleClick={() => {
                    setSelectedCampaignId(c.id)
                    setView('list')
                  }}
                  className="group rounded-2xl bg-white shadow-xs ring-1 ring-slate-200/80 p-4 transition-all duration-150 hover:shadow-md hover:ring-brand-300 flex flex-col justify-between gap-3 cursor-pointer select-none"
                  title="Double-click to open campaign"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <FolderIcon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-bold text-slate-900 truncate group-hover:text-brand-600 transition-colors">
                            {c.name}
                          </h3>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                              isOwner
                                ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                                : 'bg-sky-50 text-sky-700 ring-1 ring-sky-200'
                            }`}
                          >
                            {isOwner ? 'Owner' : 'Shared'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 truncate">
                          {isOwner
                            ? c.sharedWithEmails.length > 0
                              ? `Shared with ${c.sharedWithEmails.length} collaborator${c.sharedWithEmails.length === 1 ? '' : 's'}`
                              : 'Private campaign'
                            : `Shared by ${c.ownerEmail || 'collaborator'}`}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Card Action Buttons */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        setSelectedCampaignId(c.id)
                        setView('list')
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100 active:scale-95 transition-all duration-150"
                    >
                      Open Campaign →
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setShareCampaignTarget(c)
                        }}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-brand-50 active:scale-95 transition-all duration-150"
                        title="Share campaign"
                      >
                        <ShareIcon className="w-4 h-4" />
                      </button>

                      {isOwner && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setCampaignModal({ mode: 'edit', target: c })
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 active:scale-95 transition-all duration-150"
                            title="Rename campaign"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeleteCampaignTarget(c)
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 active:scale-95 transition-all duration-150"
                            title="Delete campaign"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  /** Campaign Detail View */
  function CampaignDetailView() {
    if (!activeCampaign) return null

    return (
      <div className="px-4 pt-4 pb-8 space-y-4">
        {/* Top Header Row in Content: Back to Campaigns + Campaign Title & Actions */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => {
                setView('list')
                setSelectedCampaignId(null)
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-200/80 hover:bg-slate-300 text-slate-700 hover:text-slate-900 px-4 py-2.5 text-sm font-semibold active:scale-95 transition-all duration-150 shrink-0"
              title="Back to all campaigns"
            >
              ← Campaigns
            </button>
            <div className="min-w-0 flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 truncate">
                {activeCampaign.name}
              </h2>
              {activeCampaign.ownerUid === uid && (
                <button
                  onClick={() => setCampaignModal({ mode: 'edit', target: activeCampaign })}
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 active:scale-95 transition-all duration-150 shrink-0"
                  title="Rename campaign"
                >
                  <PencilIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Campaign Action buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setShareCampaignTarget(activeCampaign)}
              className="p-2.5 rounded-xl text-slate-600 bg-slate-200/80 hover:bg-slate-300 hover:text-slate-900 active:scale-95 transition-all duration-150"
              title="Share campaign"
              aria-label="Share campaign"
            >
              <ShareIcon className="w-5 h-5" />
            </button>
            {activeCampaign.ownerUid === uid && (
              <button
                onClick={() => setDeleteCampaignTarget(activeCampaign)}
                className="p-2.5 rounded-xl text-slate-500 bg-slate-200/80 hover:bg-rose-100 hover:text-rose-600 active:scale-95 transition-all duration-150"
                title="Delete campaign"
                aria-label="Delete campaign"
              >
                <TrashIcon className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
        {/* Top Stats: Total, Positive, Indeterminate, Negative */}
        <div className="grid grid-cols-4 gap-2">
          <StatTile label="Total" value={stats.total} accent="text-slate-900" />
          <StatTile label="Positive" value={stats.positive} accent="text-emerald-600" />
          <StatTile label="Indeterminate" value={stats.indeterminate} accent="text-amber-500" />
          <StatTile label="Negative" value={stats.negative} accent="text-rose-500" />
        </div>

        {/* Top Action Toolbar (Upload / Add Leads / Dial Queue) */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {stats.queue > 0 && (
            <button
              onClick={openDialer}
              className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-600/30 hover:bg-brand-500 hover:shadow-md hover:shadow-brand-600/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-150"
            >
              <PhoneIcon className="w-4 h-4" />
              Dial Queue ({stats.queue})
            </button>
          )}
          <button
            onClick={() => setShowUpload(true)}
            className="flex-1 min-w-[120px] inline-flex items-center justify-center gap-2 rounded-xl bg-white ring-1 ring-slate-200 px-3.5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-brand-600 hover:ring-brand-300 hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-150"
          >
            <UploadIcon className="w-4 h-4 text-slate-400" />
            Upload Leads
          </button>
          <button
            onClick={() => setLeadForm({ lead: null })}
            className="flex-1 min-w-[110px] inline-flex items-center justify-center gap-2 rounded-xl bg-white ring-1 ring-slate-200 px-3.5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-brand-600 hover:ring-brand-300 hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-150"
          >
            <PlusIcon className="w-4 h-4 text-slate-400" />
            Add Lead
          </button>
        </div>

        {/* Lead Tabs: All, Queue, Finished */}
        <div className="flex gap-2">
          {FILTERS.map((f) => {
            const count =
              f.id === 'all'
                ? stats.total
                : f.id === 'queue'
                  ? stats.queue
                  : stats.finished
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-150 active:scale-[0.97] ${
                  filter === f.id
                    ? 'bg-slate-900 text-white shadow-sm hover:bg-slate-800 hover:shadow-md'
                    : 'bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50 hover:text-slate-800 hover:ring-slate-300'
                }`}
              >
                {f.label}
                <span
                  className={`ml-1.5 text-xs ${
                    filter === f.id ? 'text-white/70' : 'text-slate-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Search Leads - Below Tabs */}
        <div className="space-y-2">
          <div className="relative">
            <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, company, website, or phone…"
              className="w-full rounded-xl border-0 bg-white pl-10 pr-9 py-2.5 text-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-brand-400 outline-none placeholder:text-slate-400 shadow-xs"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
                title="Clear search"
                aria-label="Clear search"
              >
                <XIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {search.trim() && (
            <div className="flex items-center justify-between px-1 text-xs text-slate-500">
              <span>
                Found <strong className="text-slate-800 font-semibold">{filteredLeads.length}</strong> {filteredLeads.length === 1 ? 'result' : 'results'} for &ldquo;{search.trim()}&rdquo;
              </span>
              {filteredLeads.length > 0 && (
                <button
                  type="button"
                  onClick={() => setDeleteBatchTarget({ leads: filteredLeads, query: search.trim() })}
                  className="inline-flex items-center gap-1 font-medium text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/80 px-2 py-1 rounded-lg transition-colors active:scale-95"
                  title={`Delete all ${filteredLeads.length} matching leads`}
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                  <span>Delete all ({filteredLeads.length})</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Lead List */}
        <div className="space-y-3">
          {leadsLoading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : filteredLeads.length === 0 ? (
            <EmptyState
              filter={filter}
              hasLeads={leads.length > 0}
              searchQuery={search}
              onClearSearch={() => setSearch('')}
              onUpload={() => setShowUpload(true)}
              onAdd={() => setLeadForm({ lead: null })}
            />
          ) : (
            filteredLeads.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                onCall={callLead}
                onLogResult={(l) => setResultLead(l)}
                onEdit={(l) => setLeadForm({ lead: l })}
                onReset={handleReset}
                onDelete={(l) => setDeleteLeadTarget(l)}
              />
            ))
          )}
        </div>
      </div>
    )
  }
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

function StatTile({
  label,
  value,
  accent = 'text-slate-900',
}: {
  label: string
  value: number
  accent?: string
}) {
  return (
    <div className="rounded-2xl bg-white shadow-xs ring-1 ring-slate-200/80 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 truncate">
        {label}
      </p>
      <p className={`text-xl font-bold ${accent}`}>{value}</p>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl bg-white shadow-xs ring-1 ring-slate-200/70 p-4 animate-pulse">
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
  searchQuery,
  onClearSearch,
  onUpload,
  onAdd,
}: {
  filter: LeadFilter
  hasLeads: boolean
  searchQuery?: string
  onClearSearch?: () => void
  onUpload: () => void
  onAdd: () => void
}) {
  if (!hasLeads) {
    return (
      <div className="rounded-3xl bg-white shadow-xs ring-1 ring-slate-200/70 px-6 py-12 text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-brand-50 ring-1 ring-brand-100 flex items-center justify-center">
          <UsersIcon className="w-7 h-7 text-brand-500" />
        </div>
        <h3 className="mt-4 text-base font-bold text-slate-900">No leads in this campaign yet</h3>
        <p className="mt-1.5 text-sm text-slate-500">
          Upload a CSV or add your first lead manually to start dialing.
        </p>
        <div className="mt-6 flex gap-2 justify-center">
          <button
            onClick={onUpload}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-600/30 hover:bg-brand-500 hover:shadow-md hover:shadow-brand-600/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-150"
          >
            <UploadIcon className="w-4 h-4" />
            Upload Leads
          </button>
          <button
            onClick={onAdd}
            className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-200 hover:text-slate-900 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-150"
          >
            Add manually
          </button>
        </div>
      </div>
    )
  }

  if (searchQuery && searchQuery.trim()) {
    return (
      <div className="rounded-3xl bg-white shadow-xs ring-1 ring-slate-200/70 px-6 py-12 text-center">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
          <SearchIcon className="w-6 h-6" />
        </div>
        <h3 className="mt-3 text-base font-bold text-slate-900">No results found</h3>
        <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
          No leads match <span className="font-semibold text-slate-700">"{searchQuery.trim()}"</span>.
        </p>
        {onClearSearch && (
          <button
            onClick={onClearSearch}
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-800 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            Clear search
          </button>
        )}
      </div>
    )
  }

  const msg: Record<LeadFilter, string> = {
    all: 'No leads found in this campaign.',
    queue: 'No new leads in the queue. Upload more leads or requeue finished leads.',
    finished: 'No calls finished yet. Work the queue to log call results.',
  }
  return (
    <div className="rounded-3xl bg-white shadow-xs ring-1 ring-slate-200/70 px-6 py-12 text-center">
      <p className="text-sm text-slate-500">{msg[filter]}</p>
    </div>
  )
}

function MenuSheet({
  email,
  activeCampaign,
  isOwner,
  onClose,
  onNewCampaign,
  onEditCampaign,
  onDeleteCampaign,
  onUpload,
  onShare,
  onLogout,
}: {
  email: string
  activeCampaign: { name: string } | null
  isOwner: boolean
  onClose: () => void
  onNewCampaign: () => void
  onEditCampaign: () => void
  onDeleteCampaign: () => void
  onUpload: () => void
  onShare: () => void
  onLogout: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <div className="relative w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl animate-sheet-up p-2">
        <p className="px-4 pt-3 pb-2 text-xs font-medium text-slate-400 truncate">{email}</p>

        <div className="border-y border-slate-100 py-1 my-1">
          <button
            onClick={onNewCampaign}
            className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-brand-50 hover:text-brand-700 hover:translate-x-1 transition-all duration-150"
          >
            <PlusIcon className="w-5 h-5 text-slate-400" />
            New Campaign
          </button>

          {activeCampaign && (
            <>
              <button
                onClick={onShare}
                className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-brand-50 hover:text-brand-700 hover:translate-x-1 transition-all duration-150"
              >
                <ShareIcon className="w-5 h-5 text-slate-400" />
                Share Active Campaign
              </button>
              {isOwner && (
                <button
                  onClick={onEditCampaign}
                  className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-brand-50 hover:text-brand-700 hover:translate-x-1 transition-all duration-150"
                >
                  <PencilIcon className="w-5 h-5 text-slate-400" />
                  Rename Campaign
                </button>
              )}
            </>
          )}
        </div>

        {activeCampaign && (
          <div className="py-1">
            <button
              onClick={onUpload}
              className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-brand-50 hover:text-brand-700 hover:translate-x-1 transition-all duration-150"
            >
              <UploadIcon className="w-5 h-5 text-slate-400" />
              Upload Leads to Campaign
            </button>
            {isOwner && (
              <button
                onClick={onDeleteCampaign}
                className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-rose-500 hover:bg-rose-50 hover:text-rose-600 hover:translate-x-1 transition-all duration-150"
              >
                <TrashIcon className="w-5 h-5" />
                Delete Active Campaign
              </button>
            )}
          </div>
        )}

        <div className="border-t border-slate-100 pt-1">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-rose-500 hover:bg-rose-50 hover:text-rose-600 hover:translate-x-1 transition-all duration-150"
          >
            <LogoutIcon className="w-5 h-5" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
