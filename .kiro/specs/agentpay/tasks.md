# AgentPay — Tasks

Spec-driven implementation plan for Kiro CLI. Work through the tasks in order;
run the tests named in each task before marking it done. Requirements are in
`requirements.md`, architecture in `design.md`.

## 1. Project skeleton

- [x] 1.1 Initialise the Foundry project in `contracts/` (`foundry.toml`,
  `src/`, `test/`, `script/`). Verify `forge build` and `forge test` pass on
  the empty project.
- [x] 1.2 Scaffold the React app in `app/` (Vite + React + TypeScript,
  `npm install`, verify `npm run build` passes).
- [x] 1.3 Scaffold the MCP server in `mcp-server/` (Node + TypeScript,
  `@modelcontextprotocol/sdk`, `npm install`, verify `npm run build` passes).
- [x] 1.4 Add the MIT `LICENSE`, root `README.md`, root `AGENTS.md` and
  `.gitignore` (never ignore `.kiro/`).

## 2. Escrow contract (Foundry)

- [x] 2.1 Write `contracts/src/AgentPayEscrow.sol` per `design.md`:
  `createInvoice`, `pay`, `release`, `refund`, events, `ReentrancyGuard`,
  per-invoice cap, all revert checks. (REQ-C1–C6)
- [x] 2.2 Write `contracts/src/MockUSD.sol` (demo ERC20, 6 decimals, minter
  mint) — demo/testnet only, never mainnet.
- [x] 2.3 Write `contracts/test/AgentPayEscrow.t.sol`: unit tests for
  create/pay/release/refund, every revert path, expiry behaviour, and the
  merchant-only release rule. (REQ-T1)
- [x] 2.4 Write `contracts/test/AgentPayEscrowFuzz.t.sol`: fuzz amounts and
  expiries on `createInvoice`; invariant test that escrow balance equals the
  sum of PAID invoices. (REQ-T1)
- [x] 2.5 Add Kiro property-based tests for the escrow state machine
  (CREATED → PAID → RELEASED/REFUNDED; no illegal transitions; refund only
  to payer). Record any issue PBT catches that unit tests missed. (REQ-T2)
- [x] 2.6 Run `forge test` (unit + fuzz + invariant + PBT). All must pass.
  Write `contracts/script/Deploy.s.sol` (MockUSD + escrow, BSC testnet).

## 3. MCP server

- [x] 3.1 Implement `mcp-server/src/index.ts` (stdio transport) with tools
  `create_invoice`, `get_invoice`, `list_invoices`, `pay_invoice`,
  `release_invoice` per `design.md`. Read-only tools return data; write
  tools return unsigned calldata + a human summary. No keys. (REQ-M1–M3)
- [x] 3.2 Add `mcp-server/src/config.ts` (env: `AGENTPAY_RPC_URL`,
  `AGENTPAY_ESCROW_ADDRESS`, `AGENTPAY_TOKEN_ADDRESS`).
- [x] 3.3 Write `mcp-server/src/index.test.ts` (mocked provider): tool
  shapes, calldata correctness, and that no tool ever returns a private key.
  (REQ-T3)
- [x] 3.4 Run `npm test` in `mcp-server/`; all must pass. Verify Kiro loads
  the server from `.kiro/settings/mcp.json` and the five tools appear.

## 4. Merchant dashboard (React)

- [x] 4.1 Build the invoice form (amount, label, payout address) with
  validation; on submit it calls `createInvoice` through the user's wallet
  and shows the payment link + QR code. (REQ-D1, D4)
- [x] 4.2 Build the invoice list with status, amount, label, payer and
  expiry; read from contract events via public RPC. (REQ-D2)
- [x] 4.3 Build invoice detail with Release / Refund buttons, confirmation
  step, and the resulting transaction hash display. (REQ-D3)
- [x] 4.4 Add the demo-mode toggle: labelled simulated flow, no wallet
  needed, no real funds. (REQ-D5)
- [x] 4.5 Build the agent chat panel: intent parsing for create-invoice,
  status-check and release/refund; parsed tool call shown for confirmation
  before anything on-chain; amount/token/recipient/expiry always shown.
  (REQ-A1–A3)
- [x] 4.6 Write `app/src/*.test.*` for form validation and chat intent
  parsing. (REQ-T3)
- [x] 4.7 Run `npm test` and `npm run build` in `app/`; all must pass.

## 5. Wiring, deploy, docs

- [ ] 5.1 Deploy MockUSD + escrow to BSC testnet with the public faucet-funded
  deployer; verify on the testnet explorer; record addresses in
  `deployments/bsc-testnet.json` and in the README.
- [ ] 5.2 Point the dashboard and MCP server at the testnet deployment;
  end-to-end check: create → pay → release in the live demo.
- [ ] 5.3 Deploy the dashboard to Vercel (free Hobby, team Owoade); verify
  the live URL loads and demo mode works.
- [x] 5.4 Write `KIRO.md` (how Kiro was used: CLI, specs, steering, hooks,
  MCP, PBT — with concrete examples, no invented claims).
- [ ] 5.5 Final check: `forge test` + `npm test` (app + mcp-server) green;
  README accurate; `.kiro/` committed and not ignored; repo public with
  MIT licence.

## 6. Demo-filming fixes

Five issues found while filming the demo video, fixed in a single Kiro CLI session.

- [x] 6.1 **InvoiceList live mode** — `queryFilter` from block 0 hit the
  sepolia.base.org 200-block eth_getLogs cap (error -32614). First fixed with
  chunked ≤200-block windows, then refined to `invoiceCount()` +
  `getInvoice(i)` for i in 0..count-1: 1 + N RPC calls, no eth_getLogs at
  all, so it stays fast as the chain grows (Base Sepolia advances ~5
  blocks/sec).
- [x] 6.2 **Wrong links** — footer GitHub URL updated to
  `https://github.com/jozzy001mail/agentpay`; `appUrl` default updated to
  `https://agentpay-six-beryl.vercel.app`; transaction explorer links in
  `InvoiceDetail.tsx` and `InvoiceForm.tsx` changed from `testnet.bscscan.com`
  to `sepolia.basescan.org` (Base Sepolia explorer).
- [x] 6.3 **Stale chat greeting** — `AgentChat.tsx` initial greeting was set
  once in `useState` and never updated. Added a `useEffect` on `demoMode` that
  replaces message index 0 with the correct greeting for the current mode,
  preserving the rest of the conversation history.
- [x] 6.4 **SUBMISSION.md chat example** — "charge Ada 50 dollars for the cake"
  does not parse (no `invoice`/`create`/`make` keyword). Changed to the
  working example "create a $50 invoice for Ada's cake".
- [x] 6.5 **Test suites and build verified green** after all fixes.
