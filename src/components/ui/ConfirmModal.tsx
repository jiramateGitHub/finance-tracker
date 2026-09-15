import { useEffect, useRef } from 'react'
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
  const panelRef = useRef<HTMLElement | null>(null)
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    previouslyFocusedElementRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const frameId = window.requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLElement>('[data-confirm-primary]')?.focus()
    })

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') onClose()
      if (event.key !== 'Tab') return

      const focusableElements = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ) ?? [])
      const firstElement = focusableElements[0]
      const lastElement = focusableElements.at(-1)
      if (!firstElement || !lastElement) return

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.cancelAnimationFrame(frameId)
      window.removeEventListener('keydown', handleKeyDown)
      previouslyFocusedElementRef.current?.focus()
    }
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
        ref={panelRef}
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
            data-confirm-primary
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
