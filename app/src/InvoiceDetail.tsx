/**
 * InvoiceDetail — shows a single invoice with Release / Refund actions.
 * Both actions require a confirmation click and display the tx hash.
 */
import { useEffect, useState } from 'react'
import { ethers } from 'ethers'
import QRCode from 'qrcode'
import { ESCROW_ABI, ERC20_ABI, STATUS_LABEL, InvoiceStatus } from './abi'
import { config } from './config'
import type { Invoice } from './types'

interface Props {
  invoiceId: number
  demoMode: boolean
  onBack: () => void
}

type ActionType = 'release' | 'refund'

export default function InvoiceDetail({ invoiceId, demoMode, onBack }: Props) {
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Action state
  const [confirmAction, setConfirmAction] = useState<ActionType | null>(null)
  const [actionPending, setActionPending] = useState(false)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        let inv: Invoice
        if (demoMode) {
          // Simulate a PAID invoice for the demo
          inv = {
            id: invoiceId,
            token: config.tokenAddress,
            merchant: '0xMerchantDemo',
            payer: '0xPayerDemo',
            amount: 25_000_000n,
            expiry: BigInt(Math.floor(Date.now() / 1000) + 86_400),
            status: InvoiceStatus.PAID,
          }
        } else {
          const provider = new ethers.JsonRpcProvider(config.rpcUrl)
          const escrow = new ethers.Contract(config.escrowAddress, ESCROW_ABI, provider)
          const raw = await escrow.getInvoice(BigInt(invoiceId))
          inv = {
            id: invoiceId,
            token: raw.token,
            merchant: raw.merchant,
            payer: raw.payer,
            amount: raw.amount,
            expiry: raw.expiry,
            status: raw.status as InvoiceStatus,
          }
        }
        if (!cancelled) {
          setInvoice(inv)
          const link = `${config.appUrl}/pay/${invoiceId}`
          const qr = await QRCode.toDataURL(link, { width: 180, margin: 1 })
          setQrDataUrl(qr)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => { cancelled = true }
  }, [invoiceId, demoMode])

  async function executeAction(action: ActionType) {
    if (!invoice) return
    setActionPending(true)
    setActionError(null)
    try {
      if (demoMode) {
        await new Promise((r) => setTimeout(r, 800))
        setTxHash('0xdemo_tx_hash_' + action)
        setConfirmAction(null)
        setInvoice((inv) =>
          inv
            ? {
                ...inv,
                status: action === 'release' ? InvoiceStatus.RELEASED : InvoiceStatus.REFUNDED,
              }
            : inv
        )
      } else {
        const provider = new ethers.BrowserProvider((window as Window & { ethereum?: ethers.Eip1193Provider }).ethereum!)
        const signer = await provider.getSigner()
        const escrow = new ethers.Contract(config.escrowAddress, ESCROW_ABI, signer)

        let tx: ethers.TransactionResponse
        if (action === 'release') {
          tx = await escrow.release(BigInt(invoiceId))
        } else {
          // Refund
          tx = await escrow.refund(BigInt(invoiceId))
        }
        setTxHash(tx.hash)
        await tx.wait()
        setConfirmAction(null)
        setInvoice((inv) =>
          inv
            ? {
                ...inv,
                status: action === 'release' ? InvoiceStatus.RELEASED : InvoiceStatus.REFUNDED,
              }
            : inv
        )
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err))
    } finally {
      setActionPending(false)
    }
  }

  async function demoPayInvoice() {
    if (!invoice) return
    setActionPending(true)
    setActionError(null)
    try {
      if (!demoMode) {
        // Live mode: build approve + pay calldata
        const provider = new ethers.BrowserProvider((window as Window & { ethereum?: ethers.Eip1193Provider }).ethereum!)
        const signer = await provider.getSigner()
        const token = new ethers.Contract(invoice.token, ERC20_ABI, signer)
        const approveTx = await token.approve(config.escrowAddress, invoice.amount)
        await approveTx.wait()
        const escrow = new ethers.Contract(config.escrowAddress, ESCROW_ABI, signer)
        const payTx = await escrow.pay(BigInt(invoiceId))
        setTxHash(payTx.hash)
        await payTx.wait()
        setInvoice((inv) => inv ? { ...inv, status: InvoiceStatus.PAID } : inv)
      } else {
        await new Promise((r) => setTimeout(r, 800))
        setTxHash('0xdemo_pay_tx')
        setInvoice((inv) => inv ? { ...inv, status: InvoiceStatus.PAID, payer: '0xDemoPayerAddr' } : inv)
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err))
    } finally {
      setActionPending(false)
    }
  }

  if (loading) return <div className="card"><p>Loading…</p></div>
  if (error) return <div className="card"><p className="error">{error}</p><button onClick={onBack}>← Back</button></div>
  if (!invoice) return null

  const paymentLink = `${config.appUrl}/pay/${invoiceId}`
  const statusLabel = STATUS_LABEL[invoice.status]

  return (
    <div className="card">
      <button className="btn-sm" onClick={onBack}>← Back</button>
      <h2>Invoice #{invoiceId} {demoMode && <span className="demo-badge">DEMO</span>}</h2>

      {demoMode && <div className="demo-banner">DEMO — no real funds</div>}

      <dl className="invoice-details">
        <dt>Status</dt>
        <dd><span className={`badge badge-${statusLabel.toLowerCase()}`}>{statusLabel}</span></dd>
        <dt>Amount</dt>
        <dd>{(Number(invoice.amount) / 1_000_000).toFixed(2)} MUSD</dd>
        <dt>Merchant</dt>
        <dd className="addr">{invoice.merchant}</dd>
        <dt>Payer</dt>
        <dd className="addr">{invoice.payer === ethers.ZeroAddress ? '—' : invoice.payer}</dd>
        <dt>Expiry</dt>
        <dd>{new Date(Number(invoice.expiry) * 1000).toLocaleString()}</dd>
        <dt>Payment Link</dt>
        <dd>
          <code className="payment-link">{paymentLink}</code>
          <button className="btn-sm" onClick={() => navigator.clipboard.writeText(paymentLink)}>Copy</button>
        </dd>
      </dl>

      {qrDataUrl && (
        <div className="qr-wrap">
          <img src={qrDataUrl} alt={`QR code for invoice #${invoiceId}`} width={180} height={180} />
        </div>
      )}

      {txHash && (
        <p className="tx-hash">
          Tx: {demoMode
            ? <code>{txHash}</code>
            : <a href={`https://sepolia.basescan.org/tx/${txHash}`} target="_blank" rel="noreferrer">{txHash}</a>
          }
        </p>
      )}
      {actionError && <p className="error">{actionError}</p>}

      {/* Actions */}
      {invoice.status === InvoiceStatus.CREATED && (
        <div className="actions">
          <button onClick={demoPayInvoice} disabled={actionPending}>
            {demoMode ? 'Pay (DEMO)' : 'Pay Invoice'}
          </button>
        </div>
      )}

      {invoice.status === InvoiceStatus.PAID && !confirmAction && (
        <div className="actions">
          <button onClick={() => setConfirmAction('release')}>Release Funds</button>
          <button className="btn-secondary" onClick={() => setConfirmAction('refund')}>Refund Payer</button>
        </div>
      )}

      {confirmAction && (
        <div className="confirm-box">
          <p>
            <strong>Confirm {confirmAction}?</strong><br />
            Amount: {(Number(invoice.amount) / 1_000_000).toFixed(2)} MUSD<br />
            {confirmAction === 'release'
              ? <>Recipient: <span className="addr">{invoice.merchant}</span></>
              : <>Refund to: <span className="addr">{invoice.payer}</span></>
            }
          </p>
          <button onClick={() => executeAction(confirmAction)} disabled={actionPending}>
            {actionPending ? 'Processing…' : `Confirm ${confirmAction}`}
          </button>
          <button className="btn-secondary" onClick={() => setConfirmAction(null)} disabled={actionPending}>
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
