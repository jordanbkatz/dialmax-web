import { useState } from 'react'
import type { Campaign } from '../types'
import { ShareIcon, TrashIcon, UserPlusIcon, XIcon } from './Icons'
import ConfirmModal from './ConfirmModal'

interface ShareCampaignModalProps {
  campaign: Campaign
  currentUserUid: string
  onClose: () => void
  onShare: (email: string) => Promise<void>
  onRemoveCollaborator: (email: string) => Promise<void>
}

export default function ShareCampaignModal({
  campaign,
  currentUserUid,
  onClose,
  onShare,
  onRemoveCollaborator,
}: ShareCampaignModalProps) {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [removeTargetEmail, setRemoveTargetEmail] = useState<string | null>(null)

  const isOwner = campaign.ownerUid === currentUserUid

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) return
    if (trimmed === campaign.ownerEmail.toLowerCase()) {
      setError('This user is already the owner of the campaign.')
      return
    }
    if (campaign.sharedWithEmails.includes(trimmed)) {
      setError('This user already has access to this campaign.')
      return
    }

    setBusy(true)
    setError(null)
    try {
      await onShare(trimmed)
      setEmail('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not share campaign')
    } finally {
      setBusy(false)
    }
  }

  const handleConfirmRemove = async () => {
    if (!removeTargetEmail) return
    setBusy(true)
    setError(null)
    try {
      await onRemoveCollaborator(removeTargetEmail)
      setRemoveTargetEmail(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove user')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl animate-sheet-up max-h-[92dvh] flex flex-col">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
              <ShareIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Share Campaign</h2>
              <p className="text-xs text-slate-400 truncate max-w-[220px]">{campaign.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 -mr-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 active:scale-95 transition-all duration-150"
            aria-label="Close"
          >
            <XIcon />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 space-y-5">
          {/* Add email form */}
          <form onSubmit={handleShare} className="space-y-2">
            <label className="text-xs font-semibold text-slate-600">Invite by email</label>
            <div className="flex gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@company.com"
                className="flex-1 rounded-xl border-0 bg-slate-50 px-3.5 py-2.5 text-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-brand-400 outline-none placeholder:text-slate-400"
              />
              <button
                type="submit"
                disabled={!email.trim() || busy}
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-600/30 hover:bg-brand-500 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:opacity-40 disabled:hover:bg-brand-600 disabled:hover:translate-y-0 disabled:cursor-not-allowed transition-all duration-150"
              >
                <UserPlusIcon className="w-4 h-4" />
                Invite
              </button>
            </div>
            {error && <p className="text-xs text-rose-500 mt-1">{error}</p>}
          </form>

          {/* Members list */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">
              People with access
            </p>
            <div className="rounded-2xl ring-1 ring-slate-200 divide-y divide-slate-100 overflow-hidden bg-white">
              {/* Owner */}
              <div className="flex items-center justify-between px-3.5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800 truncate">{campaign.ownerEmail || 'Owner'}</p>
                  <p className="text-xs text-slate-400">Owner</p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                  Owner
                </span>
              </div>

              {/* Shared members */}
              {campaign.sharedWithEmails.map((memberEmail) => (
                <div key={memberEmail} className="flex items-center justify-between px-3.5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate">{memberEmail}</p>
                    <p className="text-xs text-slate-400">Can view &amp; log calls</p>
                  </div>
                  {isOwner && (
                    <button
                      onClick={() => setRemoveTargetEmail(memberEmail)}
                      disabled={busy}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 active:scale-95 transition-all duration-150"
                      aria-label={`Remove access for ${memberEmail}`}
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}

              {campaign.sharedWithEmails.length === 0 && (
                <div className="px-3.5 py-3 text-xs text-slate-400 text-center">
                  No other members invited yet.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-5 pb-5 pt-2 border-t border-slate-100">
          <button
            onClick={onClose}
            className="w-full rounded-2xl bg-slate-900 px-4 py-3.5 text-sm font-semibold text-white hover:bg-slate-800 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-150"
          >
            Done
          </button>
        </div>
      </div>

      {removeTargetEmail && (
        <ConfirmModal
          title="Remove Collaborator?"
          message={`Are you sure you want to remove access for ${removeTargetEmail}? They will no longer be able to view or edit this campaign.`}
          confirmLabel="Remove Access"
          busy={busy}
          onConfirm={handleConfirmRemove}
          onClose={() => setRemoveTargetEmail(null)}
        />
      )}
    </div>
  )
}
