/**
 * Tests for form validation helpers.
 */
import { describe, it, expect } from 'vitest'
import { validateInvoiceForm, usdToUnits } from './validation'

const VALID_ADDR = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e'

describe('validateInvoiceForm', () => {
  it('passes on valid inputs', () => {
    const errors = validateInvoiceForm({
      amountUsd: '25.00',
      label: 'delivery fee',
      payoutAddress: VALID_ADDR,
    })
    expect(errors).toEqual({})
  })

  describe('amountUsd', () => {
    it('requires a value', () => {
      const errors = validateInvoiceForm({ amountUsd: '', label: 'x', payoutAddress: VALID_ADDR })
      expect(errors.amountUsd).toMatch(/required/i)
    })

    it('rejects zero', () => {
      const errors = validateInvoiceForm({ amountUsd: '0', label: 'x', payoutAddress: VALID_ADDR })
      expect(errors.amountUsd).toMatch(/positive/i)
    })

    it('rejects negative', () => {
      const errors = validateInvoiceForm({ amountUsd: '-5', label: 'x', payoutAddress: VALID_ADDR })
      expect(errors.amountUsd).toMatch(/positive/i)
    })

    it('rejects non-numeric', () => {
      const errors = validateInvoiceForm({ amountUsd: 'abc', label: 'x', payoutAddress: VALID_ADDR })
      expect(errors.amountUsd).toMatch(/positive/i)
    })

    it('rejects amount above cap (10001)', () => {
      const errors = validateInvoiceForm({ amountUsd: '10001', label: 'x', payoutAddress: VALID_ADDR })
      expect(errors.amountUsd).toMatch(/cap/i)
    })

    it('accepts amount at cap (10000)', () => {
      const errors = validateInvoiceForm({ amountUsd: '10000', label: 'x', payoutAddress: VALID_ADDR })
      expect(errors.amountUsd).toBeUndefined()
    })

    it('accepts fractional amount', () => {
      const errors = validateInvoiceForm({ amountUsd: '0.01', label: 'x', payoutAddress: VALID_ADDR })
      expect(errors.amountUsd).toBeUndefined()
    })
  })

  describe('label', () => {
    it('requires a value', () => {
      const errors = validateInvoiceForm({ amountUsd: '10', label: '', payoutAddress: VALID_ADDR })
      expect(errors.label).toMatch(/required/i)
    })

    it('requires a non-whitespace value', () => {
      const errors = validateInvoiceForm({ amountUsd: '10', label: '   ', payoutAddress: VALID_ADDR })
      expect(errors.label).toMatch(/required/i)
    })

    it('rejects label > 200 chars', () => {
      const errors = validateInvoiceForm({ amountUsd: '10', label: 'a'.repeat(201), payoutAddress: VALID_ADDR })
      expect(errors.label).toMatch(/200/i)
    })

    it('accepts label at exactly 200 chars', () => {
      const errors = validateInvoiceForm({ amountUsd: '10', label: 'a'.repeat(200), payoutAddress: VALID_ADDR })
      expect(errors.label).toBeUndefined()
    })
  })

  describe('payoutAddress', () => {
    it('requires a value', () => {
      const errors = validateInvoiceForm({ amountUsd: '10', label: 'x', payoutAddress: '' })
      expect(errors.payoutAddress).toMatch(/required/i)
    })

    it('rejects an obviously invalid address', () => {
      const errors = validateInvoiceForm({ amountUsd: '10', label: 'x', payoutAddress: 'not-an-address' })
      expect(errors.payoutAddress).toMatch(/valid/i)
    })

    it('rejects a short hex string', () => {
      const errors = validateInvoiceForm({ amountUsd: '10', label: 'x', payoutAddress: '0x1234' })
      expect(errors.payoutAddress).toMatch(/valid/i)
    })

    it('accepts a valid checksum address', () => {
      const errors = validateInvoiceForm({ amountUsd: '10', label: 'x', payoutAddress: VALID_ADDR })
      expect(errors.payoutAddress).toBeUndefined()
    })

    it('accepts a lowercase (non-checksum) address if it is otherwise valid', () => {
      // ethers.getAddress handles all-lowercase (EIP-55 checksum not required by spec)
      const lower = VALID_ADDR.toLowerCase()
      const errors = validateInvoiceForm({ amountUsd: '10', label: 'x', payoutAddress: lower })
      expect(errors.payoutAddress).toBeUndefined()
    })
  })

  it('reports multiple errors simultaneously', () => {
    const errors = validateInvoiceForm({ amountUsd: '', label: '', payoutAddress: '' })
    expect(errors.amountUsd).toBeTruthy()
    expect(errors.label).toBeTruthy()
    expect(errors.payoutAddress).toBeTruthy()
  })
})

describe('usdToUnits', () => {
  it('converts 25 to 25000000', () => {
    expect(usdToUnits('25')).toBe(25_000_000n)
  })

  it('converts 25.50 to 25500000', () => {
    expect(usdToUnits('25.50')).toBe(25_500_000n)
  })

  it('converts 0.01 to 10000', () => {
    expect(usdToUnits('0.01')).toBe(10_000n)
  })

  it('converts 10000 to 10000000000', () => {
    expect(usdToUnits('10000')).toBe(10_000_000_000n)
  })
})
