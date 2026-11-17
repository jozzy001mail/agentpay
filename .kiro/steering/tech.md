---
inclusion: always
---

# Tech — AgentPay

## Stack

- **Dashboard:** React 19 + Vite + TypeScript, ethers v6, `qrcode` package.
  Plain CSS, no component library.
- **Contracts:** Solidity ^0.8.24, Foundry (forge/cast/anvil). OpenZeppelin
  `ReentrancyGuard` and `ERC20` (via `forge install`, no vendored copies).
- **MCP server:** Node 22 + TypeScript, `@modelcontextprotocol/sdk`, stdio
  transport only. No network listener.
- **Chain:** BSC testnet (chain 97) for the demo deployment; local Anvil for
  offline tests. Demo stablecoin is a purpose-built `MockUSD` (6 decimals).
- **Hosting:** Vercel free Hobby (team Owoade) for the dashboard.

## Constraints

- Zero budget: no paid APIs, no paid services, no payments anywhere.
- No private keys, seed phrases or secrets in code, config or logs. The MCP
  server returns unsigned calldata; wallets sign.
- Every on-chain action needs an explicit user confirmation in the UI.
- Honest labels: demo/simulated flows are always marked DEMO; the escrow is
  unaudited testnet code and the README says so.
- Tests before commit: `forge test` and `npm test` must be green.
- Never add `.kiro/` to `.gitignore`. The Kiroween rules require it committed.
