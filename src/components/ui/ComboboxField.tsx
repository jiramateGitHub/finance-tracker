import { useEffect, useId, useMemo, useRef, useState } from 'react'

type ComboboxFieldProps = {
  value: string
  options: string[]
  onChange: (value: string) => void
  ariaLabel?: string
  placeholder?: string
  emptyLabel?: string
  className?: string
}

function normalizeSearch(value: string): string {
  return value.trim().toLocaleLowerCase('th-TH')
}

export function ComboboxField({
  value,
  options,
  onChange,
  ariaLabel,
  placeholder = '',
  emptyLabel = 'ไม่พบตัวเลือก',
  className = '',
}: ComboboxFieldProps) {
  const id = useId()
  const rootRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const search = open ? draft : value

  const uniqueOptions = useMemo(
    () => Array.from(new Set(options.filter(Boolean))).sort((a, b) => a.localeCompare(b, 'th-TH')),
    [options],
  )
  const filteredOptions = useMemo(() => {
    const keyword = normalizeSearch(search)
    if (!keyword) return uniqueOptions
    return uniqueOptions.filter((option) => normalizeSearch(option).includes(keyword))
  }, [search, uniqueOptions])
  const activeOptionIndex = filteredOptions.length ? Math.min(activeIndex, filteredOptions.length - 1) : 0

  useEffect(() => {
    function handlePointerDown(event: PointerEvent): void {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  function selectOption(nextValue: string): void {
    onChange(nextValue)
    setDraft(nextValue)
    setActiveIndex(0)
    setOpen(false)
  }

  function commitFreeText(): void {
    onChange(search)
    setOpen(false)
  }

  return (
    <div ref={rootRef} className={`finance-combobox ${className}`}>
      <input
        ref={inputRef}
        aria-activedescendant={open && filteredOptions[activeOptionIndex] ? `${id}-${activeOptionIndex}` : undefined}
        aria-autocomplete="list"
        aria-controls={`${id}-panel`}
        aria-expanded={open}
        aria-label={ariaLabel || placeholder || 'ค้นหาและเลือก'}
        className="finance-combobox-trigger"
        placeholder={placeholder}
        role="combobox"
        value={search}
        onBlur={() => onChange(search)}
        onChange={(event) => {
          setDraft(event.target.value)
          setActiveIndex(0)
          setOpen(true)
        }}
        onFocus={() => {
          setDraft(value)
          setActiveIndex(0)
          setOpen(true)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setOpen(false)
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
            setActiveIndex((current) => Math.max(0, current - 1))
            return
          }
          if (event.key === 'Enter') {
            event.preventDefault()
            if (open && filteredOptions[activeOptionIndex]) selectOption(filteredOptions[activeOptionIndex])
            else commitFreeText()
          }
        }}
      />
      <button
        aria-label="เปิดรายการตัวเลือก"
        className="absolute inset-y-1 right-1 grid w-10 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
        type="button"
        onClick={() => {
          setOpen((current) => !current)
          inputRef.current?.focus()
        }}
      >
        ▾
      </button>
      {open && (
        <div id={`${id}-panel`} className="finance-combobox-panel" role="listbox">
          <div className="finance-combobox-search">{search || placeholder || 'ค้นหา'}</div>
          <div className="grid gap-1 p-1">
            {filteredOptions.length ? filteredOptions.map((option, index) => (
              <button
                id={`${id}-${index}`}
                key={option}
                className={`finance-combobox-option ${index === activeIndex ? 'is-active' : ''} ${option === value ? 'is-selected' : ''}`}
                type="button"
                role="option"
                aria-selected={option === value}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectOption(option)}
              >
                {option}
              </button>
            )) : (
              <div className="px-3 py-3 text-sm font-bold text-slate-400">{emptyLabel}</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
