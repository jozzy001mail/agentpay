import type { InvoiceStatus } from './abi'

export interface Invoice {
  id: number
  token: string
  merchant: string
  payer: string
  amount: bigint
  expiry: bigint
  status: InvoiceStatus
}

/** Chat message role. */
export type Role = 'user' | 'agent'

export interface ChatMessage {
  role: Role
  text: string
  /** If the agent is waiting for confirmation before an on-chain action. */
  pendingAction?: PendingAction
}

export type ActionKind = 'create_invoice' | 'pay_invoice' | 'release_invoice' | 'refund_invoice'

export interface PendingAction {
  kind: ActionKind
  summary: string
  /** Parsed details to show to the user before they confirm. */
  details: Record<string, string>
}
