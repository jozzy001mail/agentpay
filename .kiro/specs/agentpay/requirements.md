# AgentPay — Requirements

Frankenstein category, Kiroween 2026. A stablecoin payment-link app for small
businesses: a merchant creates a payment link, a customer pays in a stablecoin
into an on-chain escrow, and the merchant releases the funds when the goods or
service are delivered. Four technologies stitched into one app: React merchant
dashboard, Foundry Solidity escrow, an MCP server, and an in-app AI agent the
shop owner talks to in plain English.

## Glossary

- **Invoice**: an on-chain escrow record: amount, token, merchant, payer, expiry, status.
- **Status**: CREATED → PAID → RELEASED, or CREATED → REFUNDED, or CREATED/PAID → EXPIRED → REFUNDED.
- **Demo mode**: the app runs against a mock stablecoin on BSC testnet with a
  clearly labelled simulated flow, so judges can try it with no real funds.
- **Agent chat**: the in-app chat panel. It may call MCP tools; it never holds
  private keys and never signs transactions.

## Requirements

### Merchant dashboard (React)

#### REQ-D1: Create invoice
WHEN a merchant enters an amount, a label and a payout address, THE SYSTEM SHALL
create an on-chain invoice in escrow and show a shareable payment link plus a QR
code for it.

#### REQ-D2: Invoice list
WHEN a merchant opens the dashboard, THE SYSTEM SHALL list their invoices with
status, amount, label, payer (when paid) and expiry.

#### REQ-D3: Release and refund
WHEN a merchant views a PAID invoice, THE SYSTEM SHALL offer a Release action
(pay the escrowed funds to the payout address) and a Refund action (return the
funds to the payer). Both actions SHALL require an explicit confirmation click
and SHALL show the resulting transaction hash.

#### REQ-D4: No keys in the browser
WHEN the app runs, THE SYSTEM SHALL NOT store, request or transmit any private
key or seed phrase. All on-chain actions SHALL be signed by the user's own
wallet (MetaMask / injected provider) or shown as unsigned calldata.

#### REQ-D5: Demo mode
WHEN demo mode is on, THE SYSTEM SHALL label every simulated step as a demo and
SHALL NOT require a wallet connection or real funds.

### Escrow contract (Foundry, Solidity)

#### REQ-C1: Create invoice
WHEN createInvoice(amount, token, merchant, expiry) is called with amount > 0
and expiry in the future, THE SYSTEM SHALL store the invoice as CREATED and
emit InvoiceCreated.

#### REQ-C2: Pay
WHEN pay(invoiceId) is called on a CREATED invoice before expiry, THE SYSTEM
SHALL pull exactly `amount` of `token` from the payer into escrow, mark the
invoice PAID, record the payer, and emit InvoicePaid.

#### REQ-C3: Release
WHEN release(invoiceId) is called by the merchant on a PAID invoice, THE SYSTEM
SHALL send the escrowed amount to the merchant payout address, mark the invoice
RELEASED, and emit InvoiceReleased. No other caller SHALL be able to release.

#### REQ-C4: Refund
WHEN refund(invoiceId) is called by the merchant on a PAID invoice, or by anyone
after expiry on a PAID invoice, THE SYSTEM SHALL return the escrowed amount to
the payer, mark the invoice REFUNDED, and emit InvoiceRefunded.

#### REQ-C5: Safety
WHEN any escrow function runs, THE SYSTEM SHALL be protected against reentrancy,
SHALL reject zero amounts, zero token addresses, past expiries and double
payments, and SHALL hold no admin power over funds (no owner withdrawal).

#### REQ-C6: Per-invoice cap
WHEN an invoice is created, THE SYSTEM SHALL reject amounts above the
per-invoice cap (default 10,000 stablecoin units, 6 decimals).

### MCP server

#### REQ-M1: Tools
THE SYSTEM SHALL expose MCP tools: create_invoice, get_invoice, list_invoices,
pay_invoice and release_invoice. Read-only tools (get_invoice, list_invoices)
SHALL be safe to auto-approve; write tools SHALL always need confirmation.

#### REQ-M2: No key custody
WHEN the MCP server prepares a payment, THE SYSTEM SHALL return unsigned
transaction calldata for the caller's wallet to sign. The server SHALL never
hold, request or log a private key.

#### REQ-M3: Stdio transport
THE SYSTEM SHALL run the MCP server over stdio so Kiro (and any MCP client) can
launch it as a local server with no network port.

### Agent chat

#### REQ-A1: Plain-English invoices
WHEN a shop owner types "create a $25 invoice for 2kg of rice", THE SYSTEM SHALL
parse the request into a create_invoice tool call and show the parsed details
for confirmation before doing anything on-chain.

#### REQ-A2: Status questions
WHEN a shop owner asks "has invoice 3 been paid?", THE SYSTEM SHALL answer from
get_invoice / list_invoices data, quoting the on-chain status.

#### REQ-A3: Confirmation before money moves
WHEN the agent proposes any on-chain action, THE SYSTEM SHALL wait for the
user's explicit confirmation and SHALL show the amount, token, recipient and
expiry before proceeding.

### Tests

#### REQ-T1: Contract tests
THE SYSTEM SHALL have Foundry unit tests covering create/pay/release/refund,
all revert paths, and expiry, plus a fuzz test on amounts and an invariant test
that escrow balance always equals the sum of PAID invoices.

#### REQ-T2: Property-based tests
THE SYSTEM SHALL have Kiro property-based tests for the escrow state machine
(CREATED → PAID → RELEASED/REFUNDED, no illegal transitions).

#### REQ-T3: App tests
THE SYSTEM SHALL have npm tests for the MCP tools (mocked chain) and for the
invoice form validation in the dashboard.

## Non-goals

- No real-money mainnet deployment; testnet and demo mode only.
- No user accounts, no KYC, no custody, no fees taken by AgentPay.
- No price oracle: amounts are entered in stablecoin units; USD labels are
  display-only and come from the merchant's own input.
