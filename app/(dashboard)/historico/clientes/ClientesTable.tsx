'use client'

import { useState } from 'react'

interface Suggestion {
  id: string
  name: string
  cedula: string | null
  score: number
  /** Another sheet name already linked to this customer, if any. */
  linkedTo: string | null
}

interface Row {
  clientKey: string
  clientName: string
  saleCount: number
  total: string
  years: string
  cedula: string | null
  phone: string | null
  suggestions: Suggestion[]
}

interface CustomerOption {
  id: string
  label: string
  linkedTo: string | null
}

type State =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'done'; message: string }
  | { kind: 'error'; message: string }

export function ClientesTable({
  rows,
  customerOptions,
}: {
  rows: Row[]
  customerOptions: CustomerOption[]
}) {
  // What the user picked/typed in the free search box, per row.
  const [search, setSearch] = useState<Record<string, string>>({})
  const [state, setState] = useState<Record<string, State>>({})

  const byLabel = new Map(customerOptions.map((c) => [c.label, c]))

  async function send(
    row: Row,
    action: 'vincular' | 'crear' | 'omitir',
    customerId?: string
  ) {
    setState((s) => ({ ...s, [row.clientKey]: { kind: 'saving' } }))
    try {
      const res = await fetch('/api/historico/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientKey: row.clientKey,
          clientName: row.clientName,
          action,
          customerId,
        }),
      })
      const data: {
        error?: string
        customerName?: string
        created?: boolean
        alsoLinkedTo?: string | null
      } = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al guardar')

      const message =
        action === 'omitir'
          ? 'Omitido'
          : data.created
            ? `Creado: ${data.customerName ?? ''}`
            : `Vinculado a ${data.customerName ?? ''}` +
              (data.alsoLinkedTo ? ` (junto con “${data.alsoLinkedTo}”)` : '')
      setState((s) => ({ ...s, [row.clientKey]: { kind: 'done', message } }))
    } catch (e) {
      setState((s) => ({
        ...s,
        [row.clientKey]: { kind: 'error', message: e instanceof Error ? e.message : 'Error' },
      }))
    }
  }

  /** Link using whatever is typed in the search box. */
  function linkFromSearch(row: Row) {
    const picked = byLabel.get((search[row.clientKey] ?? '').trim())
    if (!picked) {
      setState((s) => ({
        ...s,
        [row.clientKey]: { kind: 'error', message: 'Elige un cliente de la lista' },
      }))
      return
    }
    send(row, 'vincular', picked.id)
  }

  if (rows.length === 0) {
    return <p className="text-sm text-gray-500">No queda ningún cliente por revisar. 🎉</p>
  }

  return (
    <div className="space-y-4">
      {/* Shared list for every search box: typing filters it. */}
      <datalist id="customer-options">
        {customerOptions.map((c) => (
          <option key={c.id} value={c.label} />
        ))}
      </datalist>

      {rows.map((row) => {
        const st = state[row.clientKey] ?? { kind: 'idle' }
        const busy = st.kind === 'saving'
        const settled = st.kind === 'done'

        return (
          <div
            key={row.clientKey}
            className={`border rounded-lg p-4 ${
              settled ? 'border-green-200 bg-green-50' : 'border-gray-200'
            }`}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <p className="font-semibold text-gray-900">{row.clientName}</p>
                <p className="text-sm text-gray-500">
                  {row.saleCount} {row.saleCount === 1 ? 'venta' : 'ventas'} · {row.total} ·{' '}
                  años {row.years}
                  {row.cedula && <> · cédula {row.cedula}</>}
                  {row.phone && <> · tel {row.phone}</>}
                </p>
              </div>
              {settled && (
                <span className="text-sm font-medium text-green-700">✓ {st.message}</span>
              )}
            </div>

            {!settled && (
              <>
                {row.suggestions.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 mb-1">¿Es alguno de estos?</p>
                    <div className="flex flex-wrap gap-2">
                      {row.suggestions.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => send(row, 'vincular', s.id)}
                          disabled={busy}
                          className="text-sm px-3 py-1 rounded border border-nouvie-blue text-nouvie-blue disabled:opacity-50 hover:bg-blue-50"
                        >
                          {s.name}
                          {s.cedula ? ` · ${s.cedula}` : ''}{' '}
                          <span className="text-gray-400">{s.score}%</span>
                          {s.linkedTo && (
                            <span className="text-amber-600"> · ya es “{s.linkedTo}”</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <input
                    list="customer-options"
                    value={search[row.clientKey] ?? ''}
                    onChange={(e) => {
                      const v = e.target.value
                      setSearch((s) => ({ ...s, [row.clientKey]: v }))
                      setState((s) => ({ ...s, [row.clientKey]: { kind: 'idle' } }))
                    }}
                    placeholder="Buscar otro cliente…"
                    className="flex-1 min-w-[220px] border border-gray-300 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-nouvie-blue"
                  />
                  <button
                    onClick={() => linkFromSearch(row)}
                    disabled={busy}
                    className="text-sm px-3 py-1 rounded bg-nouvie-blue text-white disabled:opacity-50 hover:opacity-90"
                  >
                    {busy ? 'Guardando…' : 'Vincular'}
                  </button>
                  <button
                    onClick={() => send(row, 'crear')}
                    disabled={busy}
                    className="text-sm px-3 py-1 rounded border border-gray-300 text-gray-700 disabled:opacity-50 hover:bg-gray-50"
                    title="Crear un cliente nuevo con los datos de la hoja"
                  >
                    Crear cliente
                  </button>
                  <button
                    onClick={() => send(row, 'omitir')}
                    disabled={busy}
                    className="text-sm px-3 py-1 rounded text-gray-500 disabled:opacity-50 hover:bg-gray-50"
                    title="No es un cliente real; no contarlo"
                  >
                    Omitir
                  </button>
                </div>

                {st.kind === 'error' && (
                  <p className="mt-2 text-sm text-red-600">{st.message}</p>
                )}
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
