# KIRO.md — How Kiro Was Used

This document records what Kiro actually did to build AgentPay. No invented
features, no inflated claims.

## Workflow

This project was built using **spec-driven development** with the Kiro CLI and
IDE. The workflow:

1. Requirements and architecture were written first in `.kiro/specs/agentpay/`
   (`requirements.md`, `design.md`, `tasks.md`).
2. Kiro implemented the tasks in `tasks.md` in order, running tests at each
   step before marking a task done.

## Kiro features used

### Spec-driven development

Kiro read `.kiro/specs/agentpay/tasks.md` and implemented tasks 1–5 in order.
The spec defined the contract interface, MCP tool shapes, dashboard pages and
test requirements before a line of code was written. This meant Kiro never had
to guess intent — it had a machine-readable plan to follow.

Concrete example: task 2.3 says "unit tests for create/pay/release/refund,
every revert path, expiry behaviour, and the merchant-only release rule". Kiro
produced `AgentPayEscrow.t.sol` with 26 tests covering exactly that list.

### Steering files

Three steering files in `.kiro/steering/` shaped every code decision Kiro
made:

- `product.md` — kept Kiro focused on the merchant/customer use case and away
  from non-goals (mainnet, KYC, fees).
- `tech.md` — enforced the stack (React 19, ethers v6, Foundry 0.8.24,
  OpenZeppelin, `@modelcontextprotocol/sdk`), the no-private-keys rule, and
  the DEMO labelling requirement.
- `structure.md` — enforced file naming (kebab-case, PascalCase contracts,
  snake_case MCP tools) and the directory layout.

### Hooks

Three hooks are defined in `.kiro/hooks/`:

- `forge-test-on-save.json` — runs `forge test` when a `.sol` file is saved,
  catching regressions immediately.
- `lint-on-save.json` — runs `oxlint` when a `.ts` or `.tsx` file is saved.
- `test-reminder.json` — reminds Kiro to run `npm test` before marking a task
  done.

These hooks meant that every contract edit was immediately tested without an
explicit "run the tests" instruction.

### MCP server

The AgentPay MCP server is itself part of the Kiro integration: it is
registered in `.kiro/settings/mcp.json` so Kiro (and any MCP-compatible
client) can call the five invoice tools (`create_invoice`, `get_invoice`,
`list_invoices`, `pay_invoice`, `release_invoice`) directly from a chat
session. `get_invoice` and `list_invoices` are set to `autoApprove: true`;
write tools require confirmation.

Kiro built the MCP server (`mcp-server/src/index.ts`) and its tests
(`mcp-server/src/index.test.ts`) as part of tasks 3.1–3.4.

### Property-based tests (PBT)

Task 2.5 asked for property-based tests for the escrow state machine. Kiro
produced `AgentPayEscrow.PBT.t.sol` with 10 properties:

- P1/P2: CREATED cannot be directly released or refunded (must pay first).
- P3/P4: RELEASED and REFUNDED are terminal states — any further mutation
  reverts.
- P5: Refund always credits the payer's address, never any other caller.
- P6: Release always credits the merchant's address.
- P7: Only the merchant can call `release` — fuzzed over all possible callers.
- P8: Status is monotonically increasing (never goes backward).
- P9: Double-pay always reverts.
- P10: Final status is exactly one of RELEASED or REFUNDED, never both.

During the PBT run Kiro caught a real issue: `vm.expectRevert` placed before
`vm.startPrank` + `approve()` was consumed by the `approve` call rather than
the escrow call, causing false passes. The PBT terminal-state tests (P3, P4)
and the double-pay test (P9) exposed this pattern. The unit tests had the same
bug. Fixing it required moving `vm.expectRevert` to be the last call before the
reverting call. This is a concrete example of PBT catching something that a
naive unit test missed.

## What Kiro did not do

- Kiro did not deploy to BSC testnet (task 5.1) — that requires a live wallet
  and testnet funds, which are outside the non-interactive session.
- Kiro did not deploy to Vercel (task 5.3) — that requires CLI auth.
- Kiro did not make up any test results, deployment addresses or testimonials.
  The `deployments/bsc-testnet.json` file contains placeholder addresses and
  instructions for the human to run the deploy script.

## Deployment after Kiro (2026-11-17)

The contracts were deployed on **Base Sepolia (chain 84532)**, not BSC
testnet: the BSC testnet faucet gates claims on holding 0.002 BNB on BSC
mainnet, which neither the deployer nor the user's wallet holds, so BSC was
blocked without real money. The deploy itself was done with Foundry outside
Kiro, using testnet funds bridged earlier for another project (all $0 real
money). A full end-to-end flow (mint → createInvoice → pay → release) was
verified live on Base Sepolia, invoice 0 ending RELEASED. The dashboard was
deployed to Vercel. See `deployments/base-sepolia.json` for addresses.
