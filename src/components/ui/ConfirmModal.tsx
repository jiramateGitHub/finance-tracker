import { useEffect } from 'react'
import { th } from '../../i18n/th'
import { Button } from './Button'

type ConfirmModalProps = {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = th.common.confirm,
  cancelLabel = th.common.cancel,
  destructive = false,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  useEffect(() => {
    if (!open) return
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="finance-modal-backdrop z-[90]">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <section
        className="finance-confirm-panel relative z-10 w-[calc(100vw-2rem)] max-w-md rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-5 shadow-2xl transition-all"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
      >
        <h2 id="confirm-modal-title" className="text-lg font-bold text-slate-900">{title}</h2>
        {description ? <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p> : null}
        <div className="mt-5 flex flex-wrap justify-end gap-2.5 pt-2">
          <Button type="button" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={destructive ? 'danger' : 'primary'}
            onClick={() => {
              onConfirm()
              onClose()
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </section>
    </div>
  )
}
