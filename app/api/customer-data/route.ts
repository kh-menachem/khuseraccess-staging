import { type NextRequest, NextResponse } from "next/server"
import { google } from "googleapis"
import type { CustomerData, Transaction, Donation, MachineRental } from "@/lib/types"
import { writeFileSync, unlinkSync } from "fs"
import { join } from "path"
import * as os from "os"

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

  const personIndex = headerRow.findIndex(
    (header: string) =>
      header?.toLowerCase().trim() === "person" ||
      header?.toLowerCase().trim() === "personid" ||
      header?.toLowerCase().trim() === "person id",
  )

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
        netAmount = originalAmount * multiplier

        console.log(
          `Applied multiplier ${multiplier} to amount for type ${transactionType}: ${originalAmount} -> ${netAmount.toFixed(2)}`,
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
      id: row[referenceIndex] || `TX-${index}`,
      date: dateIndex !== -1 ? row[dateIndex] || "" : "",
      description: description,
      reference: referenceIndex !== -1 ? row[referenceIndex] || "" : "",
      amount: originalAmount,
      net: netAmount,
      type: transactionType || "Unknown",
      notCleared: notClearedIndex !== -1 ? row[notClearedIndex] || "" : "",
      cardknox: cardknoxValue,
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

interface TransactionDetail {
  date: string
  name: string
  amount: number
  net: number
  description: string
  source: string
}

function processLinksTransactionsGrouped(rows: string[][], userId: string, language: string): Transaction[] {
  if (rows.length === 0) return []

  const hdr = rows[0].map((h: string) => h.toLowerCase().trim())

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
    .filter((r: string[]) => r[iPerson]?.trim() === userId)
    .filter((r: string[]) => r[iResult]?.trim() === "Approved")
    .filter((r: string[]) => !["CC:Save", "Check:Adjust"].includes(r[iType]?.trim()))
    .map((r: string[], index: number) => {
      const date = r[iDate]
      const yearMonth = date.slice(0, 7)
      const amt = Number.parseFloat(r[iAmount].replace(/[$,]/g, "")) || 0
      const type = r[iType]?.trim()
      let net = 0
      switch (type) {
        case "CC:Sale":
          net = amt * 0.965
          break
        case "Grant:Recommendation":
          net = amt * 0.965
          break
        case "CC:Refund":
          net = -amt
          break
        case "Check:Sale":
          net = amt * 0.9985
          break
        default:
          net = 0
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
  const grouped = new Map<string, Transaction & { details?: TransactionDetail[] }>()
  for (const d of details) {
    const key = d.yearMonth
    if (!grouped.has(key)) {
      grouped.set(key, {
        id: `LINKS-${key}`,
        date: new Date(`${key}-01T00:00:00Z`).toISOString(),
        description: getMonthName(key, language),
        reference: "",
        amount: 0,
        net: 0,
        type: language === "he" ? "תרומות קישורים / טלפון" : "Links/Phone Donations",
        notCleared: language === "he" ? "זמין" : "Cleared",
        details: [],
      })
    }

    const tx = grouped.get(key)!
    tx.amount += d.amount
    tx.net += d.net
    tx.date = new Date(`${key}-01T00:00:00Z`).toISOString()
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
  let tempFilePath: string | null = null

  try {
    const { userEmail, userId, language } = await request.json()
    const lang = language === "he" ? "he" : "en"
    console.log(`Fetching data for user: ${userEmail}, UNIQUEID: ${userId}`)

    if (!userEmail && !userId) {
      console.error("Missing required parameters: userEmail or userId")
      return NextResponse.json({ error: "User email or ID is required" }, { status: 400 })
    }

    const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
    if (!credentials) {
      console.error("Missing Google credentials")
      return NextResponse.json({ error: "Google credentials not configured" }, { status: 500 })
    }

    const spreadsheetId = process.env.SPREADSHEET_ID
    if (!spreadsheetId) {
      console.error("Missing spreadsheet ID")
      return NextResponse.json({ error: "Spreadsheet ID not configured" }, { status: 500 })
    }

    // Create temporary credentials file
    tempFilePath = join(os.tmpdir(), `google-credentials-${Date.now()}.json`)
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
        range: "Percentages!A:AQ",
      })

      const percentagesData = percentagesResponse.data.values || []
      percentagesMap = processPercentages(percentagesData)
      console.log("Percentages map loaded with", percentagesMap.size, "entries")
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
        range: "Machines!A:AQ",
      })

      const machinesData = machinesResponse.data.values || []
      machinesMap = processMachines(machinesData)
      console.log("Machines map loaded with", machinesMap.size, "entries")
    } catch (error) {
      console.error("Error fetching machines data:", error)
      console.log("Will proceed without machine ID mapping")
    }

    console.log("Fetching Donors table")
    let donorsMap = new Map<string, string>()

    try {
      const donorsResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "Donors!A:AQ",
      })

      const donorsData = donorsResponse.data.values || []
      donorsMap = processDonors(donorsData)
      console.log("Donors map loaded with", donorsMap.size, "entries")
    } catch (error) {
      console.error("Error fetching donors data:", error)
      console.log("Will proceed without donor name mapping")
    }

    console.log("Fetching all transaction sheets...")
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
        range: "Money!A:AQ",
      }),
      sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "Money_2024!A:AQ",
      }),
      sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "Money_Old!A:AQ",
      }),
      sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "Donations!A:AQ",
      }),
      sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "Machine Records!A:AQ",
      }),
      sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "LinksandPhone!A:AQ",
      }),
    ])

    // Process each response and log any errors
    const currentTransactionsData =
      currentTransactionsResponse.status === "fulfilled"
        ? currentTransactionsResponse.value.data.values || []
        : (console.error("Failed to fetch Money sheet:", currentTransactionsResponse.reason), [])

    const transactions2024Data =
      transactions2024Response.status === "fulfilled"
        ? transactions2024Response.value.data.values || []
        : (console.error("Failed to fetch Money_2024 sheet:", transactions2024Response.reason), [])

    const oldTransactionsData =
      oldTransactionsResponse.status === "fulfilled"
        ? oldTransactionsResponse.value.data.values || []
        : (console.error("Failed to fetch Money_Old sheet:", oldTransactionsResponse.reason), [])

    const donationsData =
      donationsResponse.status === "fulfilled"
        ? donationsResponse.value.data.values || []
        : (console.error("Failed to fetch Donations sheet:", donationsResponse.reason), [])

    const machineRentalsData =
      machineRentalsResponse.status === "fulfilled"
        ? machineRentalsResponse.value.data.values || []
        : (console.error("Failed to fetch Machine Records sheet:", machineRentalsResponse.reason), [])

    const linksAndPhoneData =
      linksAndPhoneResponse.status === "fulfilled"
        ? linksAndPhoneResponse.value.data.values || []
        : (console.error("Failed to fetch LinksandPhone sheet:", linksAndPhoneResponse.reason), [])

    console.log("Processing transaction data...")
    const linksAndPhoneGrouped = processLinksTransactionsGrouped(linksAndPhoneData, userId, lang)

    const currentTransactions = [
      ...processTransactions(currentTransactionsData, userId, percentagesMap),
      ...linksAndPhoneGrouped,
    ]
    const transactions2024 = processTransactions(transactions2024Data, userId, percentagesMap)
    const oldTransactions = processTransactions(oldTransactionsData, userId, percentagesMap)
    const donations = processDonations(donationsData, userId, donorsMap)
    const machineRentals = processMachineRentals(machineRentalsData, userId, machinesMap)

    console.log(`Processing complete:`)
    console.log(`- Current transactions: ${currentTransactions.length}`)
    console.log(`- 2024 transactions: ${transactions2024.length}`)
    console.log(`- Old transactions: ${oldTransactions.length}`)
    console.log(`- Donations: ${donations.length}`)
    console.log(`- Machine rentals: ${machineRentals.length}`)

    const customerData: CustomerData = {
      id: userId,
      currentTransactions,
      transactions2024,
      oldTransactions,
      donations,
      machineRentals,
    }

    console.log("Successfully returning customer data")
    return NextResponse.json(customerData)
  } catch (error) {
    console.error("Critical error in customer-data API:", error)

    // Return detailed error information instead of mock data
    return NextResponse.json(
      {
        error: "Failed to fetch customer data",
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  } finally {
    // Clean up temporary file
    if (tempFilePath) {
      try {
        unlinkSync(tempFilePath)
      } catch (cleanupError) {
        console.error("Failed to cleanup temp file:", cleanupError)
      }
    }
  }
}
