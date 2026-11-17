# AgentPay — Devpost submission pack (Kiroween 2026)

Everything below is ready to paste into the Devpost submission form for
https://kiroween.devpost.com/. The project is built in Kiro and deploying;
the live demo + video + registration are the only steps left.

## Form fields

- **Project name:** AgentPay
- **Category:** Frankenstein
- **Team:** Owoade (solo) — Devpost jozzy001mail, GitHub jozzy001mail
- **Live demo:** https://agentpay-six-beryl.vercel.app
- **GitHub repo (public, MIT):** https://github.com/jozzy001mail/agentpay
- **Demo video:** TBD — record after the live deploy (under 3 min, PUBLIC on YouTube)
- **Deployed contracts (Base Sepolia 84532):** MockUSD `0x63E19d83d3d983021eB96b3f5405acA21cD6530C`, AgentPayEscrow `0xCaFa05aAc1CEDa6d51425480f7eCE7770aD4700E` (both Sourcify-verified; end-to-end flow mint → createInvoice → pay → release verified live 2026-11-17, invoice 0 RELEASED)

## Short description (paste-ready)

AgentPay is stablecoin payment links for small businesses, built with Kiro.
A shop owner creates an invoice in plain English — "charge Ada 50 dollars
for the cake" — and AgentPay turns it into a payment link with a QR code.
The customer pays in stablecoin, the money sits in an on-chain escrow, and
the owner releases it when the job is done (or refunds it if it falls
through). An MCP server exposes create-invoice, pay and release as tools, so
an AI agent can run the whole flow. Built on Base Sepolia testnet with a
MockUSD demo token — no real money.

## How Kiro was used (required — paste-ready)

AgentPay was built entirely in Kiro CLI (headless). The work started from a
genuine `/.kiro` directory at the repo root: specs (requirements in EARS
format, design, 26 tasks), steering (product, tech, structure) and hooks
(lint-on-save, forge-test-on-save, test-reminder). Kiro implemented the
Foundry escrow contract (AgentPayEscrow + MockUSD), the MCP server (5 tools),
and the React dashboard with an in-app agent chat, running `forge test` and
`npm test` as it went — 98 tests, 0 failures. Kiro's property-based tests
caught a real bug during the run (a misplaced `vm.expectRevert`), recorded
in KIRO.md. The live deploy steps were run outside Kiro CLI because they
need a funded testnet wallet.

## What was built

- **AgentPayEscrow.sol** — invoice escrow: createInvoice / pay / release /
  refund, events, ReentrancyGuard, per-invoice spend cap, all revert checks.
- **MockUSD.sol** — 6-decimal demo ERC20 stablecoin for testnet.
- **MCP server** — stdio, 5 tools: create_invoice, get_invoice,
  list_invoices, pay_invoice, release_invoice. Write tools return unsigned
  calldata — no private keys.
- **React dashboard** — invoice form (validation, MetaMask createInvoice,
  payment link + QR), invoice list (reads InvoiceCreated events), invoice
  detail (release/refund + tx hash), AgentChat (plain-English intent parsing
  with parsed action shown for confirmation), labelled DEMO mode toggle.
- **Tests: 98 total, 0 failures** — `forge test` 42 (26 unit, 5 fuzz, 10
  property-based, 1 invariant: escrow balance == sum of PAID invoices),
  MCP server 16, app 40 (validation + chat-intent). `npm run build` passes.

## Requirements checklist

- [x] Built 30 Oct – 4 Dec 2026 (started 17 Nov 2026)
- [x] Public GitHub repo, open-source licence (MIT)
- [x] `/.kiro` directory at repo root (specs, hooks, steering — not gitignored)
- [x] Working app (built; live URL pending deploy)
- [ ] Live demo URL (Vercel deploy in progress)
- [ ] Demo video under 3 min, PUBLIC on YouTube
- [ ] Devpost registration (Owoade must tap "Join hackathon" on his phone — cloud browser cannot clear the Turnstile check)
- [ ] Submit the Devpost form (after demo + video are live)
- [ ] Student prize lane: Best Student Project ($1,500 + 1-year Kiro Pro Max) — needs LinkedIn profile, student email, year/degree, school (EKSU x Alayande); enrolment proof may be requested

## Deadline

Submissions close **Fri 4 Dec 2026 23:00 WAT**. Judging 16 Dec – 29 Jan,
winners ~3 Feb 2027. Judged on Potential Impact, Technological
Implementation (depth of Kiro use), Design, Innovation, Presentation.

## Prizes

$100,000+ pool. Frankenstein category $5,000. Student prizes: 4 x $1,500 +
1-year Kiro Pro Max. Also: Best Demo $1,000, Best Kiro Crew App $1,000,
Bonus Blog Prize (2,000 Kiro credits).

## Credits

Kiro Free gives 50 credits/month. A 4,000-credit request is pending the
Devpost registration + Kiro user ID (or AWS account ID) + Owoade's Didit
identity check (government ID + face photo — only he can do it). Request
before **Tue 1 Dec 2026 12:00 PT**; reviewed within 48 business hours;
redeem by 4 Dec; credits expire 31 Dec. The build itself did NOT stop on
credits — the Kiro session exited normally.
