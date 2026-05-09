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
  if (!open) return null

  return (
    <div className="finance-modal-backdrop z-[90]">
      <section className="finance-modal-panel max-w-md">
        <h2 className="text-lg font-extrabold text-finance-text">{title}</h2>
        {description ? <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p> : null}
        <div className="finance-modal-footer mt-1">
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
