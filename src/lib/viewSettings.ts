import type { ViewId } from '../types/finance'

export const SUPPORTED_VIEW_IDS: readonly ViewId[] = ['monthly', 'yearly', 'installments', 'trips', 'more']

export function isViewId(value: unknown): value is ViewId {
  return typeof value === 'string' && (SUPPORTED_VIEW_IDS as readonly string[]).includes(value)
}

/** URL navigation wins over the persisted preference; invalid values use monthly. */
export function resolveInitialView(urlView: string | null | undefined, configuredView: unknown): ViewId {
  if (isViewId(urlView)) return urlView
  return isViewId(configuredView) ? configuredView : 'monthly'
}
