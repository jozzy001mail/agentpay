/**
 * Minimal ABI fragments for AgentPayEscrow and ERC20 approve.
 * We only include what the MCP tools actually need.
 */

export const ESCROW_ABI = [
  // createInvoice(address token, uint256 amount, address merchant, uint256 expiry) -> uint256
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
  // pay(uint256 id)
  {
    type: "function",
    name: "pay",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  // release(uint256 id)
  {
    type: "function",
    name: "release",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  // refund(uint256 id)
  {
    type: "function",
    name: "refund",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  // getInvoice(uint256 id) -> Invoice
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
  // invoiceCount() -> uint256
  {
    type: "function",
    name: "invoiceCount",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  // Events
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

/** Invoice status enum, matching the Solidity contract. */
export const STATUS_LABELS: Record<number, string> = {
  0: "CREATED",
  1: "PAID",
  2: "RELEASED",
  3: "REFUNDED",
};
