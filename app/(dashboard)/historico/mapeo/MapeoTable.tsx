'use client'

import { useState } from 'react'

interface Row {
  unmappedName: string
  count: number
  quantity: number
  current: string
  exampleText: string
  exampleLine: number
}

type Status = 'idle' | 'saving' | 'saved' | 'error'

export function MapeoTable({ rows, productOptions }: { rows: Row[]; productOptions: string[] }) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(rows.map((r) => [r.unmappedName, r.current]))
  )
  const [status, setStatus] = useState<Record<string, Status>>({})

  async function save(unmappedName: string) {
    setStatus((s) => ({ ...s, [unmappedName]: 'saving' }))
    try {
      const res = await fetch('/api/historico/mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unmappedName, productName: values[unmappedName] ?? '' }),
      })
      if (!res.ok) throw new Error()
      setStatus((s) => ({ ...s, [unmappedName]: 'saved' }))
    } catch {
      setStatus((s) => ({ ...s, [unmappedName]: 'error' }))
    }
  }

  if (rows.length === 0) {
    return <p className="text-sm text-gray-500">No hay ítems sin clasificar. 🎉</p>
  }

  return (
    <div className="overflow-x-auto">
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
            const st = status[r.unmappedName] ?? 'idle'
            return (
              <tr key={r.unmappedName} className="border-b border-gray-100 align-top">
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
                  <select
                    value={values[r.unmappedName] ?? ''}
                    onChange={(e) => {
                      const v = e.target.value
                      setValues((s) => ({ ...s, [r.unmappedName]: v }))
                      setStatus((s) => ({ ...s, [r.unmappedName]: 'idle' }))
                    }}
                    className="w-full max-w-xs border border-gray-300 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-nouvie-blue"
                  >
                    <option value="">— Sin asignar —</option>
                    {productOptions.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-3 whitespace-nowrap">
                  <button
                    onClick={() => save(r.unmappedName)}
                    disabled={st === 'saving'}
                    className="text-sm px-3 py-1 rounded bg-nouvie-blue text-white disabled:opacity-50 hover:opacity-90"
                  >
                    {st === 'saving' ? 'Guardando…' : 'Guardar'}
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
