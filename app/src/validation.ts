/**
 * Form validation helpers for the invoice creation form.
 * Pure functions — no side effects.
 */

import { ethers } from 'ethers'

/** Max invoice amount: 10,000 at 6 decimals. */
const MAX_AMOUNT_UNITS = 10_000n * 10n ** 6n

export interface InvoiceFormValues {
  amountUsd: string   // human-readable dollar amount, e.g. "25.00"
  label: string       // free-text description
  payoutAddress: string // merchant payout address
}

export interface ValidationErrors {
  amountUsd?: string
  label?: string
  payoutAddress?: string
}

/**
 * Validate the invoice creation form.
 * Returns an object whose keys are field names and values are error messages.
 * An empty object means the form is valid.
 */
export function validateInvoiceForm(values: InvoiceFormValues): ValidationErrors {
  const errors: ValidationErrors = {}

  // --- amount ---
  const amountTrimmed = values.amountUsd.trim()
  if (!amountTrimmed) {
    errors.amountUsd = 'Amount is required.'
  } else {
    const parsed = parseFloat(amountTrimmed)
    if (isNaN(parsed) || parsed <= 0) {
      errors.amountUsd = 'Amount must be a positive number.'
    } else {
      // Convert to 6-decimal units and check cap
      const units = BigInt(Math.round(parsed * 1_000_000))
      if (units > MAX_AMOUNT_UNITS) {
        errors.amountUsd = 'Amount exceeds the 10,000 MUSD per-invoice cap.'
      }
    }
  }

  // --- label ---
  const labelTrimmed = values.label.trim()
  if (!labelTrimmed) {
    errors.label = 'Label is required.'
  } else if (labelTrimmed.length > 200) {
    errors.label = 'Label must be 200 characters or fewer.'
  }

  // --- payout address ---
  const addrTrimmed = values.payoutAddress.trim()
  if (!addrTrimmed) {
    errors.payoutAddress = 'Payout address is required.'
  } else {
    try {
      ethers.getAddress(addrTrimmed) // throws on bad checksum or format
    } catch {
      errors.payoutAddress = 'Enter a valid Ethereum address.'
    }
  }

  return errors
}

/**
 * Convert a human-readable USD string to 6-decimal token units (bigint).
 * Assumes input is already valid per validateInvoiceForm.
 */
export function usdToUnits(amountUsd: string): bigint {
  const parsed = parseFloat(amountUsd.trim())
  return BigInt(Math.round(parsed * 1_000_000))
}
