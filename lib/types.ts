export interface CustomerData {
  id: string
  currentTransactions: Transaction[]
  transactions2024: Transaction[]
  oldTransactions: Transaction[]
  donations: Donation[]
  machineRentals: MachineRental[]
  linksAndPhoneTransactions?: TransactionDetail[]
  displayCurrentTransactions?: Transaction[]
  displayTransactions2024?: Transaction[]
  displayOldTransactions?: Transaction[]
  displayDonations?: Donation[]
  displayMachineRentals?: MachineRental[]
}

export interface Transaction {
  id: string
  date: string
  description: string
  reference: string
  amount: number
  net: number
  type: string
  notCleared?: string
  cardknox?: string
  source?: string
  details?: TransactionDetail[]
}

export interface TransactionDetail {
  date: string
  name: string
  amount: number
  net: number
  description: string
  source: string
}

export interface Donation {
  id: string
  date: string
  donorId: string
  donorName: string
  purpose: string
  amount: number
  net: number
  type: string
}

export interface MachineRental {
  id: string
  machineId: string
  rentalDate: string
  returnDate: string | null
  status: string
  fee: number
}
