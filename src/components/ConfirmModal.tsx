import { TrashIcon, XIcon } from './Icons'

interface ConfirmModalProps {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  isDestructive?: boolean
  busy?: boolean
  onConfirm: () => void | Promise<void>
  onClose: () => void
}

export default function ConfirmModal({
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  isDestructive = true,
  busy = false,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px] animate-fade-in"
        onClick={onClose}
      />
      <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl animate-sheet-up p-5 flex flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            {isDestructive && (
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <TrashIcon className="w-5 h-5" />
              </div>
            )}
            <div>
              <h3 className="text-base font-bold text-slate-900">{title}</h3>
              <p className="mt-1 text-sm text-slate-500 leading-relaxed">{message}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 -mr-2 -mt-1 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 active:scale-95 transition-all duration-150 shrink-0"
            aria-label="Close"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-6 flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex-1 rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200 hover:text-slate-900 active:scale-[0.98] transition-all duration-150"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-150 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed ${
              isDestructive
                ? 'bg-rose-600 hover:bg-rose-500 hover:shadow-md hover:shadow-rose-600/30 hover:-translate-y-0.5'
                : 'bg-brand-600 hover:bg-brand-500 hover:shadow-md hover:shadow-brand-600/30 hover:-translate-y-0.5'
            }`}
          >
            {busy ? 'Processing…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
