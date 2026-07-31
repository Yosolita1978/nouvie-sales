/**
 * Matching the clients of the old sales sheet to real customers.
 *
 * The sheet stores informal names ("jaime perilla"); the live DB stores legal
 * ones ("JAIME ALBERTO PERILLA GOMEZ"). Cédula / email / phone are exact and
 * safe to auto-confirm. Name similarity is only ever a SUGGESTION, because a
 * wrong merge would credit a purchase to someone who never made it.
 *
 * Shared by the match script and the review page so both agree.
 */

export function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function onlyDigits(s: string | null | undefined): string {
  return (s ?? '').replace(/\D/g, '')
}

/** Last 10 digits, so +57 / 57 / local forms of the same number compare equal. */
export function phoneKey(s: string | null | undefined): string {
  const d = onlyDigits(s)
  return d.length >= 7 ? d.slice(-10) : ''
}

export function emailKey(s: string | null | undefined): string {
  return (s ?? '').toLowerCase().trim()
}

/** Words worth comparing: drops connectors and initials. */
const STOPWORDS = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'san', 'da'])

export function nameTokens(name: string): string[] {
  return normalizeName(name)
    .split(' ')
    .filter((w) => w.length > 2 && !STOPWORDS.has(w))
}

/**
 * How strongly two names look like the same person, 0..1.
 *
 * Colombian names are "nombre(s) + apellido paterno + apellido materno" and the
 * sheet usually keeps one given name + one surname. So we score by how many of
 * the SHORTER name's words appear in the longer one — "jaime perilla" inside
 * "jaime alberto perilla gomez" scores 1.
 */
export function nameSimilarity(a: string, b: string): number {
  const ta = nameTokens(a)
  const tb = nameTokens(b)
  if (ta.length === 0 || tb.length === 0) return 0

  const [shorter, longer] = ta.length <= tb.length ? [ta, tb] : [tb, ta]
  const hits = shorter.filter((w) => longer.includes(w)).length
  const score = hits / shorter.length

  // One word in common is never enough ("maria", "lopez" are everywhere).
  if (hits < 2) return score * 0.4
  return score
}

export interface CustomerLike {
  id: string
  name: string
  cedula: string | null
  email: string | null
  phone: string
}

export interface HistoricClientLike {
  clientName: string
  cedula: string | null
  email: string | null
  phone: string | null
}

export type MatchMethod = 'cedula' | 'email' | 'telefono' | 'nombre'

export interface MatchResult {
  customer: CustomerLike
  method: MatchMethod
  /** Exact methods are safe to apply automatically; name matches are not. */
  automatic: boolean
  score: number
}

/** Lookup tables built once for all historic clients. */
export class CustomerIndex {
  private byCedula = new Map<string, CustomerLike>()
  private byEmail = new Map<string, CustomerLike>()
  private byPhone = new Map<string, CustomerLike>()

  constructor(private customers: CustomerLike[]) {
    for (const c of customers) {
      const ced = onlyDigits(c.cedula)
      if (ced.length >= 5 && !this.byCedula.has(ced)) this.byCedula.set(ced, c)
      const em = emailKey(c.email)
      if (em.includes('@') && !this.byEmail.has(em)) this.byEmail.set(em, c)
      const ph = phoneKey(c.phone)
      if (ph !== '' && !this.byPhone.has(ph)) this.byPhone.set(ph, c)
    }
  }

  /** The best exact match, or null. */
  findExact(sales: HistoricClientLike[]): MatchResult | null {
    for (const s of sales) {
      const ced = onlyDigits(s.cedula)
      const hit = ced.length >= 5 ? this.byCedula.get(ced) : undefined
      if (hit) return { customer: hit, method: 'cedula', automatic: true, score: 1 }
    }
    for (const s of sales) {
      const hit = this.byEmail.get(emailKey(s.email))
      if (hit) return { customer: hit, method: 'email', automatic: true, score: 1 }
    }
    for (const s of sales) {
      const ph = phoneKey(s.phone)
      const hit = ph === '' ? undefined : this.byPhone.get(ph)
      if (hit) return { customer: hit, method: 'telefono', automatic: true, score: 1 }
    }
    return null
  }

  /** Name suggestions, best first. Never automatic. */
  suggestByName(clientName: string, limit = 3): MatchResult[] {
    return this.customers
      .map((c) => ({
        customer: c,
        method: 'nombre' as const,
        automatic: false,
        score: nameSimilarity(clientName, c.name),
      }))
      .filter((m) => m.score >= 0.5)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  }
}

/**
 * An exact name equality still counts as automatic — same spelling, same person.
 * Anything less is a suggestion.
 */
export function isExactName(a: string, b: string): boolean {
  return normalizeName(a) === normalizeName(b)
}
