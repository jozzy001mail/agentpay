/**
 * Tests for the chat intent parser.
 */
import { describe, it, expect } from 'vitest'
import { parseIntent, intentToConfirmationText } from './chat-intent'

describe('parseIntent', () => {
  describe('create_invoice', () => {
    it('parses "$25 invoice for 2kg of rice"', () => {
      const result = parseIntent('create a $25 invoice for 2kg of rice')
      expect(result.kind).toBe('create_invoice')
      if (result.kind === 'create_invoice') {
        expect(result.amountUsd).toBe('25')
        expect(result.label).toContain('rice')
      }
    })

    it('parses "$10.50 invoice"', () => {
      const result = parseIntent('make a $10.50 invoice for delivery fee')
      expect(result.kind).toBe('create_invoice')
      if (result.kind === 'create_invoice') {
        expect(result.amountUsd).toBe('10.50')
      }
    })

    it('parses "25 USD invoice"', () => {
      const result = parseIntent('create a 25 USD invoice for 2kg tomatoes')
      expect(result.kind).toBe('create_invoice')
      if (result.kind === 'create_invoice') {
        expect(result.amountUsd).toBe('25')
      }
    })

    it('parses "25 MUSD invoice"', () => {
      const result = parseIntent('invoice for 50 MUSD')
      expect(result.kind).toBe('create_invoice')
      if (result.kind === 'create_invoice') {
        expect(result.amountUsd).toBe('50')
      }
    })
  })

  describe('status_check', () => {
    it('parses "has invoice 3 been paid?"', () => {
      const result = parseIntent('has invoice 3 been paid?')
      expect(result.kind).toBe('status_check')
      if (result.kind === 'status_check') {
        expect(result.invoiceId).toBe(3)
      }
    })

    it('parses "check invoice 7"', () => {
      const result = parseIntent('check invoice 7')
      expect(result.kind).toBe('status_check')
      if (result.kind === 'status_check') {
        expect(result.invoiceId).toBe(7)
      }
    })

    it('parses "status of invoice 1"', () => {
      const result = parseIntent('status of invoice 1')
      expect(result.kind).toBe('status_check')
      if (result.kind === 'status_check') {
        expect(result.invoiceId).toBe(1)
      }
    })
  })

  describe('release_invoice', () => {
    it('parses "release invoice 2"', () => {
      const result = parseIntent('release invoice 2')
      expect(result.kind).toBe('release_invoice')
      if (result.kind === 'release_invoice') {
        expect(result.invoiceId).toBe(2)
      }
    })

    it('parses "release #5"', () => {
      const result = parseIntent('release #5')
      expect(result.kind).toBe('release_invoice')
      if (result.kind === 'release_invoice') {
        expect(result.invoiceId).toBe(5)
      }
    })
  })

  describe('refund_invoice', () => {
    it('parses "refund invoice 4"', () => {
      const result = parseIntent('refund invoice 4')
      expect(result.kind).toBe('refund_invoice')
      if (result.kind === 'refund_invoice') {
        expect(result.invoiceId).toBe(4)
      }
    })

    it('parses "refund #9"', () => {
      const result = parseIntent('refund #9')
      expect(result.kind).toBe('refund_invoice')
      if (result.kind === 'refund_invoice') {
        expect(result.invoiceId).toBe(9)
      }
    })
  })

  describe('unknown', () => {
    it('returns unknown for unrecognised input', () => {
      const result = parseIntent('what is the weather today?')
      expect(result.kind).toBe('unknown')
    })

    it('returns unknown for empty string', () => {
      const result = parseIntent('')
      expect(result.kind).toBe('unknown')
    })
  })
})

describe('intentToConfirmationText', () => {
  it('shows amount and label for create_invoice', () => {
    const text = intentToConfirmationText({ kind: 'create_invoice', amountUsd: '25', label: '2kg of rice' })
    expect(text).toContain('$25')
    expect(text).toContain('rice')
  })

  it('shows invoice ID for status_check', () => {
    const text = intentToConfirmationText({ kind: 'status_check', invoiceId: 3 })
    expect(text).toContain('#3')
  })

  it('warns and shows invoice ID for release_invoice', () => {
    const text = intentToConfirmationText({ kind: 'release_invoice', invoiceId: 2 })
    expect(text).toContain('#2')
    expect(text).toMatch(/confirm|confirm/i)
  })

  it('warns and shows invoice ID for refund_invoice', () => {
    const text = intentToConfirmationText({ kind: 'refund_invoice', invoiceId: 5 })
    expect(text).toContain('#5')
  })

  it('gives help text for unknown', () => {
    const text = intentToConfirmationText({ kind: 'unknown' })
    expect(text).toMatch(/create|invoice/i)
  })
})
