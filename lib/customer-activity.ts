/**
 * A customer's buying activity across BOTH sources:
 *   - orders          the live platform (2026 onwards)
 *   - historic sales  the old sheet (2024-2026), linked via historic_client_matches
 *
 * The whole point of the historic import was this: answering "who has not bought
 * in the last 6 months" from the sheet alone is wrong, because a client who
 * bought in 2024 AND ordered last week would look dormant. Última compra must be
 * the LATER of the two.
 */

export const DORMANT_MONTHS = 6

export interface ActivitySale {
  source: 'historico' | 'plataforma'
  date: Date
  amount: number
  /** orderNumber for live orders; the sheet line for historic ones. */
  reference: string
}

export interface CustomerActivity {
  /** Most recent purchase from either source, or null if none. */
  lastPurchase: Date | null
  lastPurchaseSource: 'historico' | 'plataforma' | null
  firstPurchase: Date | null
  totalSpent: number
  purchaseCount: number
  /** Years the client bought in, ascending — "2024, 2025" reads at a glance. */
  years: number[]
  historicCount: number
  platformCount: number
}

/** Months between a date and `now`, rounded down. */
export function monthsSince(date: Date, now: Date): number {
  const months =
    (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth())
  return now.getDate() < date.getDate() ? months - 1 : months
}

export function summarize(sales: ActivitySale[]): CustomerActivity {
  if (sales.length === 0) {
    return {
      lastPurchase: null,
      lastPurchaseSource: null,
      firstPurchase: null,
      totalSpent: 0,
      purchaseCount: 0,
      years: [],
      historicCount: 0,
      platformCount: 0,
    }
  }

  const sorted = [...sales].sort((a, b) => a.date.getTime() - b.date.getTime())
  const last = sorted[sorted.length - 1]

  return {
    lastPurchase: last.date,
    lastPurchaseSource: last.source,
    firstPurchase: sorted[0].date,
    totalSpent: sales.reduce((n, s) => n + s.amount, 0),
    purchaseCount: sales.length,
    years: [...new Set(sales.map((s) => s.date.getFullYear()))].sort((a, b) => a - b),
    historicCount: sales.filter((s) => s.source === 'historico').length,
    platformCount: sales.filter((s) => s.source === 'plataforma').length,
  }
}

/** True when the client has not bought in DORMANT_MONTHS or has never bought. */
export function isDormant(activity: CustomerActivity, now: Date): boolean {
  if (activity.lastPurchase === null) return true
  return monthsSince(activity.lastPurchase, now) >= DORMANT_MONTHS
}
