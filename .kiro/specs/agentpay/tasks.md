# AgentPay — Tasks

Spec-driven implementation plan for Kiro CLI. Work through the tasks in order;
run the tests named in each task before marking it done. Requirements are in
`requirements.md`, architecture in `design.md`.

## 1. Project skeleton

- [ ] 1.1 Initialise the Foundry project in `contracts/` (`foundry.toml`,
  `src/`, `test/`, `script/`). Verify `forge build` and `forge test` pass on
  the empty project.
- [ ] 1.2 Scaffold the React app in `app/` (Vite + React + TypeScript,
  `npm install`, verify `npm run build` passes).
- [ ] 1.3 Scaffold the MCP server in `mcp-server/` (Node + TypeScript,
  `@modelcontextprotocol/sdk`, `npm install`, verify `npm run build` passes).
- [ ] 1.4 Add the MIT `LICENSE`, root `README.md`, root `AGENTS.md` and
  `.gitignore` (never ignore `.kiro/`).

## 2. Escrow contract (Foundry)

- [ ] 2.1 Write `contracts/src/AgentPayEscrow.sol` per `design.md`:
  `createInvoice`, `pay`, `release`, `refund`, events, `ReentrancyGuard`,
  per-invoice cap, all revert checks. (REQ-C1–C6)
- [ ] 2.2 Write `contracts/src/MockUSD.sol` (demo ERC20, 6 decimals, minter
  mint) — demo/testnet only, never mainnet.
- [ ] 2.3 Write `contracts/test/AgentPayEscrow.t.sol`: unit tests for
  create/pay/release/refund, every revert path, expiry behaviour, and the
  merchant-only release rule. (REQ-T1)
- [ ] 2.4 Write `contracts/test/AgentPayEscrowFuzz.t.sol`: fuzz amounts and
  expiries on `createInvoice`; invariant test that escrow balance equals the
  sum of PAID invoices. (REQ-T1)
- [ ] 2.5 Add Kiro property-based tests for the escrow state machine
  (CREATED → PAID → RELEASED/REFUNDED; no illegal transitions; refund only
  to payer). Record any issue PBT catches that unit tests missed. (REQ-T2)
- [ ] 2.6 Run `forge test` (unit + fuzz + invariant + PBT). All must pass.
  Write `contracts/script/Deploy.s.sol` (MockUSD + escrow, BSC testnet).

## 3. MCP server

- [ ] 3.1 Implement `mcp-server/src/index.ts` (stdio transport) with tools
  `create_invoice`, `get_invoice`, `list_invoices`, `pay_invoice`,
  `release_invoice` per `design.md`. Read-only tools return data; write
  tools return unsigned calldata + a human summary. No keys. (REQ-M1–M3)
- [ ] 3.2 Add `mcp-server/src/config.ts` (env: `AGENTPAY_RPC_URL`,
  `AGENTPAY_ESCROW_ADDRESS`, `AGENTPAY_TOKEN_ADDRESS`).
- [ ] 3.3 Write `mcp-server/src/index.test.ts` (mocked provider): tool
  shapes, calldata correctness, and that no tool ever returns a private key.
  (REQ-T3)
- [ ] 3.4 Run `npm test` in `mcp-server/`; all must pass. Verify Kiro loads
  the server from `.kiro/settings/mcp.json` and the five tools appear.

## 4. Merchant dashboard (React)

- [ ] 4.1 Build the invoice form (amount, label, payout address) with
  validation; on submit it calls `createInvoice` through the user's wallet
  and shows the payment link + QR code. (REQ-D1, D4)
- [ ] 4.2 Build the invoice list with status, amount, label, payer and
  expiry; read from contract events via public RPC. (REQ-D2)
- [ ] 4.3 Build invoice detail with Release / Refund buttons, confirmation
  step, and the resulting transaction hash display. (REQ-D3)
- [ ] 4.4 Add the demo-mode toggle: labelled simulated flow, no wallet
  needed, no real funds. (REQ-D5)
- [ ] 4.5 Build the agent chat panel: intent parsing for create-invoice,
  status-check and release/refund; parsed tool call shown for confirmation
  before anything on-chain; amount/token/recipient/expiry always shown.
  (REQ-A1–A3)
- [ ] 4.6 Write `app/src/*.test.*` for form validation and chat intent
  parsing. (REQ-T3)
- [ ] 4.7 Run `npm test` and `npm run build` in `app/`; all must pass.

## 5. Wiring, deploy, docs

- [ ] 5.1 Deploy MockUSD + escrow to BSC testnet with the public faucet-funded
  deployer; verify on the testnet explorer; record addresses in
  `deployments/bsc-testnet.json` and in the README.
- [ ] 5.2 Point the dashboard and MCP server at the testnet deployment;
  end-to-end check: create → pay → release in the live demo.
- [ ] 5.3 Deploy the dashboard to Vercel (free Hobby, team Owoade); verify
  the live URL loads and demo mode works.
- [ ] 5.4 Write `KIRO.md` (how Kiro was used: CLI, specs, steering, hooks,
  MCP, PBT — with concrete examples, no invented claims).
- [ ] 5.5 Final check: `forge test` + `npm test` (app + mcp-server) green;
  README accurate; `.kiro/` committed and not ignored; repo public with
  MIT licence.
