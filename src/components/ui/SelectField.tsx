import { useEffect, useId, useMemo, useRef, useState, type ChangeEvent, type SelectHTMLAttributes } from 'react'

export type SelectOption = {
  value: string
  label: string
}

type SelectFieldProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> & {
  options: SelectOption[]
  emptyLabel?: string
  placeholder?: string
}

function normalizeSearch(value: string): string {
  return value.trim().toLocaleLowerCase('th-TH')
}

export function SelectField({
  className = '',
  disabled,
  emptyLabel = 'ไม่พบตัวเลือก',
  name,
  onChange,
  options,
  placeholder,
  value,
  ...props
}: SelectFieldProps) {
  const id = useId()
  const rootRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const ignoreBlurRef = useRef(false)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const stringValue = String(value ?? '')

  const selectedOption = options.find((option) => option.value === stringValue)
  const displayValue = selectedOption?.label ?? stringValue
  const search = open ? draft : displayValue
  const filteredOptions = useMemo(() => {
    const keyword = normalizeSearch(draft)
    if (!keyword) return options
    return options.filter((option) => (
      normalizeSearch(option.label).includes(keyword)
      || normalizeSearch(option.value).includes(keyword)
    ))
  }, [draft, options])
  const activeOptionIndex = filteredOptions.length ? Math.min(activeIndex, filteredOptions.length - 1) : 0

  useEffect(() => {
    function handlePointerDown(event: PointerEvent): void {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  function closePanel(): void {
    setOpen(false)
    setDraft('')
    setActiveIndex(0)
  }

  function selectOption(option: SelectOption): void {
    const event = {
      target: { value: option.value, name },
      currentTarget: { value: option.value, name },
    } as unknown as ChangeEvent<HTMLSelectElement>
    onChange?.(event)
    closePanel()
    inputRef.current?.blur()
  }

  return (
    <div ref={rootRef} className={`finance-combobox ${className}`}>
      <input
        ref={inputRef}
        aria-activedescendant={open && filteredOptions[activeOptionIndex] ? `${id}-${activeOptionIndex}` : undefined}
        aria-autocomplete="list"
        aria-controls={`${id}-panel`}
        aria-expanded={open}
        aria-label={props['aria-label'] || placeholder || 'ค้นหาและเลือก'}
        className="finance-combobox-trigger"
        disabled={disabled}
        placeholder={placeholder}
        role="combobox"
        value={search}
        onBlur={() => {
          if (ignoreBlurRef.current) return
          closePanel()
        }}
        onChange={(event) => {
          setDraft(event.target.value)
          setActiveIndex(0)
          setOpen(true)
        }}
        onFocus={() => {
          setDraft('')
          setActiveIndex(0)
          setOpen(true)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            closePanel()
            return
          }
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            setOpen(true)
            if (filteredOptions.length) setActiveIndex((current) => Math.min(filteredOptions.length - 1, current + 1))
            return
          }
          if (event.key === 'ArrowUp') {
            event.preventDefault()
            if (filteredOptions.length) setActiveIndex((current) => Math.max(0, current - 1))
            return
          }
          if (event.key === 'Enter') {
            event.preventDefault()
            if (open && filteredOptions[activeOptionIndex]) selectOption(filteredOptions[activeOptionIndex])
            else setOpen(true)
          }
        }}
      />
      <button
        aria-label="เปิดรายการตัวเลือก"
        className="absolute inset-y-1 right-1 grid w-10 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:pointer-events-none disabled:text-slate-300"
        disabled={disabled}
        type="button"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          setOpen((current) => !current)
          setDraft('')
          inputRef.current?.focus()
        }}
      >
        ▾
      </button>
      {open && !disabled && (
        <div id={`${id}-panel`} className="finance-combobox-panel" role="listbox">
          <div className="finance-combobox-search">{draft || placeholder || 'ค้นหา'}</div>
          <div className="grid gap-1 p-1">
            {filteredOptions.length ? filteredOptions.map((option, index) => (
              <button
                id={`${id}-${index}`}
                key={option.value}
                aria-selected={option.value === stringValue}
                className={`finance-combobox-option ${index === activeOptionIndex ? 'is-active' : ''} ${option.value === stringValue ? 'is-selected' : ''}`}
                role="option"
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault()
                  ignoreBlurRef.current = true
                }}
                onMouseUp={() => {
                  ignoreBlurRef.current = false
                }}
                onMouseLeave={() => {
                  ignoreBlurRef.current = false
                }}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectOption(option)}
              >
                {option.label}
              </button>
            )) : (
              <div className="px-3 py-3 text-sm font-bold leading-6 text-slate-400">{emptyLabel}</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
