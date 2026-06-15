export interface AppSheetConfig {
  appId: string
  accessKey: string
  region: string
  locale: string
  timezone: string
}

export interface AppSheetFindOptions {
  selector?: string
  rows?: Record<string, unknown>[]
  runAsUserEmail?: string
}

export interface AppSheetFindResult {
  tableName: string
  rows: Record<string, unknown>[]
  durationMs: number
  diagnostics: {
    status: number
    rawLength: number
    parsedType: "array" | "object" | "other"
    parsedKeys: string[]
    topLevelArrayCount: number | null
    rowsKeyCount: number | null
    rawPreview: string
  }
}

export const APPSHEET_TABLES = {
  people: process.env.APPSHEET_TABLE_PEOPLE?.trim() || "People",
  currentMoney: process.env.APPSHEET_TABLE_MONEY?.trim() || "Money",
  oldMoney: process.env.APPSHEET_TABLE_MONEY_OLD?.trim() || "Money_Old",
  donations: process.env.APPSHEET_TABLE_DONATIONS?.trim() || "Donations",
  machineRecords: process.env.APPSHEET_TABLE_MACHINE_RECORDS?.trim() || "Machine Records",
  linksAndPhone: process.env.APPSHEET_TABLE_LINKS_AND_PHONE?.trim() || "LinksandPhone",
} as const

export function getAppSheetConfig(): { config: AppSheetConfig | null; missing: string[] } {
  const missing: string[] = []
  const appId = process.env.APPSHEET_APP_ID?.trim()
  const accessKey = process.env.APPSHEET_ACCESS_KEY?.trim()

  if (!appId) missing.push("APPSHEET_APP_ID")
  if (!accessKey) missing.push("APPSHEET_ACCESS_KEY")

  if (!appId || !accessKey) {
    return { config: null, missing }
  }

  return {
    config: {
      appId,
      accessKey,
      region: process.env.APPSHEET_REGION?.trim() || "www.appsheet.com",
      locale: process.env.APPSHEET_LOCALE?.trim() || "en-US",
      timezone: process.env.APPSHEET_TIMEZONE?.trim() || "Eastern Standard Time",
    },
    missing,
  }
}

export function isAppSheetConfigured(): boolean {
  return getAppSheetConfig().missing.length === 0
}

export function appSheetMissingConfigResponse(missing: string[]) {
  return {
    success: false,
    code: "MISSING_APPSHEET_CONFIG",
    message: "AppSheet API is not configured for this deployment yet.",
    missing,
    requiredVercelEnvVars: ["APPSHEET_APP_ID", "APPSHEET_ACCESS_KEY"],
    optionalVercelEnvVars: [
      "APPSHEET_REGION",
      "APPSHEET_LOCALE",
      "APPSHEET_TIMEZONE",
      "APPSHEET_TABLE_PEOPLE",
      "APPSHEET_TABLE_MONEY",
      "APPSHEET_TABLE_MONEY_OLD",
      "APPSHEET_TABLE_DONATIONS",
      "APPSHEET_TABLE_MACHINE_RECORDS",
      "APPSHEET_TABLE_LINKS_AND_PHONE",
    ],
    recommendedDefaults: {
      APPSHEET_REGION: "www.appsheet.com",
      APPSHEET_LOCALE: "en-US",
      APPSHEET_TIMEZONE: "Eastern Standard Time",
    },
  }
}

function appSheetActionUrl(config: AppSheetConfig, tableName: string): string {
  const encodedAppId = encodeURIComponent(config.appId)
  const encodedTableName = encodeURIComponent(tableName)

  return `https://${config.region}/api/v2/apps/${encodedAppId}/tables/${encodedTableName}/Action`
}

export function escapeAppSheetText(value: string): string {
  return value.replace(/"/g, '""')
}

export function appSheetTableRef(tableName: string): string {
  return /\s/.test(tableName) ? `"${escapeAppSheetText(tableName)}"` : tableName
}

export async function appSheetFindRows(
  tableName: string,
  options: AppSheetFindOptions = {},
): Promise<AppSheetFindResult> {
  const { config, missing } = getAppSheetConfig()

  if (!config) {
    throw new Error(`Missing AppSheet config: ${missing.join(", ")}`)
  }

  const startedAt = Date.now()
  const properties: Record<string, unknown> = {
    Locale: config.locale,
    Timezone: config.timezone,
  }

  if (options.selector) {
    properties.Selector = options.selector
  }

  if (options.runAsUserEmail) {
    properties.RunAsUserEmail = options.runAsUserEmail
  }

  const response = await fetch(appSheetActionUrl(config, tableName), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ApplicationAccessKey: config.accessKey,
    },
    body: JSON.stringify({
      Action: "Find",
      Properties: properties,
      Rows: options.rows || [],
    }),
    cache: "no-store",
  })

  const text = await response.text()

  if (!response.ok) {
    throw new Error(`AppSheet ${tableName} Find failed with ${response.status}: ${text.slice(0, 500)}`)
  }

  let payload: unknown
  try {
    payload = JSON.parse(text)
  } catch (error) {
    throw new Error(`AppSheet ${tableName} returned non-JSON response: ${String(error)}`)
  }

  const rowsFromRowsKey =
    payload && !Array.isArray(payload) && typeof payload === "object" && Array.isArray((payload as { Rows?: unknown }).Rows)
      ? ((payload as { Rows: Record<string, unknown>[] }).Rows)
      : []
  const rowsFromTopLevel = Array.isArray(payload) ? (payload as Record<string, unknown>[]) : []
  const rows = rowsFromRowsKey.length > 0 ? rowsFromRowsKey : rowsFromTopLevel

  return {
    tableName,
    rows,
    durationMs: Date.now() - startedAt,
    diagnostics: {
      status: response.status,
      rawLength: text.length,
      parsedType: Array.isArray(payload) ? "array" : payload && typeof payload === "object" ? "object" : "other",
      parsedKeys: payload && !Array.isArray(payload) && typeof payload === "object" ? Object.keys(payload) : [],
      topLevelArrayCount: Array.isArray(payload) ? payload.length : null,
      rowsKeyCount: rowsFromRowsKey.length,
      rawPreview: text.slice(0, 500),
    },
  }
}

export function filterSelector(tableName: string, expression = "true"): string {
  return `Filter(${appSheetTableRef(tableName)}, ${expression})`
}

export function userIdSelector(tableName: string, columnName: string, userId: string): string {
  return filterSelector(tableName, `[${columnName}] = "${escapeAppSheetText(userId)}"`)
}
