/**
 * ABI for AgentPayEscrow — only the fragments the dashboard needs.
 */

export const ESCROW_ABI = [
  {
    type: "function",
    name: "createInvoice",
    inputs: [
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "merchant", type: "address" },
      { name: "expiry", type: "uint256" },
    ],
    outputs: [{ name: "id", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "pay",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "release",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "refund",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getInvoice",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "token", type: "address" },
          { name: "merchant", type: "address" },
          { name: "payer", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "expiry", type: "uint256" },
          { name: "status", type: "uint8" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "invoiceCount",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "InvoiceCreated",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "token", type: "address", indexed: true },
      { name: "merchant", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "expiry", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "InvoicePaid",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "payer", type: "address", indexed: true },
    ],
  },
] as const;

export const ERC20_ABI = [
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
] as const;

/** Invoice status, mirroring the Solidity enum. */
export const InvoiceStatus = {
  CREATED: 0,
  PAID: 1,
  RELEASED: 2,
  REFUNDED: 3,
} as const

export type InvoiceStatus = typeof InvoiceStatus[keyof typeof InvoiceStatus]

export const STATUS_LABEL: Record<InvoiceStatus, string> = {
  [InvoiceStatus.CREATED]: "CREATED",
  [InvoiceStatus.PAID]: "PAID",
  [InvoiceStatus.RELEASED]: "RELEASED",
  [InvoiceStatus.REFUNDED]: "REFUNDED",
};
