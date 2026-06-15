import { type NextRequest, NextResponse } from "next/server"
import {
  APPSHEET_TABLES,
  appSheetFindRows,
  appSheetMissingConfigResponse,
  filterSelector,
  getAppSheetConfig,
} from "@/lib/appsheet-client"

export const maxDuration = 60

const DEFAULT_LIMIT = 5
const MAX_LIMIT = 50

function previewValue(value: unknown): unknown {
  if (typeof value !== "string") return value
  if (value.length <= 8) return value
  return `${value.slice(0, 4)}...${value.slice(-2)}`
}

function previewRow(row: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, previewValue(value)]))
}

export async function GET() {
  const { config, missing } = getAppSheetConfig()

  return NextResponse.json({
    success: missing.length === 0,
    configured: missing.length === 0,
    missing,
    region: config?.region || process.env.APPSHEET_REGION || "www.appsheet.com",
    availableTableAliases: APPSHEET_TABLES,
    message:
      missing.length === 0
        ? "AppSheet API env vars are present. Use POST to test a table."
        : "Add the missing env vars to the AppSheet API preview deployment before testing.",
  })
}

export async function POST(request: NextRequest) {
  const { missing } = getAppSheetConfig()

  if (missing.length > 0) {
    return NextResponse.json(appSheetMissingConfigResponse(missing), { status: 400 })
  }

  let body: {
    tableName?: string
    selector?: string
    limit?: number
    includeSampleRows?: boolean
    runAsUserEmail?: string
    readAll?: boolean
    includeDiagnostics?: boolean
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, code: "PARSE_ERROR", message: "Invalid JSON body." }, { status: 400 })
  }

  const tableName = body.tableName?.trim()
  if (!tableName) {
    return NextResponse.json(
      {
        success: false,
        code: "MISSING_TABLE_NAME",
        message: "Provide a tableName, for example People or Money.",
      },
      { status: 400 },
    )
  }

  const limit = Math.min(Math.max(Number(body.limit) || DEFAULT_LIMIT, 1), MAX_LIMIT)
  const selector = body.readAll ? undefined : body.selector?.trim() || filterSelector(tableName)

  try {
    const result = await appSheetFindRows(tableName, {
      selector,
      runAsUserEmail: body.runAsUserEmail,
    })
    const columns = Array.from(new Set(result.rows.flatMap((row) => Object.keys(row)))).sort()

    return NextResponse.json({
      success: true,
      tableName,
      selector: selector || null,
      readAll: Boolean(body.readAll),
      rowCount: result.rows.length,
      columns,
      durationMs: result.durationMs,
      diagnostics: body.includeDiagnostics ? result.diagnostics : undefined,
      sampleRows: body.includeSampleRows ? result.rows.slice(0, limit).map(previewRow) : undefined,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        code: "APPSHEET_FIND_ERROR",
        tableName,
        selector,
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 502 },
    )
  }
}
