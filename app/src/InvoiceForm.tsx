/**
 * InvoiceForm — create a new AgentPay invoice.
 *
 * In live mode: calls createInvoice on the escrow via MetaMask.
 * In demo mode: simulates the create flow with a labelled DEMO tag.
 */
import { useState } from 'react'
import { ethers } from 'ethers'
import QRCode from 'qrcode'
import { validateInvoiceForm, usdToUnits, type InvoiceFormValues } from './validation'
import { ESCROW_ABI } from './abi'
import { config } from './config'

interface Props {
  demoMode: boolean
  onCreated?: (invoiceId: number) => void
}

export default function InvoiceForm({ demoMode, onCreated }: Props) {
  const [values, setValues] = useState<InvoiceFormValues>({
    amountUsd: '',
    label: '',
    payoutAddress: '',
  })
  const [errors, setErrors] = useState<Partial<InvoiceFormValues>>({})
  const [status, setStatus] = useState<'idle' | 'pending' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<{ invoiceId: number; paymentLink: string; qrDataUrl: string } | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setValues((v) => ({ ...v, [name]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validateInvoiceForm(values)
    if (Object.keys(errs).length > 0) {
      setErrors(errs as Partial<InvoiceFormValues>)
      return
    }
    setErrors({})
    setStatus('pending')
    setErrorMsg(null)

    try {
      const amount = usdToUnits(values.amountUsd)
      const expirySeconds = 7 * 24 * 60 * 60 // 7 days
      const expiry = BigInt(Math.floor(Date.now() / 1000) + expirySeconds)
      const payout = ethers.getAddress(values.payoutAddress.trim())

      let invoiceId: number

      if (demoMode) {
        // DEMO — simulate, no real transaction
        await new Promise((r) => setTimeout(r, 800))
        invoiceId = Math.floor(Math.random() * 1000)
      } else {
        const provider = new ethers.BrowserProvider((window as Window & { ethereum?: ethers.Eip1193Provider }).ethereum!)
        const signer = await provider.getSigner()
        const escrow = new ethers.Contract(config.escrowAddress, ESCROW_ABI, signer)
        const tx = await escrow.createInvoice(config.tokenAddress, amount, payout, expiry)
        setTxHash(tx.hash)
        const receipt = await tx.wait()
        // Parse the InvoiceCreated event
        const iface = new ethers.Interface(ESCROW_ABI)
        for (const log of receipt.logs) {
          try {
            const parsed = iface.parseLog(log)
            if (parsed?.name === 'InvoiceCreated') {
              invoiceId = Number(parsed.args.id)
              break
            }
          } catch {
            // skip non-matching logs
          }
        }
        invoiceId ??= 0
      }

      const paymentLink = `${config.appUrl}/pay/${invoiceId}`
      const qrDataUrl = await QRCode.toDataURL(paymentLink, { width: 180, margin: 1 })

      setResult({ invoiceId, paymentLink, qrDataUrl })
      setStatus('done')
      onCreated?.(invoiceId)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err))
      setStatus('error')
    }
  }

  return (
    <div className="card">
      <h2>Create Invoice {demoMode && <span className="demo-badge">DEMO</span>}</h2>

      {status !== 'done' && (
        <form onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="amountUsd">Amount (MUSD)</label>
            <input
              id="amountUsd"
              name="amountUsd"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="e.g. 25.00"
              value={values.amountUsd}
              onChange={handleChange}
              aria-describedby={errors.amountUsd ? 'err-amount' : undefined}
            />
            {errors.amountUsd && <span id="err-amount" className="error">{errors.amountUsd}</span>}
          </div>

          <div className="field">
            <label htmlFor="label">Label</label>
            <input
              id="label"
              name="label"
              type="text"
              placeholder="e.g. 2kg of rice"
              value={values.label}
              onChange={handleChange}
              aria-describedby={errors.label ? 'err-label' : undefined}
            />
            {errors.label && <span id="err-label" className="error">{errors.label}</span>}
          </div>

          <div className="field">
            <label htmlFor="payoutAddress">Payout Address</label>
            <input
              id="payoutAddress"
              name="payoutAddress"
              type="text"
              placeholder="0x…"
              value={values.payoutAddress}
              onChange={handleChange}
              aria-describedby={errors.payoutAddress ? 'err-addr' : undefined}
            />
            {errors.payoutAddress && <span id="err-addr" className="error">{errors.payoutAddress}</span>}
          </div>

          <button type="submit" disabled={status === 'pending'}>
            {status === 'pending' ? 'Creating…' : demoMode ? 'Create (DEMO)' : 'Create Invoice'}
          </button>
        </form>
      )}

      {status === 'error' && errorMsg && (
        <p className="error">Error: {errorMsg}</p>
      )}

      {txHash && (
        <p className="tx-hash">
          Tx: <a href={`https://testnet.bscscan.com/tx/${txHash}`} target="_blank" rel="noreferrer">{txHash}</a>
        </p>
      )}

      {result && (
        <div className="invoice-result">
          {demoMode && <div className="demo-banner">DEMO — no real funds</div>}
          <p><strong>Invoice #{result.invoiceId}</strong> created!</p>
          <p>Payment link:</p>
          <code className="payment-link">{result.paymentLink}</code>
          <div className="qr-wrap">
            <img src={result.qrDataUrl} alt={`QR code for invoice #${result.invoiceId}`} width={180} height={180} />
          </div>
          <button onClick={() => { navigator.clipboard.writeText(result.paymentLink) }}>
            Copy link
          </button>
        </div>
      )}
    </div>
  )
}
