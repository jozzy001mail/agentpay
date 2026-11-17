# AgentPay — demo video script (under 3 minutes)

Record AFTER the live deploy, with the end-to-end flow already on-chain.
Method (same as DripPay): identical local build served locally, real chain
data pulled via a local JSON-RPC relay (the egress proxy blocks headless
Chromium's HTTPS); stills + TTS voiceover (Helio), ffmpeg zoompan, concat.
Target ~2:00, 1280x720, 30fps.

Live facts (verified 2026-11-17):
- Dashboard: https://agentpay-six-beryl.vercel.app (Base Sepolia 84532)
- MockUSD `0x63E19d83d3d983021eB96b3f5405acA21cD6530C`
- AgentPayEscrow `0xCaFa05aAc1CEDa6d51425480f7eCE7770aD4700E`
- Both contracts Sourcify exact_match.
- Invoice 0 flow (all confirmed): mint 100 MUSD
  `0x55df13bf03446bf88a1dd73a5d4a3558a2d91ca4d6228d51389062efe2631cac`,
  approve
  `0x6b3e9904bc54478596de6a0ae710c949c0c27f64bf31e2a6018582e41a433d9d`,
  createInvoice
  `0x2e029a4963065bc1fe1a9678f39b9fc3faf7fd677458b6fde87ace7f1bf3a029`,
  pay(0)
  `0x2ceb4f0cdfb1dc684aabb44fcc90e4a63f69e3d800eeef070c8fa01aa3fc0c63`,
  release(0)
  `0x7d4e234bd915ef561620c285caf49e2bc351e270864b7b96f1a882dda7217d49`.
  Final state: invoice 0 RELEASED, merchant 100 MUSD, escrow 0, invoiceCount 1.
- Tests: 98/98 pass (forge 42, MCP 16, app 40).
- Repo: https://github.com/jozzy001mail/agentpay (public, MIT).

## Scene 1 — Hook (~18s)

Show: live invoice detail page (demo mode OFF), invoice 0, status RELEASED,
100.00 MUSD, QR code + payment link visible.

> "Small businesses lose sales when getting paid is hard. AgentPay turns an
> invoice into a payment link. This is invoice zero, live on Base Sepolia
> testnet: one hundred dollars in stablecoin, paid by the customer and
> released to the shop — all on chain."

## Scene 2 — Plain-English invoice (~22s)

Show: agent chat panel (app demo mode — the app's own DEMO labels visible):
user message "create a $50 invoice for Ada's cake", parsed confirmation
(amount $50 MUSD, label "Ada's cake", payout address field, Confirm button),
then the simulated creation reply.

> "You don't fill in a form if you don't want to. Just tell the agent:
> create a fifty-dollar invoice for Ada's cake. It parses that into an
> invoice — amount, label, and your payout address — and shows it back for
> confirmation before anything moves. This is the app's demo mode, so the
> confirmation is simulated; the live flow gates the real transaction the
> same way."

## Scene 3 — The customer pays (~20s)

Show: live invoice detail page (demo mode OFF), QR code + payment link;
then the pay-transaction card.

> "The customer gets a link and a QR code. They approve the stablecoin,
> then pay the escrow — not the shop directly. Their money is locked in the
> contract until the job is done. This payment is real, and it's on Base
> Sepolia — the transaction hash is on screen."

## Scene 4 — The owner releases (~20s)

Show: release-transaction card, then the live detail page state RELEASED
(merchant 100 MUSD, escrow 0).

> "When the cake is delivered, the shop releases the funds. One transaction,
> 7d4e234b, and the escrow pays the merchant. If the job falls through, the
> same screen refunds the customer instead. Nobody holds anyone else's
> money."

## Scene 5 — On-chain proof (~22s)

Show: terminal card with all five transaction hashes + contract addresses +
getInvoice(0) state, then the test-results card (98 tests, 0 failures).

> "Every step is on chain and checkable. Mint, approve, create, pay,
> release — five transactions, all confirmed. Both contracts are verified on
> Sourcify, and the suite is green: ninety-eight tests, zero failures,
> including property tests that prove the escrow can never pay out more than
> it holds."

## Scene 6 — Close (~15s)

Show: end card (AgentPay, repo, live app, Kiroween 2026, testnet disclaimer).

> "AgentPay was built with Kiro, in about twenty-five minutes, for Kiroween
> 2026. Testnet only — Base Sepolia, a demo dollar, no real money. The code
> is open source, the app is live, and the next invoice is yours to create."

## Honesty notes

- The invoice-0 flow shown is the real on-chain flow (tx hashes above).
- The chat interaction in scene 2 is the app's demo mode, labelled DEMO by
  the app itself; the narration says so. No demo-mode click is presented as
  a real transaction.
- Known app issue (NOT fixed for this video — flag to the parent): in live
  mode (demo OFF), the invoice list fails to load because
  `InvoiceList.queryFilter` requests logs from block 0 and sepolia.base.org
  caps eth_getLogs at a 200-block range (error -32614). The detail page
  works (single eth_call). Screenshots of the live detail page were taken
  from a local copy of the identical build whose only change is the initial
  page (detail, invoice 0) so the real on-chain data is visible.
- The live app's footer links to the wrong repo (github.com/jozzy001mail/kiroween-agentpay)
  and the detail page's tx link points at testnet.bscscan.com instead of
  sepolia.basescan.org — pre-existing, flag to the parent.

## Files

- Working files: `~/workspace/kiroween-agentpay/demo/`
- Finished video: `~/workspace/kiroween-agentpay/AgentPay-demo.mp4`
- Do NOT upload to YouTube or submit to Devpost from this task.
