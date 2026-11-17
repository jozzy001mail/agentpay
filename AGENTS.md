# AGENTS.md — AgentPay

Repo instructions for any agent working here (Kiro, Claude Code, Codex).

## What this is

AgentPay: stablecoin payment links for small businesses. React dashboard +
Foundry Solidity escrow + MCP server + in-app agent chat. Kiroween 2026,
Frankenstein category. Built with Kiro (CLI) via spec-driven development —
see `.kiro/specs/agentpay/` (requirements → design → tasks).

## Rules

- Follow the spec. Implement `tasks.md` in order; do not skip tests.
- Run `forge test` (contracts/) and `npm test` (app/, mcp-server/) before
  marking anything done. Green or it is not done.
- Never add `.kiro/` to `.gitignore`. Kiroween requires it committed.
- No private keys, seed phrases or secrets in code, config, logs or commits.
  The MCP server returns unsigned calldata; wallets sign.
- No paid APIs or services. Zero budget.
- Demo/simulated flows must be labelled DEMO in the UI.
- Honest docs only: no invented features, results, testimonials or
  credentials. The escrow is unaudited testnet code — say so in the README.
- Keep the Kiro write-up (`KIRO.md`) truthful: record what Kiro actually did
  (specs, hooks, steering, MCP, PBT), with concrete examples.

## Layout

- `contracts/` Foundry (escrow + MockUSD demo token)
- `app/` React + Vite + TypeScript dashboard
- `mcp-server/` Node MCP server (stdio)
- `.kiro/` specs, steering, hooks, MCP settings — committed, never ignored
