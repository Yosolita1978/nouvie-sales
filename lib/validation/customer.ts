import { z } from 'zod'

// ============================================
// CUSTOMER VALIDATION — single source of truth
// ============================================
// These schemas are the ONLY place customer validation rules live.
// They are shared by the client form (CustomerForm) and the API routes
// (POST /api/customers and PATCH /api/customers/[id]) so the rules can
// never drift between client and server.
//
// Business rules:
//   - name and phone are the ONLY required fields.
//   - cedula and email are optional; empty input is coerced to NULL (never "")
//     so a second cédula-less customer does not collide on the unique index.
//   - email/cedula formats are validated only when a value is actually present.

export const DOCUMENT_TYPES = ['cedula', 'nit', 'cedula_extranjeria'] as const
export type DocumentType = (typeof DOCUMENT_TYPES)[number]

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Trims a value and turns "" / whitespace-only / non-strings into null.
function emptyStringToNull(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

// A required text field: trims, and rejects empty with a friendly message.
function requiredTrimmed(label: string) {
  return z.preprocess(
    (value) => (typeof value === 'string' ? value.trim() : value),
    z.string({ error: `${label} es requerido` }).min(1, `${label} es requerido`)
  )
}

// CREATE: optional text → string | null (missing field becomes null).
const createOptionalString = z.preprocess(emptyStringToNull, z.string().nullable())

// UPDATE: optional text → string | null | undefined.
// undefined means "field not sent, leave as-is"; null means "clear it".
const updateOptionalString = z.preprocess(
  (value) => (value === undefined ? undefined : emptyStringToNull(value)),
  z.string().nullable().optional()
)

// UPDATE: a text field that, when sent, is trimmed but may be empty
// (emptiness is reported by superRefine with a field-specific message).
const updateTrimmedString = z.preprocess(
  (value) => (value === undefined ? undefined : typeof value === 'string' ? value.trim() : value),
  z.string().optional()
)

// Validates cedula/NIT digit format only when a value is present.
function validateCedulaFormat(value: string, documentType: DocumentType, ctx: z.RefinementCtx) {
  if (documentType === 'cedula' && !/^\d{6,10}$/.test(value)) {
    ctx.addIssue({ code: 'custom', path: ['cedula'], message: 'Cédula debe tener entre 6 y 10 dígitos' })
  } else if (documentType === 'nit' && !/^\d{9,10}$/.test(value)) {
    ctx.addIssue({ code: 'custom', path: ['cedula'], message: 'NIT debe tener entre 9 y 10 dígitos' })
  }
}

// ---- CREATE schema (used by the form and POST /api/customers) ----
export const customerCreateSchema = z
  .object({
    documentType: z.enum(DOCUMENT_TYPES).optional(),
    cedula: createOptionalString,
    name: requiredTrimmed('Nombre'),
    email: createOptionalString,
    phone: requiredTrimmed('Teléfono'),
    address: createOptionalString,
    city: createOptionalString,
  })
  .superRefine((data, ctx) => {
    if (data.email !== null && !EMAIL_REGEX.test(data.email)) {
      ctx.addIssue({ code: 'custom', path: ['email'], message: 'Email no es válido' })
    }
    if (data.cedula !== null) {
      validateCedulaFormat(data.cedula, data.documentType ?? 'cedula', ctx)
    }
  })

// ---- UPDATE schema (used by PATCH /api/customers/[id]) ----
export const customerUpdateSchema = z
  .object({
    documentType: z.enum(DOCUMENT_TYPES).optional(),
    cedula: updateOptionalString,
    name: updateTrimmedString,
    email: updateOptionalString,
    phone: updateTrimmedString,
    address: updateOptionalString,
    city: updateOptionalString,
  })
  .superRefine((data, ctx) => {
    if (data.name !== undefined && data.name.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['name'], message: 'Nombre es requerido' })
    }
    if (data.phone !== undefined && data.phone.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['phone'], message: 'Teléfono es requerido' })
    }
    if (data.email !== undefined && data.email !== null && !EMAIL_REGEX.test(data.email)) {
      ctx.addIssue({ code: 'custom', path: ['email'], message: 'Email no es válido' })
    }
    if (data.cedula !== undefined && data.cedula !== null) {
      validateCedulaFormat(data.cedula, data.documentType ?? 'cedula', ctx)
    }
  })

export type CustomerCreateInput = z.infer<typeof customerCreateSchema>
export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>

// Flat list of error messages (for the API `errors: string[]` response shape).
export function zodErrorMessages(error: z.ZodError): string[] {
  return error.issues.map((issue) => issue.message)
}

// First error per field (for inline form field highlighting).
export function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {}
  for (const issue of error.issues) {
    const field = issue.path[0]
    if (typeof field === 'string' && !fieldErrors[field]) {
      fieldErrors[field] = issue.message
    }
  }
  return fieldErrors
}
