/**
 * In-app intent parser for the agent chat panel.
 *
 * Recognises three intents from plain-English input:
 *   1. Create invoice   — "create a $25 invoice for 2kg of rice"
 *   2. Status check     — "has invoice 3 been paid?" / "check invoice 7"
 *   3. Release/refund   — "release invoice 2" / "refund invoice 5"
 *
 * This is a deterministic rule-based parser — no LLM API key required.
 * When run inside Kiro the agent can call the MCP tools directly instead.
 */

export type IntentKind =
  | 'create_invoice'
  | 'status_check'
  | 'release_invoice'
  | 'refund_invoice'
  | 'unknown'

export interface CreateInvoiceIntent {
  kind: 'create_invoice'
  amountUsd: string   // e.g. "25.00"
  label: string       // e.g. "2kg of rice"
}

export interface StatusCheckIntent {
  kind: 'status_check'
  invoiceId: number
}

export interface ReleaseIntent {
  kind: 'release_invoice'
  invoiceId: number
}

export interface RefundIntent {
  kind: 'refund_invoice'
  invoiceId: number
}

export interface UnknownIntent {
  kind: 'unknown'
}

export type ParsedIntent =
  | CreateInvoiceIntent
  | StatusCheckIntent
  | ReleaseIntent
  | RefundIntent
  | UnknownIntent

/**
 * Parse a plain-English chat message into a structured intent.
 */
export function parseIntent(message: string): ParsedIntent {
  const lower = message.toLowerCase().trim()

  // ── Release ──────────────────────────────────────────────────────────────
  // "release invoice 3" / "release #3" / "release 3"
  const releaseMatch = lower.match(/\brelease\b.*?(\d+)/)
  if (releaseMatch) {
    return { kind: 'release_invoice', invoiceId: parseInt(releaseMatch[1], 10) }
  }

  // ── Refund ───────────────────────────────────────────────────────────────
  // "refund invoice 2" / "refund #2"
  const refundMatch = lower.match(/\brefund\b.*?(\d+)/)
  if (refundMatch) {
    return { kind: 'refund_invoice', invoiceId: parseInt(refundMatch[1], 10) }
  }

  // ── Status check ──────────────────────────────────────────────────────────
  // "has invoice 3 been paid?" / "check invoice 7" / "status of invoice 1"
  const statusMatch = lower.match(
    /(?:invoice|#)\s*(\d+).*(?:paid|status|check|delivered|released|refunded)|(?:check|status of|has)\s+(?:invoice|#)?\s*(\d+)/
  )
  if (statusMatch) {
    const id = parseInt(statusMatch[1] ?? statusMatch[2], 10)
    return { kind: 'status_check', invoiceId: id }
  }

  // ── Create invoice ────────────────────────────────────────────────────────
  // "create a $25 invoice for 2kg of rice"
  // "make an invoice for $10.50 — delivery fee"
  if (lower.includes('invoice') || lower.includes('create') || lower.includes('make')) {
    // Extract dollar amount: $25, $10.50, 25 dollars, 25 USD, 25 MUSD
    const amountMatch = message.match(
      /\$\s*([\d]+(?:\.[\d]{1,2})?)|(\d+(?:\.\d{1,2})?)\s*(?:USD|MUSD|dollars?)/i
    )
    if (amountMatch) {
      const amountUsd = amountMatch[1] ?? amountMatch[2]
      // Label: everything after "for", ":", "—", or the full message minus the amount part
      const forMatch = message.match(/(?:for|:|-{1,2}|–)\s*(.+)$/i)
      const label = forMatch ? forMatch[1].trim() : message.trim()
      return { kind: 'create_invoice', amountUsd, label }
    }
  }

  return { kind: 'unknown' }
}

/**
 * Build a human-readable confirmation prompt for a parsed intent.
 */
export function intentToConfirmationText(intent: ParsedIntent): string {
  switch (intent.kind) {
    case 'create_invoice':
      return (
        `Create invoice:\n` +
        `  Amount:  $${intent.amountUsd} MUSD\n` +
        `  Label:   ${intent.label}\n\n` +
        `Please fill in your payout address and confirm.`
      )
    case 'status_check':
      return `Looking up invoice #${intent.invoiceId}…`
    case 'release_invoice':
      return (
        `⚠️ Release invoice #${intent.invoiceId}?\n\n` +
        `This will transfer the escrowed funds to the merchant address. ` +
        `Confirm to proceed.`
      )
    case 'refund_invoice':
      return (
        `⚠️ Refund invoice #${intent.invoiceId}?\n\n` +
        `This will return the escrowed funds to the payer. ` +
        `Confirm to proceed.`
      )
    case 'unknown':
      return (
        `I didn't understand that. Try:\n` +
        `  • "Create a $25 invoice for delivery fee"\n` +
        `  • "Has invoice 3 been paid?"\n` +
        `  • "Release invoice 2"\n` +
        `  • "Refund invoice 5"`
      )
  }
}
