import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '../../../components/ui/Button'
import { ComboboxField } from '../../../components/ui/ComboboxField'
import { FormField } from '../../../components/ui/FormField'
import { MonthInput } from '../../../components/ui/MonthInput'
import { SelectField } from '../../../components/ui/SelectField'
import { TextareaField } from '../../../components/ui/TextareaField'
import { TextInput } from '../../../components/ui/TextInput'
import { th } from '../../../i18n/th'
import type { InstallmentPlan } from '../../../types/finance'
import { formatMoney, formatMonth, parseAmountSafe } from '../../../utils/formatters'
import {
  addMonths,
  buildInstallmentPlanFromForm,
  createInstallmentFormValues,
  type InstallmentFormValues,
  validateInstallmentForm,
} from '../utils/installmentPlans'

type InstallmentPlanModalProps = {
  open: boolean
  plan?: InstallmentPlan | null
  categoryOptions: string[]
  onClose: () => void
  onSubmit: (plan: InstallmentPlan) => void
}

const TERM_PRESETS = [3, 6, 10, 12, 24, 36, 48, 60]

const QUICK_NAME_SUGGESTIONS = [
  { name: 'iPhone 16 Pro', category: 'ผ่อนสินค้า', months: '10' },
  { name: 'ผ่อนรถยนต์', category: 'รถยนต์', months: '48' },
  { name: 'ผ่อนคอนโด / บ้าน', category: 'บ้าน/เช่า', months: '360' },
  { name: 'ตู้เย็น / แอร์', category: 'ผ่อนสินค้า', months: '10' },
  { name: 'สินเชื่อ / บัตรเครดิต', category: 'บัตรเครดิต', months: '12' },
]

export function InstallmentPlanModal({ open, plan, categoryOptions, onClose, onSubmit }: InstallmentPlanModalProps) {
  const [values, setValues] = useState<InstallmentFormValues>(() => createInstallmentFormValues(plan ?? undefined))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  function updateField<K extends keyof InstallmentFormValues>(field: K, value: InstallmentFormValues[K]): void {
    setValues((current) => ({ ...current, [field]: value }))
  }

  function handleAutoCalculateMonthly(monthsOverride?: number): void {
    const total = parseAmountSafe(values.totalAmount) || parseAmountSafe(values.principal)
    const months = monthsOverride ?? parseInt(values.monthsTotal, 10)
    if (total > 0 && months > 0) {
      const calculated = Math.round((total / months) * 100) / 100
      updateField('monthlyAmount', String(calculated))
    }
  }

  function handleTermPresetClick(term: number): void {
    updateField('monthsTotal', String(term))
    const total = parseAmountSafe(values.totalAmount) || parseAmountSafe(values.principal)
    if (total > 0) {
      const calculated = Math.round((total / term) * 100) / 100
      updateField('monthlyAmount', String(calculated))
    }
  }

  function handleQuickNameSuggestion(item: typeof QUICK_NAME_SUGGESTIONS[0]): void {
    setValues((prev) => {
      const updated = {
        ...prev,
        name: item.name,
        category: prev.category || item.category,
        monthsTotal: item.months,
      }
      const total = parseAmountSafe(updated.totalAmount) || parseAmountSafe(updated.principal)
      const months = parseInt(item.months, 10)
      if (total > 0 && months > 0) {
        updated.monthlyAmount = String(Math.round((total / months) * 100) / 100)
      }
      return updated
    })
  }

  function savePlan(): void {
    const validationError = validateInstallmentForm(values)
    if (validationError) {
      setError(validationError)
      return
    }
    onSubmit(buildInstallmentPlanFromForm(values, plan ?? undefined))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    savePlan()
  }

  // Live calculation preview (reference from installment_tracker.html line 649)
  const totalNum = parseAmountSafe(values.totalAmount) || parseAmountSafe(values.principal)
  const monthlyNum = parseAmountSafe(values.monthlyAmount)
  const totalMonthsNum = parseInt(values.monthsTotal, 10) || 0
  const paidMonthsNum = parseInt(values.paidMonths, 10) || 0
  const remainingMonthsNum = Math.max(0, totalMonthsNum - paidMonthsNum)
  const endMonthKey = values.startMonth && totalMonthsNum > 0 ? addMonths(values.startMonth, totalMonthsNum - 1) : null
  const remainingCalculated = monthlyNum > 0 && remainingMonthsNum > 0 ? remainingMonthsNum * monthlyNum : Math.max(0, totalNum - (paidMonthsNum * monthlyNum))

  return (
    <div className="finance-modal-backdrop">
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <form className="finance-modal-panel relative z-10 max-w-2xl" onSubmit={handleSubmit}>
        <div className="mx-auto -mt-1 mb-1 h-1 w-10 rounded-full bg-slate-200 sm:hidden" aria-hidden="true" />

        {/* Modal Header */}
        <header className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="14" x="2" y="5" rx="2" />
                <line x1="2" x2="22" y1="10" y2="10" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-slate-900 leading-tight">
                {plan ? 'แก้ไขแผนผ่อน' : 'เพิ่มแผนผ่อนใหม่'}
              </h2>
              <p className="text-xs text-slate-500">
                กรอกข้อมูลระบบจะช่วยคำนวณค่างวดและวันปลดหนี้ให้อัตโนมัติ
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={th.common.close}
            className="grid size-8.5 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition active:scale-95"
          >
            <svg className="size-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        {error && <div className="finance-error">{error}</div>}

        <div className="finance-modal-body space-y-4">
          <div className="finance-form-grid">
            {/* Section 1: Basic Info */}
            <FormField label="ชื่อแผนผ่อน" fullWidth>
              <TextInput
                value={values.name}
                placeholder="เช่น iPhone 16 Pro, ผ่อนรถยนต์, ผ่อนคอนโด"
                onChange={(event) => updateField('name', event.target.value)}
              />
              <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-slate-400">ตัวเลือกด่วน:</span>
                {QUICK_NAME_SUGGESTIONS.map((item) => (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => handleQuickNameSuggestion(item)}
                    className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-600 text-[11px] font-medium transition cursor-pointer"
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </FormField>

            <FormField label="หมวดหมู่">
              <ComboboxField
                value={values.category}
                options={categoryOptions}
                placeholder="ผ่อนสินค้า"
                onChange={(category) => updateField('category', category)}
              />
            </FormField>

            <FormField label="เดือนเริ่ม">
              <MonthInput
                value={values.startMonth}
                onChange={(event) => updateField('startMonth', event.target.value)}
              />
            </FormField>

            {/* Section 2: Amounts & Terms */}
            <FormField label="ยอดรวมทั้งสิ้น (บาท)">
              <TextInput
                inputMode="decimal"
                value={values.totalAmount}
                placeholder="เช่น 21600"
                onChange={(event) => updateField('totalAmount', event.target.value)}
              />
            </FormField>

            <FormField label="เงินต้น (ถ้ามี)">
              <TextInput
                inputMode="decimal"
                value={values.principal}
                placeholder="เงินต้นเริ่มต้น ถ้ามี"
                onChange={(event) => updateField('principal', event.target.value)}
              />
            </FormField>

            {/* Terms with Quick Term Presets */}
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold text-slate-700">
                  จำนวนงวดทั้งหมด (เดือน)
                </label>
                <span className="text-[11px] text-slate-400">เลือกโปรโมชั่นด่วน</span>
              </div>

              {/* Quick Presets Buttons (from installment_tracker.html line 575) */}
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 mb-2">
                {TERM_PRESETS.map((term) => {
                  const isActive = String(term) === values.monthsTotal.trim()
                  return (
                    <button
                      key={term}
                      type="button"
                      onClick={() => handleTermPresetClick(term)}
                      className={`py-1 px-1 rounded-lg text-xs font-semibold text-center transition border ${
                        isActive
                          ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-xs'
                          : 'border-slate-200 text-slate-600 hover:bg-blue-50 hover:border-blue-200'
                      }`}
                    >
                      {term} ด.
                    </button>
                  )
                })}
              </div>

              <TextInput
                inputMode="numeric"
                value={values.monthsTotal}
                placeholder="ระบุจำนวนงวด (เดือน)"
                onChange={(event) => updateField('monthsTotal', event.target.value)}
              />
            </div>

            {/* Monthly Payment with Auto-Calculate */}
            <FormField
              label={
                <span className="flex items-center justify-between">
                  <span>ค่างวดต่อเดือน (บาท)</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleAutoCalculateMonthly()
                    }}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <span>✨</span>
                    <span>คำนวณอัตโนมัติ</span>
                  </button>
                </span>
              }
            >
              <TextInput
                inputMode="decimal"
                value={values.monthlyAmount}
                placeholder="1800"
                onChange={(event) => updateField('monthlyAmount', event.target.value)}
              />
            </FormField>

            <FormField label="ยอดคงเหลือกำหนดเอง">
              <TextInput
                inputMode="decimal"
                value={values.remainingOverride}
                placeholder="ยอดคงเหลือปัจจุบัน ถ้ามี"
                onChange={(event) => updateField('remainingOverride', event.target.value)}
              />
            </FormField>

            {/* Due Day & Paid Months */}
            <FormField label="วันที่ครบกำหนด (1-31)">
              <TextInput
                inputMode="numeric"
                value={values.dueDay}
                placeholder="เช่น วันที่ 25"
                onChange={(event) => updateField('dueDay', event.target.value)}
              />
            </FormField>

            <FormField label="จำนวนเดือนที่จ่ายแล้ว">
              <TextInput
                inputMode="numeric"
                value={values.paidMonths}
                placeholder="0"
                onChange={(event) => updateField('paidMonths', event.target.value)}
              />
            </FormField>

            {/* Section 3: Interest info */}
            <FormField label="ประเภทดอกเบี้ย">
              <SelectField
                value={values.interestType}
                options={[
                  { value: 'none', label: 'ไม่มี' },
                  { value: 'reducing', label: 'ลดต้นลดดอก' },
                  { value: 'flat', label: 'คงที่' },
                ]}
                onChange={(event) => updateField('interestType', event.target.value as InstallmentFormValues['interestType'])}
              />
            </FormField>

            <FormField label="อัตราดอกเบี้ย (% ต่อปี)">
              <TextInput
                inputMode="decimal"
                value={values.interestRate}
                placeholder="เช่น 12"
                onChange={(event) => updateField('interestRate', event.target.value)}
              />
            </FormField>

            <FormField label="หมายเหตุดอกเบี้ย" fullWidth>
              <TextInput
                value={values.interestNote}
                placeholder="เช่น โปร 0% 10 เดือน, ดอกเบี้ยตามสัญญา"
                onChange={(event) => updateField('interestNote', event.target.value)}
              />
            </FormField>

            <FormField label="หมายเหตุเพิ่มเติม" fullWidth>
              <TextareaField
                value={values.note}
                placeholder="เช่น ผ่อนกับบัตร KBank, รับเครดิตเงินคืน 500 บาท"
                onChange={(event) => updateField('note', event.target.value)}
              />
            </FormField>
          </div>

          {/* Smart Calculation Preview Box (From installment_tracker.html line 649) */}
          <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-3.5 space-y-1">
            <div className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
              <span>✨</span>
              <span>สรุปภาพรวมแผนการผ่อน</span>
            </div>
            <div className="text-xs text-slate-700 leading-relaxed">
              {monthlyNum > 0 && totalMonthsNum > 0 ? (
                <>
                  ค่างวด <strong>{formatMoney(monthlyNum)}/เดือน</strong> · ผ่อนแล้ว <strong>{paidMonthsNum}/{totalMonthsNum} งวด</strong> (เหลือ {remainingMonthsNum} งวด)
                  {endMonthKey && (
                    <> · ปลดหนี้ประมาณ <strong>{formatMonth(endMonthKey)}</strong></>
                  )}
                  {remainingCalculated > 0 && (
                    <> · ยอดคงเหลือประมาณ <strong>{formatMoney(remainingCalculated)}</strong></>
                  )}
                </>
              ) : (
                <span>กรอกยอดรวมและจำนวนงวดเพื่อดูสรุปค่างวด วันหมดภาระ และยอดคงเหลืออัตโนมัติ</span>
              )}
            </div>
          </div>
        </div>

        <footer className="finance-modal-footer">
          <Button type="button" onClick={onClose}>
            {th.common.cancel}
          </Button>
          <Button type="submit" variant="primary">
            {plan ? th.common.saveChanges : 'บันทึกแผนผ่อน'}
          </Button>
        </footer>
      </form>
    </div>
  )
}
