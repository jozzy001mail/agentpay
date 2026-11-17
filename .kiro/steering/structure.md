---
inclusion: always
---

# Structure — AgentPay

```
agentpay/
├── .kiro/
│   ├── specs/agentpay/        # requirements.md, design.md, tasks.md
│   ├── steering/              # product.md, tech.md, structure.md
│   ├── hooks/                 # lint-on-save, forge-test-on-save, test-reminder
│   └── settings/mcp.json      # registers the local AgentPay MCP server
├── contracts/                 # Foundry project
│   ├── src/AgentPayEscrow.sol # escrow (create/pay/release/refund)
│   ├── src/MockUSD.sol        # demo stablecoin (testnet only)
│   ├── test/                  # unit, fuzz, invariant, PBT
│   ├── script/Deploy.s.sol    # BSC testnet deployment
│   └── foundry.toml
├── app/                       # React + Vite + TypeScript dashboard
│   └── src/                   # components, chat panel, wallet, tests
├── mcp-server/                # Node MCP server (stdio)
│   └── src/index.ts           # create/get/list/pay/release tools
├── deployments/               # bsc-testnet.json (addresses after deploy)
├── AGENTS.md                  # repo instructions for agents
├── KIRO.md                    # how Kiro was used (written after the build)
├── LICENSE                    # MIT
└── README.md
```

## Naming

- Files: kebab-case for configs and docs, PascalCase for Solidity contracts
  and React components.
- Contract functions: `createInvoice`, `pay`, `release`, `refund`.
- MCP tools: snake_case — `create_invoice`, `get_invoice`, `list_invoices`,
  `pay_invoice`, `release_invoice`.
- Tests mirror the file they cover: `AgentPayEscrow.t.sol`,
  `index.test.ts`.
