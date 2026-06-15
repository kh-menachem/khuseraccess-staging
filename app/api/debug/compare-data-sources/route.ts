import { type NextRequest, NextResponse } from "next/server"
import type { CustomerData, Donation, MachineRental, Transaction } from "@/lib/types"
import {
  APPSHEET_TABLES,
  appSheetFindRows,
  appSheetMissingConfigResponse,
  escapeAppSheetText,
  filterSelector,
  getAppSheetConfig,
  userIdSelector,
} from "@/lib/appsheet-client"

export const maxDuration = 60

interface Summary {
  count: number
  amount: number
  net: number
}

interface AppSheetTableSummary extends Summary {
  durationMs: number
  selector: string
}

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100
}

function parseMoneyValue(value: unknown): number {
  const rawValue = value?.toString().trim() || "0"
  const isParenthesizedNegative = rawValue.startsWith("(") && rawValue.endsWith(")")
  const cleanedValue = rawValue.replace(/[$,\s()]/g, "")
  const parsedValue = Number.parseFloat(cleanedValue)

  if (Number.isNaN(parsedValue)) return 0
  return isParenthesizedNegative ? -parsedValue : parsedValue
}

function normalizedKey(key: string): string {
  return key.toLowerCase().trim().replace(/\s+/g, " ")
}

function getField(row: Record<string, unknown>, names: string[]): unknown {
  const wanted = new Set(names.map(normalizedKey))
  const match = Object.entries(row).find(([key]) => wanted.has(normalizedKey(key)))
  return match?.[1]
}

function computeLinksAndPhoneNet(result: unknown, type: unknown, amount: number): number {
  if (result?.toString().trim().toLowerCase() !== "approved") return 0

  switch (type?.toString().trim()) {
    case "CC:Sale":
      return amount * 0.965
    case "CC:Refund":
    case "CC:Credit":
      return amount
    case "Check:Sale":
      return amount * 0.9985
    case "Grant:Recommendation":
      return amount * 0.965
    case "CC:VoidRelease":
      return amount * -0.965
    case "Check:Void":
      return amount * -0.9985
    default:
      return 0
  }
}

function summarizeTransactions(transactions: Transaction[]): Summary {
  return {
    count: transactions.length,
    amount: roundToTwo(transactions.reduce((sum, row) => sum + (row.amount || 0), 0)),
    net: roundToTwo(transactions.reduce((sum, row) => sum + (row.net || 0), 0)),
  }
}

function summarizeDonations(donations: Donation[]): Summary {
  return {
    count: donations.length,
    amount: roundToTwo(donations.reduce((sum, row) => sum + (row.amount || 0), 0)),
    net: roundToTwo(donations.reduce((sum, row) => sum + (row.net || 0), 0)),
  }
}

function summarizeMachineRentals(machineRentals: MachineRental[]): Summary {
  return {
    count: machineRentals.length,
    amount: roundToTwo(machineRentals.reduce((sum, row) => sum + (row.fee || 0), 0)),
    net: roundToTwo(machineRentals.reduce((sum, row) => sum + (row.fee || 0), 0)),
  }
}

function summarizeAppSheetMoneyRows(rows: Record<string, unknown>[]): Summary {
  return rows.reduce<Summary>(
    (summary, row) => {
      const amount = parseMoneyValue(getField(row, ["Amount"]))
      const computedRaw = getField(row, ["Computed Value", "Computed Value2", "Net", "Net Amount"])
      const net = computedRaw === undefined || computedRaw === "" ? amount : parseMoneyValue(computedRaw)

      return {
        count: summary.count + 1,
        amount: roundToTwo(summary.amount + amount),
        net: roundToTwo(summary.net + net),
      }
    },
    { count: 0, amount: 0, net: 0 },
  )
}

function summarizeAppSheetDonations(rows: Record<string, unknown>[]): Summary {
  return rows.reduce<Summary>(
    (summary, row) => {
      const amount = parseMoneyValue(getField(row, ["Amount"]))
      return {
        count: summary.count + 1,
        amount: roundToTwo(summary.amount + amount),
        net: roundToTwo(summary.net + amount),
      }
    },
    { count: 0, amount: 0, net: 0 },
  )
}

function summarizeAppSheetLinksAndPhone(rows: Record<string, unknown>[]): Summary {
  return rows.reduce<Summary>(
    (summary, row) => {
      const amount = parseMoneyValue(getField(row, ["Amount"]))
      const net = computeLinksAndPhoneNet(getField(row, ["Result"]), getField(row, ["Type"]), amount)

      return {
        count: summary.count + 1,
        amount: roundToTwo(summary.amount + amount),
        net: roundToTwo(summary.net + net),
      }
    },
    { count: 0, amount: 0, net: 0 },
  )
}

function summarizeAppSheetMachineRows(rows: Record<string, unknown>[]): Summary {
  return rows.reduce<Summary>(
    (summary, row) => {
      const fee = parseMoneyValue(getField(row, ["Fee", "Amount", "Cost"]))
      return {
        count: summary.count + 1,
        amount: roundToTwo(summary.amount + fee),
        net: roundToTwo(summary.net + fee),
      }
    },
    { count: 0, amount: 0, net: 0 },
  )
}

function diffSummary(sheets: Summary, appsheet: Summary) {
  return {
    count: appsheet.count - sheets.count,
    amount: roundToTwo(appsheet.amount - sheets.amount),
    net: roundToTwo(appsheet.net - sheets.net),
  }
}

async function fetchSheetsCustomerData(origin: string, body: { userEmail: string; userId: string; language?: string }) {
  const response = await fetch(`${origin}/api/customer-data`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Request-ID": crypto.randomUUID(),
    },
    body: JSON.stringify(body),
    cache: "no-store",
  })
  const text = await response.text()

  if (!response.ok) {
    throw new Error(`Sheets route returned ${response.status}: ${text.slice(0, 500)}`)
  }

  return JSON.parse(text) as CustomerData
}

async function summarizeAppSheetTable(
  tableName: string,
  selector: string,
  summarize: (rows: Record<string, unknown>[]) => Summary,
): Promise<AppSheetTableSummary> {
  const result = await appSheetFindRows(tableName, { selector })
  const summary = summarize(result.rows)

  return {
    ...summary,
    durationMs: result.durationMs,
    selector,
  }
}

export async function POST(request: NextRequest) {
  const { missing } = getAppSheetConfig()

  if (missing.length > 0) {
    return NextResponse.json(appSheetMissingConfigResponse(missing), { status: 400 })
  }

  let body: { userEmail?: string; userId?: string; language?: string }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, code: "PARSE_ERROR", message: "Invalid JSON body." }, { status: 400 })
  }

  const userEmail = body.userEmail?.trim()
  const userId = body.userId?.trim()

  if (!userEmail || !userId) {
    return NextResponse.json(
      {
        success: false,
        code: "MISSING_USER",
        message: "Provide userEmail and userId for the account you want to compare.",
      },
      { status: 400 },
    )
  }

  const origin = new URL(request.url).origin
  const sheetsData = await fetchSheetsCustomerData(origin, {
    userEmail,
    userId,
    language: body.language || "en",
  })

  const personSelector = filterSelector(
    APPSHEET_TABLES.people,
    `And([User Access] = "${escapeAppSheetText(userEmail)}", [UNIQUEID] = "${escapeAppSheetText(userId)}")`,
  )
  const [people, currentMoney, oldMoney, donations, machineRecords, linksAndPhone] = await Promise.all([
    summarizeAppSheetTable(APPSHEET_TABLES.people, personSelector, (rows) => ({ count: rows.length, amount: 0, net: 0 })),
    summarizeAppSheetTable(
      APPSHEET_TABLES.currentMoney,
      userIdSelector(APPSHEET_TABLES.currentMoney, "Person", userId),
      summarizeAppSheetMoneyRows,
    ),
    summarizeAppSheetTable(
      APPSHEET_TABLES.oldMoney,
      userIdSelector(APPSHEET_TABLES.oldMoney, "Person", userId),
      summarizeAppSheetMoneyRows,
    ),
    summarizeAppSheetTable(
      APPSHEET_TABLES.donations,
      userIdSelector(APPSHEET_TABLES.donations, "PersonID", userId),
      summarizeAppSheetDonations,
    ),
    summarizeAppSheetTable(
      APPSHEET_TABLES.machineRecords,
      userIdSelector(APPSHEET_TABLES.machineRecords, "Person", userId),
      summarizeAppSheetMachineRows,
    ),
    summarizeAppSheetTable(
      APPSHEET_TABLES.linksAndPhone,
      userIdSelector(APPSHEET_TABLES.linksAndPhone, "PersonID", userId),
      summarizeAppSheetLinksAndPhone,
    ),
  ])

  const sheets = {
    people: { count: 1, amount: 0, net: 0 },
    currentMoney: summarizeTransactions(sheetsData.currentTransactions || []),
    oldMoney: summarizeTransactions(sheetsData.oldTransactions || []),
    donations: summarizeDonations(sheetsData.donations || []),
    machineRecords: summarizeMachineRentals(sheetsData.machineRentals || []),
    linksAndPhone: summarizeTransactions(sheetsData.linksAndPhoneTransactions || []),
  }

  const appsheet = {
    people,
    currentMoney,
    oldMoney,
    donations,
    machineRecords,
    linksAndPhone,
  }

  return NextResponse.json({
    success: true,
    userId,
    userEmail,
    sheets,
    appsheet,
    differences: {
      people: { count: appsheet.people.count - sheets.people.count, amount: 0, net: 0 },
      currentMoney: diffSummary(sheets.currentMoney, appsheet.currentMoney),
      oldMoney: diffSummary(sheets.oldMoney, appsheet.oldMoney),
      donations: diffSummary(sheets.donations, appsheet.donations),
      machineRecords: diffSummary(sheets.machineRecords, appsheet.machineRecords),
      linksAndPhone: diffSummary(sheets.linksAndPhone, appsheet.linksAndPhone),
    },
  })
}
