import { type NextRequest, NextResponse } from "next/server"
import { google } from "googleapis"
import type { CustomerData, Transaction, Donation, MachineRental } from "@/lib/types"
import { writeFileSync, readFileSync, existsSync } from "fs"
import { join } from "path"
import * as os from "os"
import { writeLogToSheet } from "@/lib/server-logger"

const TRANSACTION_LIMIT_FILE = join(os.tmpdir(), "transaction-limit.json")

function roundToTwo(num: number): number {
  return Math.round(num * 100) / 100
}

interface TransactionLimit {
  enabled: boolean
  limitType: "years" | "date"
  limitValue: string
}

function getTransactionLimit(): TransactionLimit {
  try {
    if (existsSync(TRANSACTION_LIMIT_FILE)) {
      const data = readFileSync(TRANSACTION_LIMIT_FILE, "utf-8")
      return JSON.parse(data)
    }
  } catch (error) {
    console.error("Error reading transaction limit file:", error)
  }
  return { enabled: false, limitType: "years", limitValue: "1" }
}

function getCutoffDate(limit: TransactionLimit): Date | null {
  if (!limit.enabled) return null

  const now = new Date()

  if (limit.limitType === "years") {
    const years = Number.parseInt(limit.limitValue) || 1
    const cutoff = new Date(now)
    cutoff.setFullYear(cutoff.getFullYear() - years)
    return cutoff
  } else if (limit.limitType === "date") {
    // limitValue is a year like "2024"
    const year = Number.parseInt(limit.limitValue)
    if (!Number.isNaN(year)) {
      return new Date(year, 0, 1) // January 1st of that year
    }
  }

  return null
}

function filterTransactionsByDate<T extends { date: string }>(transactions: T[], cutoffDate: Date | null): T[] {
  if (!cutoffDate) return transactions

  return transactions.filter((tx) => {
    try {
      const txDate = new Date(tx.date)
      return txDate >= cutoffDate
    } catch (error) {
      console.error("Error parsing transaction date:", tx.date, error)
      return false
    }
  })
}

function getHardcodedPercentages(): Map<string, number> {
  const percentagesMap = new Map<string, number>()

  const hardcodedValues = [
    { type: "Check", value: 1 },
    { type: "Credit Card", value: 0.965 },
    { type: "Donor Fund", value: 0.97 },
    { type: "Cash", value: 1 },
    { type: "Links", value: 0.965 },
    { type: "Wires", value: 1 },
    { type: "Remote Checks", value: 1 },
    { type: "Post Dated", value: 1 },
    { type: "Machine Rental", value: -1 },
    { type: "Payout", value: -1 },
    { type: "Fees", value: -1 },
    { type: "Ramp", value: -1 },
    { type: "Bounced Check Fee", value: -1 },
    { type: "Coins 0%", value: 1 },
    { type: "Phone Rental", value: -1 },
    { type: "Transfer From +", value: 1 },
    { type: "Transfer To -", value: -1 },
    { type: "0", value: 1 },
    { type: "Coins", value: 0.9 },
  ]

  for (const { type, value } of hardcodedValues) {
    percentagesMap.set(type.toLowerCase(), value)
  }

  return percentagesMap
}

function getMonthName(yearMonth: string, language: string): string {
  const [year, month] = yearMonth.split("-").map(Number)

  const months = {
    en: [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ],
    he: ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"],
  }

  const names = months[language === "he" ? "he" : "en"]
  return `${names[month - 1]} ${year}`
}

function processDonors(rows: string[][]): Map<string, string> {
  const donorsMap = new Map<string, string>()

  if (rows.length <= 1) return donorsMap

  const headerRow = rows[0]
  console.log("Donors sheet headers:", headerRow)

  const uniqueIdIndex = headerRow.findIndex(
    (header: string) => header?.toLowerCase().trim() === "uniqueid" || header?.toLowerCase().trim() === "unique id",
  )

  const nameIndex = headerRow.findIndex(
    (header: string) =>
      header?.toLowerCase().trim() === "name" ||
      header?.toLowerCase().trim() === "full name" ||
      header?.toLowerCase().trim() === "fullname",
  )

  if (uniqueIdIndex === -1) {
    console.log("Could not find UNIQUEID column in Donors sheet")
    console.log("Available headers:", headerRow)
    return donorsMap
  }

  if (nameIndex === -1) {
    console.log("Could not find Name column in Donors sheet")
    console.log("Available headers:", headerRow)
    return donorsMap
  }

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (row[uniqueIdIndex] && row[nameIndex]) {
      const donorId = row[uniqueIdIndex].trim()
      const name = row[nameIndex].trim()

      donorsMap.set(donorId, name)
      console.log(`Added donor mapping: ${donorId} -> "${name}"`)
    }
  }

  return donorsMap
}

function processMachines(rows: string[][]): Map<string, string> {
  const machinesMap = new Map<string, string>()

  if (rows.length <= 1) return machinesMap

  const headerRow = rows[0]
  console.log("Machines sheet headers:", headerRow)

  const machineRefIndex = headerRow.findIndex(
    (header: string) =>
      header?.toLowerCase().trim() === "machine" ||
      header?.toLowerCase().trim() === "machine ref" ||
      header?.toLowerCase().trim() === "machineref",
  )

  const machineIdIndex = headerRow.findIndex(
    (header: string) =>
      header?.toLowerCase().trim() === "machine id" ||
      header?.toLowerCase().trim() === "machineid" ||
      header?.toLowerCase().trim() === "id" ||
      header?.toLowerCase().trim() === "number",
  )

  if (machineRefIndex === -1 || machineIdIndex === -1) {
    console.log("Could not find machine reference or machine ID columns in Machines sheet")
    console.log("Available headers:", headerRow)
    return machinesMap
  }

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (row[machineRefIndex] && row[machineIdIndex]) {
      const machineRef = row[machineRefIndex].trim()
      const machineId = row[machineIdIndex].trim()
      machinesMap.set(machineRef, machineId)
      console.log(`Added machine mapping: ${machineRef} -> ${machineId}`)
    }
  }

  return machinesMap
}

function processPercentages(rows: string[][]): Map<string, number> {
  const percentagesMap = new Map<string, number>()

  if (rows.length <= 1) {
    console.log("No data in Percentages sheet, using hardcoded values")
    return getHardcodedPercentages()
  }

  const headerRow = rows[0]
  console.log("Percentages sheet headers:", headerRow)

  const typeIndex = headerRow.findIndex((header: string) => header?.toLowerCase().trim() === "type")

  const valueIndex = headerRow.findIndex(
    (header: string) =>
      header?.toLowerCase().trim() === "value" ||
      header?.toLowerCase().trim() === "multiplier" ||
      header?.toLowerCase().trim() === "percentage" ||
      header?.toLowerCase().trim() === "percent" ||
      header?.toLowerCase().trim() === "rate",
  )

  if (typeIndex === -1 || valueIndex === -1) {
    console.log("Could not find type or value columns in Percentages sheet, using hardcoded values")
    console.log("Available headers:", headerRow)
    return getHardcodedPercentages()
  }

  const hardcodedMap = getHardcodedPercentages()
  for (const [key, value] of hardcodedMap) {
    percentagesMap.set(key, value)
  }

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (row[typeIndex] && row[valueIndex]) {
      const type = row[typeIndex].trim()
      try {
        const valueStr = row[valueIndex].toString().trim().replace("%", "")
        let multiplier = Number.parseFloat(valueStr)

        if (!Number.isNaN(multiplier)) {
          if (multiplier > 1) {
            multiplier = multiplier / 100
          }
          percentagesMap.set(type.toLowerCase(), multiplier)
          console.log(`Added/Updated multiplier from sheet for type ${type}: ${multiplier}`)
        }
      } catch (error) {
        console.error(`Error parsing value for type ${type}:`, error)
      }
    }
  }

  return percentagesMap
}

function processTransactions(rows: string[][], userId: string, percentagesMap: Map<string, number>): Transaction[] {
  if (rows.length === 0) return []

  const headerRow = rows[0]
  console.log("Transaction sheet headers:", headerRow)

  const personIndex = headerRow.findIndex((header: string) => header?.toLowerCase().trim() === "person")

  const amountIndex = headerRow.findIndex(
    (header: string) =>
      header?.toLowerCase().trim() === "amount" ||
      header?.toLowerCase().trim() === "value" ||
      header?.toLowerCase().trim() === "total",
  )

  const typeIndex = headerRow.findIndex((header: string) => header?.toLowerCase().trim() === "type")

  const dateIndex = headerRow.findIndex(
    (header: string) =>
      header?.toLowerCase().trim() === "date" ||
      header?.toLowerCase().trim() === "date/time" ||
      header?.toLowerCase().trim() === "datetime",
  )

  const notesIndex = headerRow.findIndex(
    (header: string) => header?.toLowerCase().trim() === "notes" || header?.toLowerCase().trim() === "note",
  )

  const notClearedIndex = headerRow.findIndex(
    (header: string) => header?.toLowerCase().trim() === "not cleared" || header?.toLowerCase().trim() === "notcleared",
  )

  const cardknoxIndex = headerRow.findIndex((header: string) => header?.toLowerCase().trim() === "cardknox")

  const referenceIndex = headerRow.findIndex(
    (header: string) =>
      header?.toLowerCase().trim() === "reference" ||
      header?.toLowerCase().trim() === "ref" ||
      header?.toLowerCase().trim() === "uniqueid" ||
      header?.toLowerCase().trim() === "id",
  )

  if (personIndex === -1) {
    console.log("No Person column found in transaction sheet")
    console.log("Available headers:", headerRow)
    return []
  }

  if (amountIndex === -1) {
    console.log("No Amount column found in transaction sheet")
    return []
  }

  const filteredRows = rows.slice(1).filter((row: string[]) => {
    if (!row[personIndex]) return false
    const rowPersonId = row[personIndex]?.toString().trim()
    return rowPersonId === userId
  })

  console.log(`Found ${filteredRows.length} matching transactions for user UNIQUEID ${userId}`)

  return filteredRows.map((row: string[], index: number) => {
    let originalAmount = 0
    let netAmount = 0
    try {
      const amountStr = row[amountIndex]?.toString().trim() || "0"
      const cleanedAmount = amountStr.replace(/[$,]/g, "")
      originalAmount = Number.parseFloat(cleanedAmount)
      netAmount = originalAmount

      if (Number.isNaN(originalAmount)) {
        console.log(`Invalid amount value: ${amountStr}, defaulting to 0`)
        originalAmount = 0
        netAmount = 0
      }
    } catch (error) {
      console.error("Error parsing amount:", error)
      originalAmount = 0
      netAmount = 0
    }

    const transactionType = typeIndex !== -1 ? row[typeIndex]?.toString().trim() : ""

    if (transactionType) {
      const lowerCaseType = transactionType.toLowerCase()
      if (percentagesMap.has(lowerCaseType)) {
        const multiplier = percentagesMap.get(lowerCaseType) || 1
        netAmount = roundToTwo(originalAmount * multiplier)

        console.log(
          `Applied multiplier ${multiplier} to amount for type ${transactionType}: ${originalAmount} -> ${netAmount}`,
        )
      } else {
        console.log(`No multiplier found for type: ${transactionType}, using 1.0`)
        netAmount = originalAmount
      }
    }
    // Prepare description (notes) and optionally include cardknox value
    let description = notesIndex !== -1 ? row[notesIndex] || "" : ""
    const cardknoxValue = cardknoxIndex !== -1 ? row[cardknoxIndex]?.toString().trim() : ""

    // Append Cardknox value to description if available
    if (cardknoxValue) {
      description = `${description ? description + " - " : ""}${cardknoxValue}`
    }
    return {
      id: referenceIndex !== -1 ? row[referenceIndex] || `TX-${index}` : `TX-${index}`,
      date: dateIndex !== -1 ? row[dateIndex] || "" : "",
      description,
      reference: referenceIndex !== -1 ? row[referenceIndex] || "" : "",
      amount: originalAmount,
      net: netAmount,
      type: transactionType || "",
      notCleared: notClearedIndex !== -1 ? row[notClearedIndex] || "" : "",
    }
  })
}

function processDonations(rows: string[][], userId: string, donorsMap: Map<string, string>): Donation[] {
  if (rows.length === 0) return []

  const headerRow = rows[0]
  console.log("Donations sheet headers:", headerRow)
  console.log("Total columns in donations sheet:", headerRow.length)

  const personIdIndex = headerRow.findIndex(
    (header: string) =>
      header?.toLowerCase().trim() === "personid" ||
      header?.toLowerCase().trim() === "person id" ||
      header?.toLowerCase().trim() === "person_id",
  )

  console.log("PersonID column index in donations:", personIdIndex)

  if (personIdIndex === -1) {
    console.log("No PersonID column found in donations sheet")
    console.log("Available headers:", headerRow)
    return []
  }

  const dateIndex = headerRow.findIndex(
    (header: string) =>
      header?.toLowerCase().trim() === "date" ||
      header?.toLowerCase().trim() === "date/time" ||
      header?.toLowerCase().trim() === "datetime",
  )

  const donorIdIndex = headerRow.findIndex(
    (header: string) =>
      header?.toLowerCase().trim() === "donorid" ||
      header?.toLowerCase().trim() === "donor id" ||
      header?.toLowerCase().trim() === "donor_id",
  )

  const purposeIndex = headerRow.findIndex(
    (header: string) =>
      header?.toLowerCase().trim() === "purpose" ||
      header?.toLowerCase().trim() === "reason" ||
      header?.toLowerCase().trim() === "description" ||
      header?.toLowerCase().trim() === "notes",
  )

  const amountIndex = headerRow.findIndex(
    (header: string) =>
      header?.toLowerCase().trim() === "amount" ||
      header?.toLowerCase().trim() === "value" ||
      header?.toLowerCase().trim() === "total",
  )

  const filteredRows = rows.slice(1).filter((row: string[]) => {
    if (!row[personIdIndex]) return false
    const rowPersonId = row[personIdIndex]?.toString().trim()
    return rowPersonId === userId
  })

  console.log(`Found ${filteredRows.length} matching donations for user UNIQUEID ${userId}`)

  return filteredRows.map((row: string[], index: number) => {
    let amount = 0
    try {
      const amountStr = row[amountIndex]?.toString().trim() || "0"
      const cleanedAmount = amountStr.replace(/[$,]/g, "")
      amount = Number.parseFloat(cleanedAmount)

      if (Number.isNaN(amount)) {
        console.log(`Invalid donation amount value: ${amountStr}, defaulting to 0`)
        amount = 0
      }
    } catch (error) {
      console.error("Error parsing donation amount:", error)
      amount = 0
    }

    const donorId = donorIdIndex !== -1 ? row[donorIdIndex]?.toString().trim() || "" : ""
    let donorName = ""

    if (donorId && donorsMap.has(donorId)) {
      donorName = donorsMap.get(donorId)!
      console.log(`Found donor name for ${donorId}: "${donorName}"`)
    } else {
      donorName = donorId
      console.log(`No donor mapping found for ${donorId}, using donor ID as name`)
    }

    return {
      id: row[0] || `DON-${index}`,
      date: dateIndex !== -1 ? row[dateIndex] || "" : "",
      donorId: donorId,
      donorName: donorName,
      purpose: purposeIndex !== -1 ? row[purposeIndex] || "" : "",
      amount: amount,
      net: amount,
      type: "Donation",
    }
  })
}

function processMachineRentals(rows: string[][], userId: string, machinesMap: Map<string, string>): MachineRental[] {
  if (rows.length === 0) return []

  const headerRow = rows[0]
  console.log("Machine Records sheet headers:", headerRow)
  console.log("Total columns in machine records sheet:", headerRow.length)

  const personIndex = headerRow.findIndex((header: string) => header?.toLowerCase().trim() === "person")

  console.log("Person column index in machine records:", personIndex)

  if (personIndex === -1) {
    console.log("No Person column found in machine records sheet")
    console.log("Available headers:", headerRow)
    return []
  }

  const machineRefIndex = headerRow.findIndex(
    (header: string) =>
      header?.toLowerCase().trim() === "machine" ||
      header?.toLowerCase().trim() === "machine ref" ||
      header?.toLowerCase().trim() === "machineref",
  )

  const dateIndex = headerRow.findIndex(
    (header: string) =>
      header?.toLowerCase().trim() === "date" ||
      header?.toLowerCase().trim() === "date/time" ||
      header?.toLowerCase().trim() === "datetime",
  )

  const statusIndex = headerRow.findIndex(
    (header: string) => header?.toLowerCase().trim() === "status" || header?.toLowerCase().trim() === "in/out",
  )

  const feeIndex = headerRow.findIndex(
    (header: string) =>
      header?.toLowerCase().trim() === "fee" ||
      header?.toLowerCase().trim() === "amount" ||
      header?.toLowerCase().trim() === "cost",
  )

  const filteredRows = rows.slice(1).filter((row: string[]) => {
    if (!row[personIndex]) return false
    const rowPersonId = row[personIndex]?.toString().trim()
    return rowPersonId === userId
  })

  console.log(`Found ${filteredRows.length} matching machine records for user UNIQUEID ${userId}`)

  const machineGroups = new Map<string, { in?: any; out?: any }>()

  filteredRows.forEach((row: string[]) => {
    const machineRef = machineRefIndex !== -1 ? row[machineRefIndex]?.toString().trim() : ""
    const status = statusIndex !== -1 ? row[statusIndex]?.toString().trim().toLowerCase() : ""
    const date = dateIndex !== -1 ? row[dateIndex] || "" : ""

    let fee = 0
    try {
      const feeStr = row[feeIndex]?.toString().trim() || "0"
      const cleanedFee = feeStr.replace(/[$,]/g, "")
      fee = Number.parseFloat(cleanedFee)

      if (Number.isNaN(fee)) {
        fee = 0
      }
    } catch (error) {
      console.error("Error parsing fee:", error)
      fee = 0
    }

    const record = {
      date,
      fee,
      row,
    }

    if (!machineGroups.has(machineRef)) {
      machineGroups.set(machineRef, {})
    }

    const group = machineGroups.get(machineRef)!
    if (status === "out") {
      group.out = record
    } else if (status === "in") {
      group.in = record
    }
  })

  const machineRentals: MachineRental[] = []
  let index = 0

  machineGroups.forEach((group, machineRef) => {
    const machineId = machinesMap.get(machineRef) || machineRef

    const rentalDate = group.out?.date || ""
    const returnDate = group.in?.date || null

    const fee = group.out?.fee || group.in?.fee || 0

    let status = "Unknown"
    if (group.out && group.in) {
      status = "Returned"
    } else if (group.out && !group.in) {
      status = "Out"
    } else if (!group.out && group.in) {
      status = "In"
    }

    machineRentals.push({
      id: `MR-${index++}`,
      machineId: machineId,
      rentalDate: rentalDate,
      returnDate: returnDate,
      status: status,
      fee: fee,
    })
  })

  return machineRentals
}

function processLinksTransactionsGrouped(rows: string[][], userId: string, language: string): Transaction[] {
  if (rows.length === 0) return []

  const hdr = rows[0].map((h) => h.toLowerCase().trim())

  const iPerson = hdr.indexOf("personid") // L
  const iDate = hdr.indexOf("date") // B
  const iName = hdr.indexOf("name") // C
  const iAmount = hdr.indexOf("amount") // E
  const iDesc = hdr.indexOf("description") // G
  const iResult = hdr.indexOf("result") // H
  const iType = hdr.indexOf("type") // J
  const iMid = hdr.indexOf("mid") // K

  if ([iPerson, iDate, iName, iAmount, iDesc, iResult, iType, iMid].some((i) => i === -1)) {
    console.error("Missing one or more required columns in LinksandPhone")
    return []
  }

  const details = rows
    .slice(1)
    .filter((r) => r[iPerson]?.trim() === userId)
    .filter((r) => r[iResult]?.trim() === "Approved")
    .filter((r) => !["CC:Save", "Check:Adjust"].includes(r[iType]?.trim()))
    .map((r, index) => {
      const date = r[iDate]
      const yearMonth = date.slice(0, 7)
      const amt = Number.parseFloat(r[iAmount].replace(/[$,]/g, "")) || 0
      const type = r[iType]?.trim()
      let net = 0
      switch (type) {
        case "CC:Sale":
          net = roundToTwo(amt * 0.965)
          break
        case "CC:Refund":
          net = roundToTwo(amt)
          break
        case "CC:Credit":
          net = roundToTwo(amt)
          break
        case "Check:Sale":
          net = amt * 0.9985
          break
        case "Grant:Recommendation":
          net = roundToTwo(amt * 0.965)
          break
        case "CC:VoidRelease":
          net = roundToTwo(amt * -0.965)
          break
        default:
          net = 0 // or amt — depends on desired behavior
          break
      }

      const source = r[iMid] === "31393" ? "Links Donation" : r[iMid] === "40939" ? "Phone Donation" : ""

      return {
        id: `LINK-${index}`,
        date,
        name: r[iName],
        amount: amt,
        net,
        description: r[iDesc] || "",
        source,
        yearMonth,
      }
    })

  // Group by month
  const grouped = new Map<string, Transaction>()
  for (const d of details) {
    const key = d.yearMonth

    if (!grouped.has(key)) {
      grouped.set(key, {
        id: `LINKS-${key}`,
        date: `${key}-01`,
        description: getMonthName(key, language),
        reference: `LINKS-${key}`,
        amount: 0,
        net: 0,
        type: language === "he" ? "תרומות קישורים / טלפון" : "Links/Phone Donations",
        notCleared: language === "he" ? "זמין" : "Cleared",
        source: "LinksandPhone",
        details: [],
      })
    }

    const tx = grouped.get(key)!
    tx.amount += d.amount
    tx.net = roundToTwo(tx.net + d.net)
    if (!tx.date || d.date < tx.date) tx.date = d.date

    tx.details!.push({
      date: d.date,
      name: d.name,
      amount: d.amount,
      net: d.net,
      description: d.description,
      source: d.source,
    })
  }

  return Array.from(grouped.values())
}

export async function POST(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") || "unknown"

  try {
    let body
    try {
      body = await request.json()
    } catch (parseError) {
      await writeLogToSheet({
        timestamp: new Date().toISOString(),
        level: "ERROR",
        event: "DATA_PARSE_ERROR",
        message: "Failed to parse request body",
        metadata: JSON.stringify({ error: String(parseError) }),
        requestId,
      })

      console.error("[v0] Failed to parse request body:", parseError)
      return NextResponse.json({ error: "Invalid request format" }, { status: 400 })
    }

    const { userEmail, userId, language } = body
    const lang = language === "he" ? "he" : "en"

    await writeLogToSheet({
      timestamp: new Date().toISOString(),
      level: "INFO",
      event: "DATA_FETCH_START",
      message: `Fetching data for user: ${userEmail}`,
      metadata: JSON.stringify({ userId, language: lang }),
      user: userEmail,
      requestId,
    })

    console.log(`[v0] Fetching data for user: ${userEmail}, UNIQUEID: ${userId}`)

    const transactionLimit = getTransactionLimit()
    const cutoffDate = getCutoffDate(transactionLimit)

    if (cutoffDate) {
      console.log(`[v0] Transaction limit enabled: ${transactionLimit.limitType} = ${transactionLimit.limitValue}`)
      console.log(`[v0] Cutoff date: ${cutoffDate.toISOString()}`)
    }

    if (!userEmail && !userId) {
      return NextResponse.json({ error: "User email or ID is required" }, { status: 400 })
    }

    const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
    const spreadsheetId = process.env.SPREADSHEET_ID

    if (!credentials) {
      console.error("[v0] Missing GOOGLE_APPLICATION_CREDENTIALS_JSON")
      return NextResponse.json({ error: "Server configuration error: Missing credentials" }, { status: 500 })
    }

    if (!spreadsheetId) {
      console.error("[v0] Missing SPREADSHEET_ID")
      return NextResponse.json({ error: "Server configuration error: Missing spreadsheet ID" }, { status: 500 })
    }

    const tempFilePath = join(os.tmpdir(), "google-credentials.json")
    writeFileSync(tempFilePath, credentials)

    const auth = new google.auth.GoogleAuth({
      keyFile: tempFilePath,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    })

    const sheets = google.sheets({ version: "v4", auth })

    console.log("Fetching Percentages table first")
    let percentagesMap = new Map<string, number>()

    try {
      const percentagesResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "Percentages!A:D",
      })

      const percentagesData = percentagesResponse.data.values || []
      percentagesMap = processPercentages(percentagesData)
      console.log("Percentages map:", Object.fromEntries(percentagesMap))
    } catch (error) {
      console.error("Error fetching percentages data:", error)
      console.log("Will proceed with hardcoded percentage adjustments")
      percentagesMap = getHardcodedPercentages()
    }

    console.log("Fetching Machines table")
    let machinesMap = new Map<string, string>()

    try {
      const machinesResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "Machines!A:G",
      })

      const machinesData = machinesResponse.data.values || []
      machinesMap = processMachines(machinesData)
      console.log("Machines map:", Object.fromEntries(machinesMap))
    } catch (error) {
      console.error("Error fetching machines data:", error)
      console.log("Will proceed without machine ID mapping")
    }

    console.log("Fetching Donors table")
    let donorsMap = new Map<string, string>()

    try {
      const donorsResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "Donors!A:F",
      })

      const donorsData = donorsResponse.data.values || []
      donorsMap = processDonors(donorsData)
      console.log("Donors map:", Object.fromEntries(donorsMap))
    } catch (error) {
      console.error("Error fetching donors data:", error)
      console.log("Will proceed without donor name mapping")
    }

    const [
      currentTransactionsResponse,
      transactions2024Response,
      oldTransactionsResponse,
      donationsResponse,
      machineRentalsResponse,
      linksAndPhoneResponse,
    ] = await Promise.allSettled([
      sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "Money!A:M",
      }),
      sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "Money_2024!A:M",
      }),
      sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "Money_Old!A:M",
      }),
      sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "Donations!A:F",
      }),
      sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "Machine Records!A:G",
      }),
      sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "LinksandPhone!A:N", // 👈 add this
      }),
    ])

    const responses = [
      currentTransactionsResponse,
      transactions2024Response,
      oldTransactionsResponse,
      donationsResponse,
      machineRentalsResponse,
      linksAndPhoneResponse,
    ]

    const currentTransactionsData = responses[0].status === "fulfilled" ? responses[0].value.data.values || [] : []
    const transactions2024Data = responses[1].status === "fulfilled" ? responses[1].value.data.values || [] : []
    const oldTransactionsData = responses[2].status === "fulfilled" ? responses[2].value.data.values || [] : []
    const donationsData = responses[3].status === "fulfilled" ? responses[3].value.data.values || [] : []
    const machineRentalsData = responses[4].status === "fulfilled" ? responses[4].value.data.values || [] : []
    const linksAndPhoneData = responses[5].status === "fulfilled" ? responses[5].value.data.values || [] : []

    const linksAndPhoneGrouped = processLinksTransactionsGrouped(linksAndPhoneData, userId, lang)

    const currentTransactions = [...processTransactions(currentTransactionsData, userId, percentagesMap)]
    const transactions2024 = processTransactions(transactions2024Data, userId, percentagesMap)
    const oldTransactions = processTransactions(oldTransactionsData, userId, percentagesMap)
    const donations = processDonations(donationsData, userId, donorsMap)
    const machineRentals = processMachineRentals(machineRentalsData, userId, machinesMap)

    console.log(`Found ${currentTransactions.length} current transactions (total)`)
    console.log(`Found ${transactions2024.length} transactions from 2024 (total)`)
    console.log(`Found ${oldTransactions.length} old transactions (total)`)
    console.log(`Found ${donations.length} donations (total)`)
    console.log(`Found ${machineRentals.length} machine rentals (total)`)

    const filteredCurrentTransactions = filterTransactionsByDate(currentTransactions, cutoffDate)
    const filteredTransactions2024 = filterTransactionsByDate(transactions2024, cutoffDate)
    const filteredOldTransactions = filterTransactionsByDate(oldTransactions, cutoffDate)
    const filteredDonations = filterTransactionsByDate(donations, cutoffDate)
    const filteredMachineRentals = filterTransactionsByDate(
      machineRentals.map((mr) => ({ ...mr, date: mr.rentalDate })),
      cutoffDate,
    ).map(({ date, ...rest }) => ({ ...rest, rentalDate: date }))

    console.log(`Displaying ${filteredCurrentTransactions.length} current transactions (after filtering)`)
    console.log(`Displaying ${filteredTransactions2024.length} transactions from 2024 (after filtering)`)
    console.log(`Displaying ${filteredOldTransactions.length} old transactions (after filtering)`)
    console.log(`Displaying ${filteredDonations.length} donations (after filtering)`)
    console.log(`Displaying ${filteredMachineRentals.length} machine rentals (after filtering)`)

    const customerData: CustomerData = {
      id: userId,
      // Full data for total calculations
      currentTransactions: currentTransactions,
      transactions2024: transactions2024,
      oldTransactions: oldTransactions,
      donations: donations,
      machineRentals: machineRentals,
      linksAndPhoneTransactions: linksAndPhoneGrouped.flatMap((t) => t.details || []),
      // Filtered data for display
      displayCurrentTransactions: filteredCurrentTransactions,
      displayTransactions2024: filteredTransactions2024,
      displayOldTransactions: filteredOldTransactions,
      displayDonations: filteredDonations,
      displayMachineRentals: filteredMachineRentals,
    }

    await writeLogToSheet({
      timestamp: new Date().toISOString(),
      level: "INFO",
      event: "DATA_FETCH_SUCCESS",
      message: `Customer data fetched successfully for user: ${userEmail}`,
      metadata: JSON.stringify({
        userId,
        currentTransactions: currentTransactions.length,
        transactions2024: transactions2024.length,
        oldTransactions: oldTransactions.length,
        donations: donations.length,
        machineRentals: machineRentals.length,
      }),
      user: userEmail,
      requestId,
    })

    return NextResponse.json(customerData)
  } catch (error) {
    await writeLogToSheet({
      timestamp: new Date().toISOString(),
      level: "ERROR",
      event: "DATA_FETCH_ERROR",
      message: "Failed to fetch customer data",
      metadata: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      requestId,
    })

    console.error("[v0] Error fetching customer data:", error)

    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred"

    return NextResponse.json(
      {
        error: "Failed to fetch customer data",
        details: errorMessage,
      },
      { status: 500 },
    )
  }
}
