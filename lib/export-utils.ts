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
