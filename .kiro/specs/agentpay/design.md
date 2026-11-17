# AgentPay — Design

## Overview

AgentPay is one app made of four stitched-together pieces (Frankenstein):

1. **React merchant dashboard** (Vite + TypeScript + ethers v6) — the shop
   owner's screen: create invoices, see statuses, release/refund, share link + QR.
2. **Foundry Solidity escrow** (`AgentPayEscrow`) — the money layer. Invoices
   are on-chain escrow records; the contract holds stablecoin until release or
   refund. No admin can touch funds.
3. **MCP server** (Node + TypeScript, Model Context Protocol SDK, stdio) —
   exposes the escrow as tools: create_invoice, get_invoice, list_invoices,
   pay_invoice, release_invoice. Kiro loads it from `.kiro/settings/mcp.json`.
4. **In-app AI agent chat** — a chat panel in the dashboard that calls the same
   MCP tools, so a shop owner can say "create a $25 invoice for 2kg of rice"
   and confirm the result in plain English.

## Architecture

```
┌───────────────────────────── React dashboard (app/) ─────────────────────────────┐
│  Invoice form · Invoice list · Share link + QR · Agent chat panel              │
│  ethers v6 (wallet signing) · fetch (read-only chain reads via public RPC)      │
└──────┬───────────────────────────────┬──────────────────────────────────────────┘
       │ MCP tools (stdio)             │ ethers: direct contract calls
       ▼                               ▼
┌──────────────────┐          ┌─────────────────────────────────────────┐
│  MCP server      │          │  AgentPayEscrow (Solidity, Foundry)   │
│  (mcp-server/)   │ reads    │  createInvoice / pay / release /      │
│  create/get/list │─────────▶│  refund · InvoiceCreated/Paid/        │
│  /pay/release    │          │  Released/Refunded events             │
└──────────────────┘          └──────────────────┬──────────────────────┘
                                                 │ ERC20 (MockUSD on testnet)
                                                 ▼
                                        BSC testnet (chain 97)
                                        MockUSD (6 decimals, mintable
                                        for demo) + escrow deployment
```

Kiro surfaces used: Kiro CLI (implementation agent), spec-driven development
(requirements → design → tasks in `.kiro/specs/agentpay/`), steering
(`.kiro/steering/`), agent hooks (`.kiro/hooks/`), MCP (`.kiro/settings/mcp.json`
+ the AgentPay MCP server itself), and property-based tests for the escrow
state machine.

## Contract design

`AgentPayEscrow.sol`:

```solidity
struct Invoice {
    address token;      // ERC20 stablecoin
    address merchant;   // who can release / refund
    address payer;      // set on pay
    uint256 amount;     // token smallest units
    uint256 expiry;     // unix seconds
    Status status;      // CREATED, PAID, RELEASED, REFUNDED
}

function createInvoice(address token, uint256 amount, address merchant, uint256 expiry) returns (uint256 id)
function pay(uint256 id)            // pulls amount via transferFrom, marks PAID
function release(uint256 id)        // merchant only, PAID -> RELEASED, pays merchant
function refund(uint256 id)         // merchant anytime when PAID; anyone after expiry when PAID
```

- `ReentrancyGuard` on pay/release/refund. Checks-effects-interactions order.
- `MAX_INVOICE_AMOUNT = 10_000 * 10**6` (10,000 units at 6 decimals).
- Events: `InvoiceCreated(id, token, merchant, amount, expiry)`,
  `InvoicePaid(id, payer)`, `InvoiceReleased(id, merchant, amount)`,
  `InvoiceRefunded(id, payer, amount)`.
- No owner, no upgrade, no withdrawal function. Escrow balance invariant:
  `token.balanceOf(escrow) == sum(amount of PAID invoices)`.

`MockUSD.sol` (test helper + demo deployment only): ERC20, 6 decimals,
`mint(address, uint256)` restricted to a deployer-held minter for demo funding.
Never deployed to mainnet.

## MCP server design

- Runtime: Node 22, TypeScript, `@modelcontextprotocol/sdk`, stdio transport.
- Tools:
  - `create_invoice { token, amount, merchant, expirySeconds }` → returns the
    unsigned `createInvoice` calldata + a human summary; the dashboard or Kiro
    asks the wallet to sign it.
  - `get_invoice { id }` → invoice fields + status.
  - `list_invoices { merchant? }` → invoices from `InvoiceCreated`/`InvoicePaid`
    events via public RPC.
  - `pay_invoice { id }` → unsigned `pay` calldata (payer must approve the
    token spend first; the tool returns the approve calldata too).
  - `release_invoice { id }` → unsigned `release` calldata.
- Config: contract address + RPC URL from environment (`AGENTPAY_RPC_URL`,
  `AGENTPAY_ESCROW_ADDRESS`); defaults point at the BSC testnet deployment.
- No private keys anywhere. No network listener (stdio only).

## Dashboard design

- Pages (single-page app, no router needed): Dashboard (invoice list),
  Create invoice form, Invoice detail (status, share link, QR, Release/Refund
  buttons), Agent chat panel (always visible on the right on desktop).
- Wallet: injected provider (MetaMask) via ethers `BrowserProvider`; read-only
  mode works without a wallet (public RPC).
- QR: `qrcode` package, encodes the payment link
  `https://<demo>/pay/<invoiceId>`.
- Demo mode toggle: uses MockUSD + a clearly labelled simulated pay button
  that funds and pays with a throwaway demo flow; every demo step is labelled
  "DEMO — no real funds".
- Styling: plain CSS, dark "Frankenstein lab" green-on-black accent theme
  (spooky but readable; this is a finance tool first).

## Agent chat design

- The chat panel sends the user's message plus the MCP tool list to the model
  (via the dashboard's own backend-less call: it reuses the MCP server through
  Kiro's agent when built in Kiro, and in the shipped app it calls a small
  in-browser intent parser + the MCP tools over a local bridge).
- Simpler, honest design for the MVP: the chat panel is a guided intent parser
  backed by the MCP tools — it recognises create-invoice, status-check and
  release/refund intents, shows the parsed tool call, and waits for the user's
  confirm click before executing. No LLM API key is required in the shipped
  app; when the user runs it inside Kiro, the full Kiro agent can drive the
  same tools conversationally.
- Every money-moving proposal shows amount, token, recipient and expiry, and
  waits for explicit confirmation.

## Testnet choice

- **BSC testnet (chain 97)**. Reasons: the builder's wallet is BSC-native;
  the public testnet faucet is address-only (no account); block times are fast.
- Deployments: `MockUSD` + `AgentPayEscrow`, verified on the testnet explorer.
- Fallback for judges with no testnet funds: demo mode (simulated, labelled)
  and a local Anvil fork (`anvil` + deploy script) for a fully offline run.

## Testing

- Foundry: unit tests for every function + revert path; fuzz test on
  `createInvoice` amounts/expiries; invariant test on the escrow balance.
- Kiro property-based tests: escrow state machine (no illegal transitions,
  release only by merchant, refund only to payer).
- npm: MCP tool tests with a mocked provider; dashboard form-validation tests.
- CI: GitHub Actions runs `forge test` + `npm test` on push.

## Security notes (stated honestly)

- Escrow is non-custodial: only the merchant can release, only the payer gets
  a refund, no admin withdrawal.
- The contract is unaudited testnet code — the README says so plainly.
- The dashboard never asks for a seed phrase or private key.
- MockUSD is a demo token with no value.
