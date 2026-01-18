export function parseAmplitudeCsv(input: string): {
  headers: string[]
  rows: Record<string, number | string>[]
} {
  const csv = unwrapAmplitudePayload(input)

  const lines = csv
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  if (lines.length === 0) return { headers: [], rows: [] }

  // Find first "real" header row:
  // must contain commas AND must contain at least 2 columns
  // also skip lines that are clearly not tabular
  const headerIndex = lines.findIndex((line) => {
    if (line.startsWith("{") || line.startsWith("[") || line.startsWith("data:")) return false
    const cols = splitCsvLine(line)
    return cols.length >= 2 && cols.some((c) => c.length > 0)
  })

  if (headerIndex === -1) return { headers: [], rows: [] }

  const headers = splitCsvLine(lines[headerIndex]).map(cleanCell)

  const rows = lines.slice(headerIndex + 1).map((line) => {
    const values = splitCsvLine(line).map(cleanCell)
    const row: Record<string, number | string> = {}

    headers.forEach((h, i) => {
      const v = values[i] ?? ""
      const num = Number(v)
      row[h] = v !== "" && !isNaN(num) ? num : v
    })

    return row
  })

  return { headers, rows }
}

function unwrapAmplitudePayload(input: string): string {
  const trimmed = input.trim()

  // Case 1: Amplitude returns JSON like { "data": "...." }
  if (trimmed.startsWith("{")) {
    try {
      const obj = JSON.parse(trimmed)
      if (obj && typeof obj.data === "string") {
        // data often contains escaped newlines and tabs already decoded by JSON.parse
        return obj.data
      }
    } catch {
      // fall through
    }
  }

  // Case 2: looks like CSV already
  return input
}

function cleanCell(s: string): string {
  // remove leading tab characters Amplitude sometimes includes
  return s.replace(/^\t+/, "").trim()
}

function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]

    if (ch === '"') {
      // handle escaped quotes ""
      const next = line[i + 1]
      if (inQuotes && next === '"') {
        cur += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (ch === "," && !inQuotes) {
      out.push(cur)
      cur = ""
      continue
    }

    cur += ch
  }

  out.push(cur)
  return out
}
