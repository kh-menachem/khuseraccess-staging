// Function to download CSV data
export function downloadCSV(csvContent: string, filename: string) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", filename)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}

// Helper function to format data for export
function formatDataForExport(customerData: any) {
  const allTransactions = [
    ...customerData.currentTransactions.map((tx: any) => ({
      ...tx,
      source: "Current",
    })),
    ...customerData.transactions2024.map((tx: any) => ({
      ...tx,
      source: "2024",
    })),
    ...customerData.oldTransactions.map((tx: any) => ({
      ...tx,
      source: "Historical",
    })),
    ...customerData.donations.map((donation: any) => ({
      id: donation.id,
      date: donation.date,
      description: donation.donorName,
      reference: donation.donorId,
      amount: donation.amount,
      net: donation.net,
      type: donation.type,
      source: "Donations",
    })),
  ]

  return allTransactions
}

// Export to Excel function
export function exportToExcel(customerData: any, customerName: string, accountNumber: string) {
  try {
    const transactions = formatDataForExport(customerData)

    // Create Excel-compatible content (tab-separated values)
    const headers = ["Date", "Type", "Description", "Amount", "Net", "Source"]
    const rows = transactions.map((tx: any) => [
      tx.date || "",
      tx.type || "",
      tx.description || "",
      tx.amount?.toFixed(2) || "0.00",
      tx.net?.toFixed(2) || "0.00",
      tx.source || "",
    ])

    const excelContent = [headers, ...rows].map((row) => row.join("\t")).join("\n")

    const blob = new Blob([excelContent], { type: "application/vnd.ms-excel" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)

    link.setAttribute("href", url)
    link.setAttribute("download", `${customerName}_${accountNumber}_transactions.xls`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error("Error exporting to Excel:", error)
  }
}

// Export to PDF function
export function exportToPDF(customerData: any, customerName: string, accountNumber: string) {
  try {
    const transactions = formatDataForExport(customerData)

    // Create HTML content for PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Transaction Report - ${customerName}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #20B2AA; text-align: center; }
          .header { text-align: center; margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; font-weight: bold; }
          .amount { text-align: right; }
          .positive { color: green; }
          .negative { color: red; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Keren Hatzedakah</h1>
          <h2>Transaction Report</h2>
          <p><strong>Customer:</strong> ${customerName}</p>
          <p><strong>Account:</strong> ${accountNumber}</p>
          <p><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Net</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            ${transactions
              .map(
                (tx: any) => `
              <tr>
                <td>${tx.date || ""}</td>
                <td>${tx.type || ""}</td>
                <td>${tx.description || ""}</td>
                <td class="amount">${tx.amount?.toFixed(2) || "0.00"}</td>
                <td class="amount ${(tx.net || 0) >= 0 ? "positive" : "negative"}">${tx.net?.toFixed(2) || "0.00"}</td>
                <td>${tx.source || ""}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      </body>
      </html>
    `

    // Open in new window and trigger print
    const printWindow = window.open("", "_blank")
    if (printWindow) {
      printWindow.document.write(htmlContent)
      printWindow.document.close()
      printWindow.focus()
      printWindow.print()
    } else {
      // Fallback: download as HTML file
      const blob = new Blob([htmlContent], { type: "text/html" })
      const link = document.createElement("a")
      const url = URL.createObjectURL(blob)

      link.setAttribute("href", url)
      link.setAttribute("download", `${customerName}_${accountNumber}_report.html`)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    }
  } catch (error) {
    console.error("Error exporting to PDF:", error)
  }
}
