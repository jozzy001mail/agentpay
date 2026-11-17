#!/usr/bin/env node
/**
 * AgentPay MCP server — stdio transport.
 *
 * Exposes five tools:
 *   create_invoice   — builds unsigned createInvoice calldata
 *   get_invoice      — reads an invoice from the chain
 *   list_invoices    — reads InvoiceCreated events, optionally filtered by merchant
 *   pay_invoice      — builds unsigned approve + pay calldata
 *   release_invoice  — builds unsigned release calldata
 *
 * No private keys are accepted, stored or returned. Write tools return unsigned
 * calldata for the caller's wallet to sign and broadcast.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { ethers } from "ethers";
import { config } from "./config.js";
import { ESCROW_ABI, ERC20_ABI, STATUS_LABELS } from "./abi.js";

// ─── Provider (read-only) ────────────────────────────────────────────────────

function getProvider(): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(config.rpcUrl);
}

function getEscrowContract(provider: ethers.Provider): ethers.Contract {
  return new ethers.Contract(config.escrowAddress, ESCROW_ABI, provider);
}

// ─── Tool definitions ────────────────────────────────────────────────────────

const TOOLS: Tool[] = [
  {
    name: "create_invoice",
    description:
      "Build unsigned calldata to create a new payment invoice in the AgentPay escrow. " +
      "Returns calldata for the merchant's wallet to sign — no funds move yet. " +
      "REQUIRES user confirmation before sending.",
    inputSchema: {
      type: "object",
      properties: {
        token: {
          type: "string",
          description: "ERC20 token address (use the MockUSD address for the demo)",
        },
        amount: {
          type: "string",
          description: "Amount in token smallest units (e.g. '25000000' for 25 MUSD at 6 decimals)",
        },
        merchant: {
          type: "string",
          description: "Merchant wallet address (the address that can release or refund)",
        },
        expirySeconds: {
          type: "number",
          description: "Seconds from now until the invoice expires (e.g. 86400 for 24 h)",
        },
      },
      required: ["token", "amount", "merchant", "expirySeconds"],
    },
  },
  {
    name: "get_invoice",
    description:
      "Read a single invoice from the chain by ID. Returns status, amount, payer and expiry. Safe to auto-approve.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "number", description: "Invoice ID (0-indexed)" },
      },
      required: ["id"],
    },
  },
  {
    name: "list_invoices",
    description:
      "List all invoices from InvoiceCreated events. Optionally filter by merchant address. Safe to auto-approve.",
    inputSchema: {
      type: "object",
      properties: {
        merchant: {
          type: "string",
          description: "Optional: filter to invoices created by this merchant address",
        },
      },
      required: [],
    },
  },
  {
    name: "pay_invoice",
    description:
      "Build unsigned calldata to pay an invoice. Returns two calldata items: " +
      "1) approve the escrow to spend the token, 2) call pay(). " +
      "REQUIRES user confirmation before sending. The payer must have sufficient token balance.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "number", description: "Invoice ID to pay" },
      },
      required: ["id"],
    },
  },
  {
    name: "release_invoice",
    description:
      "Build unsigned calldata for the merchant to release escrowed funds to their payout address. " +
      "REQUIRES user confirmation. Only the merchant wallet can call this.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "number", description: "Invoice ID to release (must be in PAID status)" },
      },
      required: ["id"],
    },
  },
];

// ─── Tool implementations ────────────────────────────────────────────────────

async function handleCreateInvoice(args: {
  token: string;
  amount: string;
  merchant: string;
  expirySeconds: number;
}): Promise<string> {
  const expiry = Math.floor(Date.now() / 1000) + args.expirySeconds;
  const iface = new ethers.Interface(ESCROW_ABI);
  const calldata = iface.encodeFunctionData("createInvoice", [
    args.token,
    BigInt(args.amount),
    args.merchant,
    BigInt(expiry),
  ]);

  const summary = [
    "⚠️  CONFIRMATION REQUIRED — on-chain action",
    "",
    "Action:    createInvoice",
    `Token:     ${args.token}`,
    `Amount:    ${args.amount} (smallest units)`,
    `Merchant:  ${args.merchant}`,
    `Expiry:    ${new Date(expiry * 1000).toISOString()} (${args.expirySeconds}s from now)`,
    "",
    "To:        " + config.escrowAddress,
    "Calldata:  " + calldata,
    "",
    "Send this calldata from the merchant wallet to create the invoice.",
  ].join("\n");

  return summary;
}

async function handleGetInvoice(args: { id: number }): Promise<string> {
  const provider = getProvider();
  const escrow = getEscrowContract(provider);

  let inv: { token: string; merchant: string; payer: string; amount: bigint; expiry: bigint; status: number };
  try {
    inv = await escrow.getInvoice(BigInt(args.id));
  } catch {
    return `Invoice ${args.id} not found.`;
  }

  const status = STATUS_LABELS[inv.status] ?? `UNKNOWN(${inv.status})`;
  const expiryDate = new Date(Number(inv.expiry) * 1000).toISOString();

  return [
    `Invoice #${args.id}`,
    `  Status:   ${status}`,
    `  Token:    ${inv.token}`,
    `  Amount:   ${inv.amount.toString()} (smallest units)`,
    `  Merchant: ${inv.merchant}`,
    `  Payer:    ${inv.payer === ethers.ZeroAddress ? "(not yet paid)" : inv.payer}`,
    `  Expiry:   ${expiryDate}`,
  ].join("\n");
}

async function handleListInvoices(args: { merchant?: string }): Promise<string> {
  const provider = getProvider();
  const escrow = getEscrowContract(provider);

  const filter = escrow.filters.InvoiceCreated(
    null,
    null,
    args.merchant ?? null
  );

  let events: ethers.EventLog[];
  try {
    const raw = await escrow.queryFilter(filter);
    events = raw.filter((e): e is ethers.EventLog => e instanceof ethers.EventLog);
  } catch {
    return "Could not fetch invoice events. Check RPC URL and contract address.";
  }

  if (events.length === 0) {
    return args.merchant
      ? `No invoices found for merchant ${args.merchant}.`
      : "No invoices found.";
  }

  const lines = events.map((ev) => {
    const [id, token, merchant, amount, expiry] = ev.args;
    return (
      `#${id.toString().padEnd(4)} ` +
      `amount=${amount.toString().padEnd(14)} ` +
      `merchant=${merchant} ` +
      `token=${token} ` +
      `expiry=${new Date(Number(expiry) * 1000).toISOString()}`
    );
  });

  return [`Found ${events.length} invoice(s):`, ...lines].join("\n");
}

async function handlePayInvoice(args: { id: number }): Promise<string> {
  const provider = getProvider();
  const escrow = getEscrowContract(provider);

  let inv: { token: string; merchant: string; payer: string; amount: bigint; expiry: bigint; status: number };
  try {
    inv = await escrow.getInvoice(BigInt(args.id));
  } catch {
    return `Invoice ${args.id} not found.`;
  }

  if (inv.status !== 0) {
    const status = STATUS_LABELS[inv.status] ?? `${inv.status}`;
    return `Invoice ${args.id} is in status ${status} and cannot be paid.`;
  }

  const erc20Iface = new ethers.Interface(ERC20_ABI);
  const approveCalldata = erc20Iface.encodeFunctionData("approve", [
    config.escrowAddress,
    inv.amount,
  ]);

  const escrowIface = new ethers.Interface(ESCROW_ABI);
  const payCalldata = escrowIface.encodeFunctionData("pay", [BigInt(args.id)]);

  const expiryDate = new Date(Number(inv.expiry) * 1000).toISOString();

  return [
    "⚠️  CONFIRMATION REQUIRED — on-chain action (2 transactions)",
    "",
    `Action:    Pay invoice #${args.id}`,
    `Token:     ${inv.token}`,
    `Amount:    ${inv.amount.toString()} (smallest units)`,
    `Merchant:  ${inv.merchant}`,
    `Expiry:    ${expiryDate}`,
    "",
    "Step 1 — Approve the escrow to spend your tokens:",
    `  To:       ${inv.token}`,
    `  Calldata: ${approveCalldata}`,
    "",
    "Step 2 — Pay the invoice:",
    `  To:       ${config.escrowAddress}`,
    `  Calldata: ${payCalldata}`,
    "",
    "Send both from the payer wallet in order.",
  ].join("\n");
}

async function handleReleaseInvoice(args: { id: number }): Promise<string> {
  const provider = getProvider();
  const escrow = getEscrowContract(provider);

  let inv: { token: string; merchant: string; payer: string; amount: bigint; expiry: bigint; status: number };
  try {
    inv = await escrow.getInvoice(BigInt(args.id));
  } catch {
    return `Invoice ${args.id} not found.`;
  }

  if (inv.status !== 1) {
    const status = STATUS_LABELS[inv.status] ?? `${inv.status}`;
    return `Invoice ${args.id} is in status ${status} and cannot be released (must be PAID).`;
  }

  const iface = new ethers.Interface(ESCROW_ABI);
  const calldata = iface.encodeFunctionData("release", [BigInt(args.id)]);

  return [
    "⚠️  CONFIRMATION REQUIRED — on-chain action",
    "",
    `Action:    release invoice #${args.id}`,
    `Token:     ${inv.token}`,
    `Amount:    ${inv.amount.toString()} (smallest units) → sent to merchant`,
    `Merchant:  ${inv.merchant}`,
    `Payer:     ${inv.payer}`,
    "",
    "To:        " + config.escrowAddress,
    "Calldata:  " + calldata,
    "",
    "Send from the merchant wallet to release the funds.",
  ].join("\n");
}

// ─── Server setup ────────────────────────────────────────────────────────────

const server = new Server(
  { name: "agentpay-mcp-server", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  try {
    let text: string;

    switch (name) {
      case "create_invoice":
        text = await handleCreateInvoice(args as Parameters<typeof handleCreateInvoice>[0]);
        break;
      case "get_invoice":
        text = await handleGetInvoice(args as Parameters<typeof handleGetInvoice>[0]);
        break;
      case "list_invoices":
        text = await handleListInvoices(args as Parameters<typeof handleListInvoices>[0]);
        break;
      case "pay_invoice":
        text = await handlePayInvoice(args as Parameters<typeof handlePayInvoice>[0]);
        break;
      case "release_invoice":
        text = await handleReleaseInvoice(args as Parameters<typeof handleReleaseInvoice>[0]);
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return { content: [{ type: "text", text }] };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: "text", text: `Error: ${message}` }],
      isError: true,
    };
  }
});

// ─── Entry point ─────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Server runs until the process is killed; writes nothing to stdout
  // (stdout is reserved for MCP protocol messages).
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
