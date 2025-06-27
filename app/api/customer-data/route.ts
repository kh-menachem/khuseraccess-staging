import { type NextRequest, NextResponse } from "next/server"
import { google } from "googleapis"

// Initialize Google Sheets API
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
})

const sheets = google.sheets({ version: "v4", auth })

export async function POST(request: NextRequest) {
  try {
    const { userEmail, userId } = await request.json()

    if (!userEmail && !userId) {
      return NextResponse.json({ error: "User email or ID is required" }, { status: 400 })
    }

    const spreadsheetId = process.env.SPREADSHEET_ID
    if (!spreadsheetId) {
      return NextResponse.json({ error: "Spreadsheet ID not configured" }, { status: 500 })
    }

    // Get all sheet names first
    const spreadsheetResponse = await sheets.spreadsheets.get({
      spreadsheetId,
    })

    const sheetNames = spreadsheetResponse.data.sheets?.map((sheet) => sheet.properties?.title).filter(Boolean) || []

    // Find user in People sheet
    let userRow = null
    let userAccountNumber = null

    try {
      const peopleResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "People!A:Z",
      })

      const peopleRows = peopleResponse.data.values || []

      if (peopleRows.length > 0) {
        const headers = peopleRows[0]
        const emailIndex = headers.findIndex((h: string) => h?.toLowerCase().includes("email"))
        const accountIndex = headers.findIndex((h: string) => h?.toLowerCase().includes("account"))
        const firstNameIndex = headers.findIndex((h: string) => h?.toLowerCase().includes("first"))
        const lastNameIndex = headers.findIndex((h: string) => h?.toLowerCase().includes("last"))

        // Search by email or userId (account number)
        for (let i = 1; i < peopleRows.length; i++) {
          const row = peopleRows[i]
          const rowEmail = row[emailIndex]?.toString().toLowerCase().trim()
          const rowAccount = row[accountIndex]?.toString().trim()

          if ((userEmail && rowEmail === userEmail.toLowerCase().trim()) || (userId && rowAccount === userId)) {
            userRow = row
            userAccountNumber = rowAccount
            break
          }
        }
      }
    } catch (error) {
      console.error("Error fetching People sheet:", error)
    }

    if (!userRow || !userAccountNumber) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Initialize data structure
    const customerData = {
      currentTransactions: [],
      transactions2024: [],
      oldTransactions: [],
      donations: [],
      machineRentals: [],
    }

    // Helper function to process transaction sheets
    const processTransactionSheet = async (sheetName: string, targetArray: any[]) => {
      try {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${sheetName}!A:Z`,
        })

        const rows = response.data.values || []
        if (rows.length === 0) return

        const headers = rows[0]
        const accountIndex = headers.findIndex(
          (h: string) => h?.toLowerCase().includes("account") || h?.toLowerCase().includes("id"),
        )

        if (accountIndex === -1) return

        // Find matching transactions
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i]
          const rowAccount = row[accountIndex]?.toString().trim()

          if (rowAccount === userAccountNumber) {
            const transaction = {
              id: `${sheetName}-${i}`,
              date: row[headers.findIndex((h: string) => h?.toLowerCase().includes("date"))] || "",
              description:
                row[
                  headers.findIndex(
                    (h: string) => h?.toLowerCase().includes("description") || h?.toLowerCase().includes("note"),
                  )
                ] || "",
              reference:
                row[
                  headers.findIndex(
                    (h: string) => h?.toLowerCase().includes("reference") || h?.toLowerCase().includes("ref"),
                  )
                ] || "",
              amount: Number.parseFloat(
                row[headers.findIndex((h: string) => h?.toLowerCase().includes("amount"))] || "0",
              ),
              net: Number.parseFloat(
                row[headers.findIndex((h: string) => h?.toLowerCase().includes("net"))] ||
                  row[headers.findIndex((h: string) => h?.toLowerCase().includes("amount"))] ||
                  "0",
              ),
              type: row[headers.findIndex((h: string) => h?.toLowerCase().includes("type"))] || "Transaction",
              notCleared:
                row[
                  headers.findIndex(
                    (h: string) => h?.toLowerCase().includes("cleared") || h?.toLowerCase().includes("clear"),
                  )
                ] || "",
              cardknox: row[headers.findIndex((h: string) => h?.toLowerCase().includes("cardknox"))] || "",
            }
            targetArray.push(transaction)
          }
        }
      } catch (error) {
        console.error(`Error processing sheet ${sheetName}:`, error)
      }
    }

    // Helper function to process donation sheets
    const processDonationSheet = async (sheetName: string) => {
      try {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${sheetName}!A:Z`,
        })

        const rows = response.data.values || []
        if (rows.length === 0) return

        const headers = rows[0]
        const accountIndex = headers.findIndex(
          (h: string) => h?.toLowerCase().includes("account") || h?.toLowerCase().includes("id"),
        )

        if (accountIndex === -1) return

        // Find matching donations
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i]
          const rowAccount = row[accountIndex]?.toString().trim()

          if (rowAccount === userAccountNumber) {
            const donation = {
              id: `${sheetName}-${i}`,
              date: row[headers.findIndex((h: string) => h?.toLowerCase().includes("date"))] || "",
              donorName:
                row[
                  headers.findIndex(
                    (h: string) => h?.toLowerCase().includes("donor") || h?.toLowerCase().includes("name"),
                  )
                ] || "",
              donorId:
                row[
                  headers.findIndex(
                    (h: string) => h?.toLowerCase().includes("donor") && h?.toLowerCase().includes("id"),
                  )
                ] || "",
              amount: Number.parseFloat(
                row[headers.findIndex((h: string) => h?.toLowerCase().includes("amount"))] || "0",
              ),
              net: Number.parseFloat(
                row[headers.findIndex((h: string) => h?.toLowerCase().includes("net"))] ||
                  row[headers.findIndex((h: string) => h?.toLowerCase().includes("amount"))] ||
                  "0",
              ),
              type: "Donation",
              purpose:
                row[
                  headers.findIndex(
                    (h: string) => h?.toLowerCase().includes("purpose") || h?.toLowerCase().includes("category"),
                  )
                ] || "",
            }
            customerData.donations.push(donation)
          }
        }
      } catch (error) {
        console.error(`Error processing donation sheet ${sheetName}:`, error)
      }
    }

    // Process different types of sheets
    for (const sheetName of sheetNames) {
      const lowerSheetName = sheetName.toLowerCase()

      if (lowerSheetName.includes("current") && lowerSheetName.includes("transaction")) {
        await processTransactionSheet(sheetName, customerData.currentTransactions)
      } else if (lowerSheetName.includes("2024") && lowerSheetName.includes("transaction")) {
        await processTransactionSheet(sheetName, customerData.transactions2024)
      } else if (lowerSheetName.includes("old") && lowerSheetName.includes("transaction")) {
        await processTransactionSheet(sheetName, customerData.oldTransactions)
      } else if (lowerSheetName.includes("donation")) {
        await processDonationSheet(sheetName)
      } else if (lowerSheetName.includes("machine") && lowerSheetName.includes("rental")) {
        await processTransactionSheet(sheetName, customerData.machineRentals)
      }
    }

    // Sort all arrays by date (newest first)
    const sortByDate = (a: any, b: any) => {
      const dateA = new Date(a.date || "1900-01-01")
      const dateB = new Date(b.date || "1900-01-01")
      return dateB.getTime() - dateA.getTime()
    }

    customerData.currentTransactions.sort(sortByDate)
    customerData.transactions2024.sort(sortByDate)
    customerData.oldTransactions.sort(sortByDate)
    customerData.donations.sort(sortByDate)
    customerData.machineRentals.sort(sortByDate)

    return NextResponse.json({
      success: true,
      data: customerData,
    })
  } catch (error) {
    console.error("Error fetching customer data:", error)
    return NextResponse.json({ error: "Failed to fetch customer data" }, { status: 500 })
  }
}
