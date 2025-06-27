export const transactionsToCSV = (transactions: any[]) => {
  const header = ["Date", "Description", "Reference", "Amount"]
  const rows = transactions.map((transaction) => [
    transaction.date,
    transaction.description,
    transaction.reference,
    transaction.amount.toFixed(2),
  ])

  return [header, ...rows].map((row) => row.join(",")).join("\n")
}

export const donationsToCSV = (donations: any[]) => {
  const header = ["Date", "Donor", "Purpose", "Amount"]
  const rows = donations.map((donation) => [
    donation.date,
    donation.donorName,
    donation.purpose,
    donation.amount.toFixed(2),
  ])

  return [header, ...rows].map((row) => row.join(",")).join("\n")
}

export const machineRentalsToCSV = (machineRentals: any[]) => {
  const header = ["Machine ID", "Rental Date", "Return Date", "Status", "Fee"]
  const rows = machineRentals.map((rental) => [
    rental.machineId,
    rental.rentalDate,
    rental.returnDate || "N/A",
    rental.status,
    rental.fee.toFixed(2),
  ])

  return [header, ...rows].map((row) => row.join(",")).join("\n")
}

export const downloadCSV = (csv: string, filename: string) => {
  const blob = new Blob([csv], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Excel export functionality
export const exportToExcel = (data: any[], filename: string, sheetName = "Sheet1") => {
  // Create a simple Excel-compatible format using CSV with tab separators
  let csvContent = ""

  if (data.length > 0) {
    // Get headers from the first object
    const headers = Object.keys(data[0])
    csvContent += headers.join("\t") + "\n"

    // Add data rows
    data.forEach((row) => {
      const values = headers.map((header) => {
        const value = row[header]
        // Handle different data types
        if (value === null || value === undefined) return ""
        if (typeof value === "string" && value.includes("\t")) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return String(value)
      })
      csvContent += values.join("\t") + "\n"
    })
  }

  // Create and download the file
  const blob = new Blob([csvContent], { type: "application/vnd.ms-excel" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename.endsWith(".xls") ? filename : `${filename}.xls`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// PDF export functionality
export const exportToPDF = (data: any[], filename: string, title = "Report") => {
  // Create a simple HTML table that can be printed as PDF
  let htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; text-align: center; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; font-weight: bold; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        @media print {
          body { margin: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <table>
  `

  if (data.length > 0) {
    // Add headers
    const headers = Object.keys(data[0])
    htmlContent += "<thead><tr>"
    headers.forEach((header) => {
      htmlContent += `<th>${header}</th>`
    })
    htmlContent += "</tr></thead><tbody>"

    // Add data rows
    data.forEach((row) => {
      htmlContent += "<tr>"
      headers.forEach((header) => {
        const value = row[header]
        htmlContent += `<td>${value !== null && value !== undefined ? String(value) : ""}</td>`
      })
      htmlContent += "</tr>"
    })
    htmlContent += "</tbody>"
  }

  htmlContent += `
      </table>
      <div class="no-print" style="margin-top: 20px; text-align: center;">
        <button onclick="window.print()" style="padding: 10px 20px; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Print PDF</button>
        <button onclick="window.close()" style="padding: 10px 20px; background-color: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 10px;">Close</button>
      </div>
    </body>
    </html>
  `

  // Open in new window for printing
  const printWindow = window.open("", "_blank")
  if (printWindow) {
    printWindow.document.write(htmlContent)
    printWindow.document.close()

    // Auto-trigger print dialog after a short delay
    setTimeout(() => {
      printWindow.print()
    }, 500)
  } else {
    // Fallback: create downloadable HTML file
    const blob = new Blob([htmlContent], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename.endsWith(".html") ? filename : `${filename}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
}

// Helper function to format data for different export types
export const formatDataForExport = (data: any[], type: "transactions" | "donations" | "machineRentals") => {
  switch (type) {
    case "transactions":
      return data.map((transaction) => ({
        Date: transaction.date,
        Description: transaction.description,
        Reference: transaction.reference,
        Amount: transaction.amount?.toFixed(2) || "0.00",
      }))

    case "donations":
      return data.map((donation) => ({
        Date: donation.date,
        Donor: donation.donorName,
        Purpose: donation.purpose,
        Amount: donation.amount?.toFixed(2) || "0.00",
      }))

    case "machineRentals":
      return data.map((rental) => ({
        "Machine ID": rental.machineId,
        "Rental Date": rental.rentalDate,
        "Return Date": rental.returnDate || "N/A",
        Status: rental.status,
        Fee: rental.fee?.toFixed(2) || "0.00",
      }))

    default:
      return data
  }
}
