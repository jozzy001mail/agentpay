# AgentPay — stablecoin payment links for small businesses

**Kiroween 2026 — Frankenstein category.** A merchant creates a payment link,
a customer pays stablecoin into an on-chain escrow, and the merchant releases
the funds when the goods are delivered. Four technologies stitched into one
app: a React merchant dashboard, a Foundry Solidity escrow, an MCP server, and
an in-app AI agent the shop owner talks to in plain English.

Built by Joshua Owoade (jozzy001mail), Nigeria. Built with Kiro (CLI) using
spec-driven development — see `.kiro/specs/agentpay/` and `KIRO.md`.

## Status

✅ Implementation complete. All tests pass:
- `forge test` — 42 tests (unit, fuzz, invariant, PBT) green
- `npm test` (mcp-server) — 16 tests green
- `npm test` (app) — 40 tests green
- `npm run build` (app) — production build succeeds

## How it works

1. Merchant creates an invoice (amount, label, payout address) → escrow
   contract stores it as CREATED.
2. Merchant shares the payment link / QR.
3. Customer pays stablecoin → escrow pulls the tokens, invoice becomes PAID.
4. Merchant releases → funds go to the payout address. Or refunds → funds
   return to the payer. After expiry, anyone can trigger the refund.
5. No admin can touch the funds. No accounts, no KYC, no custody, no fees.

## Repo layout

- `contracts/` — Foundry: `AgentPayEscrow.sol` + `MockUSD.sol` (demo token)
- `app/` — React + Vite + TypeScript merchant dashboard
- `mcp-server/` — Node MCP server (stdio): `create_invoice`, `get_invoice`,
  `list_invoices`, `pay_invoice`, `release_invoice`
- `.kiro/` — specs, steering, hooks, MCP settings (committed, per Kiroween rules)

## Run it

```bash
# contracts
cd contracts && forge test

# dashboard
cd app && npm install && npm run dev

# MCP server
cd mcp-server && npm install && npm run build && node dist/index.js
```

Environment for the MCP server / dashboard: `AGENTPAY_RPC_URL`,
`AGENTPAY_ESCROW_ADDRESS`, `AGENTPAY_TOKEN_ADDRESS` (defaults: BSC testnet).

## Testnet

BSC testnet (chain 97). `MockUSD` is a demo token with no value. Deployments
are recorded in `deployments/bsc-testnet.json`.

## Honest notes

- The escrow is **unaudited testnet code**. Do not use it with real money.
- Demo mode is clearly labelled DEMO and uses simulated flows.
- The app never asks for a seed phrase or private key. Wallets sign; the MCP
  server only returns unsigned calldata.

## Licence

MIT — see `LICENSE`.
