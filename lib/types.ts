export interface CustomerData {
  id: string
  currentTransactions: Transaction[]
  transactions2024: Transaction[]
  oldTransactions: Transaction[]
  donations: Donation[]
  machineRentals: MachineRental[]
}

export interface Transaction {
  id: string
  date: string
  description: string
  reference: string
  amount: number
  net: number // Add computed net value
  type: string
  notCleared?: string
  cardknox?: string
}

export interface Donation {
  id: string
  date: string
  donorId: string
  donorName: string
  purpose: string
  amount: number
  net: number // Add computed net value
  type: string // Add type field
}

export interface MachineRental {
  id: string
  machineId: string
  rentalDate: string
  returnDate: string | null
  status: string
  fee: number
}
