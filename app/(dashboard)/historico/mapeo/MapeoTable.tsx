'use client'

import { useState } from 'react'

interface Row {
  unmappedName: string
  /** The CSV line this decision applies to. */
  rowNumber: number
  count: number
  quantity: number
  current: string
  exampleText: string
  exampleLine: number
}

type Status = 'idle' | 'saving' | 'saved' | 'error'

/** Rows are keyed by text + line, because the same word can differ per order. */
function rowKey(r: Row): string {
  return `${r.unmappedName} ${r.rowNumber}`
}

export function MapeoTable({ rows, productOptions }: { rows: Row[]; productOptions: string[] }) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(rows.map((r) => [rowKey(r), r.current]))
  )
  const [status, setStatus] = useState<Record<string, Status>>({})

  /**
   * Save one rule. `ignored` marks the text as a promo name / noise; otherwise
   * the typed product is sent as a single component (an empty one deletes it).
   */
  async function save(row: Row, ignored = false) {
    const key = rowKey(row)
    setStatus((s) => ({ ...s, [key]: 'saving' }))
    const productName = (values[key] ?? '').trim()
    try {
      const res = await fetch('/api/historico/mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unmappedName: row.unmappedName,
          rowNumber: row.rowNumber,
          ignored,
          components: ignored || productName === '' ? [] : [{ productName, quantity: 1 }],
        }),
      })
      if (!res.ok) throw new Error()
      setStatus((s) => ({ ...s, [key]: 'saved' }))
    } catch {
      setStatus((s) => ({ ...s, [key]: 'error' }))
    }
  }

  if (rows.length === 0) {
    return <p className="text-sm text-gray-500">No hay ítems sin clasificar. 🎉</p>
  }

  return (
    <div className="overflow-x-auto">
      {/* Shared option list: the input below lets the client type freely AND
          pick from this list (typing filters it). */}
      <datalist id="product-options">
        {productOptions.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 border-b border-gray-200">
            <th className="py-2 pr-4 font-medium">Texto sin clasificar</th>
            <th className="py-2 pr-4 font-medium">Ejemplo (pedido original)</th>
            <th className="py-2 pr-4 font-medium text-right">Ítems</th>
            <th className="py-2 pr-4 font-medium">Asignar producto</th>
            <th className="py-2 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const key = rowKey(r)
            const st = status[key] ?? 'idle'
            return (
              <tr key={key} className="border-b border-gray-100 align-top">
                <td className="py-3 pr-4 text-gray-800 font-medium">
                  {r.unmappedName.replace('UNMAPPED: ', '')}
                </td>
                <td className="py-3 pr-4 text-gray-500 max-w-xs">
                  <span className="text-gray-400">línea {r.exampleLine}:</span> “{r.exampleText}”
                </td>
                <td className="py-3 pr-4 text-gray-500 text-right tabular-nums whitespace-nowrap">
                  {r.count} ({r.quantity} und)
                </td>
                <td className="py-3 pr-4">
                  <input
                    list="product-options"
                    value={values[key] ?? ''}
                    onChange={(e) => {
                      const v = e.target.value
                      setValues((s) => ({ ...s, [key]: v }))
                      setStatus((s) => ({ ...s, [key]: 'idle' }))
                    }}
                    placeholder="Escribe o elige un producto…"
                    className="w-full max-w-xs border border-gray-300 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-nouvie-blue"
                  />
                </td>
                <td className="py-3 whitespace-nowrap">
                  <button
                    onClick={() => save(r)}
                    disabled={st === 'saving'}
                    className="text-sm px-3 py-1 rounded bg-nouvie-blue text-white disabled:opacity-50 hover:opacity-90"
                  >
                    {st === 'saving' ? 'Guardando…' : 'Guardar'}
                  </button>
                  <button
                    onClick={() => save(r, true)}
                    disabled={st === 'saving'}
                    className="ml-2 text-sm px-3 py-1 rounded border border-gray-300 text-gray-600 disabled:opacity-50 hover:bg-gray-50"
                    title="Marcar como texto que no es un producto (no se cuenta)"
                  >
                    No es producto
                  </button>
                  {st === 'saved' && <span className="ml-2 text-green-600">✓</span>}
                  {st === 'error' && <span className="ml-2 text-red-600">Error</span>}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
