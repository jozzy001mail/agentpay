# AgentPay BSC testnet deploy — status (2026-11-17 ~10:05 WAT)

## Done / verified green
- `forge test` (from `contracts/`): **42 passed, 0 failed**
- `npm test` (from `app/`): **40 passed, 0 failed**; `npm run build` succeeds
- MCP server tests (`node --test dist/index.test.js`): **16 passed, 0 failed**
- Total: 98 tests, 0 failures. Repo clean at commit `854c0e4` (Kiro build).
- Vercel CLI (`/usr/bin/vercel` 65.17.0): logged in as `jozzy001mail`, team `owoade1` ready.
- Throwaway deployer created: `0x6b7e97BA7EFFA4d8ea2FABEF8f595CDfad921d29`
  - Key: `~/.agentpay-deployer.json` (mode 600, NOT committed, testnet-only).
  - BSC testnet balance: **0 tBNB** (verified on-chain).

## BLOCKED — funding the deployer
The official faucet (https://testnet.bnbchain.org/faucet-smart, now at
https://www.bnbchain.org/en/testnet-faucet) cannot fund this address today:
1. It requires an hCaptcha solve (browser-only). As a subagent I cannot
   operate a live browser.
2. Even in a browser it would reject the claim: the live faucet page says
   "0.002 BNB on BSC Mainnet is needed for test funding" and
   "This address has less than 0.002 BNB on BSC Mainnet. Add BNB to the same
   address, then try again." The throwaway holds 0 mainnet BNB.
   The user's main wallet `0x5d7bBEf989bba4f18c8F2E4555d82b9E83B5C07B`
   holds only **0.00085073 BNB** on mainnet — also below 0.002.
   (The drip is 0.3 tBNB per 24h, not 0.1 as the task stated.)
3. Alternatives checked and also gated: QuickNode faucet (small mainnet
   balance + verification), Chainstack (API key + 0.002 ETH mainnet),
   Crypto Chief (needs an account — not created), Triangle (503 down).

## Unblock options (parent decides — all need the user/parent, none are $0 from here)
- A. User tops up his main wallet to >= 0.002 BNB (needs ~0.0012 BNB,
  ~$0.70 — real money, needs his explicit approval), then the parent runs
  the browser faucet claim with the MAIN address (0.3 tBNB), then sends
  tBNB from the main wallet to the throwaway via `baw` (testnet, gas-only).
- B. User tries the Telegram bot @bnbchain_official_bot himself (0.3 tBNB/day;
  unknown whether it gates on mainnet balance — worth trying, $0).
- C. Fund the throwaway itself with 0.002 mainnet BNB, then the parent runs
  the browser faucet claim with the throwaway address directly.

## Resume once the deployer holds tBNB
```bash
export DEPLOYER_KEY=$(python3 -c "import json; print(json.load(open('/home/hatch/.agentpay-deployer.json'))['data'][0]['private_key'])")
cd ~/workspace/kiroween-agentpay/contracts
forge script script/Deploy.s.sol \
  --rpc-url https://data-seed-prebsc-1-s1.binance.org:8545 \
  --broadcast --private-key $DEPLOYER_KEY
```
NOTE: the deploy script's docstring RPC
`https://bsc-testnet.bnbchain.org/api/v1/public` returned HTTP 404 for
`eth_getBalance` when tested — use the data-seed-prebsc RPC above instead.
Then record both addresses in `deployments/bsc-testnet.json`, wire the
configs, run the e2e flow, and deploy the dashboard:
- App env: `VITE_RPC_URL`, `VITE_ESCROW_ADDRESS`, `VITE_TOKEN_ADDRESS`,
  `VITE_APP_URL` (see `app/src/config.ts`).
- MCP env: `AGENTPAY_RPC_URL`, `AGENTPAY_ESCROW_ADDRESS`,
  `AGENTPAY_TOKEN_ADDRESS` (see `mcp-server/src/config.ts`).
- E2E flow (contracts): `MockUSD.mint` (deployer is minter) →
  `AgentPayEscrow.createInvoice(token, amount, merchant, expiry)` →
  `pay(id)` → `release(id)`; verify with `getInvoice(id)` / `invoiceCount()`.
- Vercel: `cd app && /usr/bin/vercel --prod` under team `owoade1`.

## Security note
An earlier tool result in this session was flagged by the system safety
check; the throwaway key shown in it was discarded and NEVER used. A file
`/tmp/agentpay-deployer.json` holding that discarded key still exists on
disk (left untouched per the safety notice) — it is unfunded; do not use it,
delete it at your discretion. The deployer above is a fresh replacement.
