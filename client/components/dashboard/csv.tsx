"use client"

import { useEffect, useState } from "react"
import { parseAmplitudeCsv } from "@/lib/parseCsv"

export default function CsvDebug({ chartId }: { chartId: string }) {
  const [rows, setRows] = useState<Record<string, number | string>[]>([])
  const [headers, setHeaders] = useState<string[]>([])

  useEffect(() => {
    if (!chartId) return

    ;(async () => {
      const res = await fetch(`/api/amplitude/csv/${chartId}`, { cache: "no-store" })
      const text = await res.text()
      const parsed = parseAmplitudeCsv(text)
      setHeaders(parsed.headers)
      setRows(parsed.rows)
    })()
  }, [chartId])

  if (!headers.length) {
    return <div className="text-sm text-muted-foreground">Parsing CSV…</div>
  }

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-2 text-sm font-semibold">CSV Parsed Data</div>

      <div className="overflow-auto">
        <table className="min-w-full text-xs">
          <thead>
            <tr>
              {headers.map((h) => (
                <th key={h} className="border-b px-2 py-1 text-left font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {headers.map((h) => (
                  <td key={h} className="border-b px-2 py-1">
                    {row[h]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
