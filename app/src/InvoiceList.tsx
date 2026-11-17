/**
 * InvoiceList — shows all invoices from InvoiceCreated events.
 * Read-only: uses a public JSON-RPC provider, no wallet needed.
 */
import { useEffect, useState } from 'react'
import { ethers } from 'ethers'
import { ESCROW_ABI, STATUS_LABEL, InvoiceStatus } from './abi'
import { config } from './config'
import type { Invoice } from './types'

const DEMO_INVOICES: Invoice[] = [
  {
    id: 0,
    token: config.tokenAddress,
    merchant: '0xMerchantDemo',
    payer: ethers.ZeroAddress,
    amount: 25_000_000n,
    expiry: BigInt(Math.floor(Date.now() / 1000) + 86_400),
    status: InvoiceStatus.CREATED,
  },
  {
    id: 1,
    token: config.tokenAddress,
    merchant: '0xMerchantDemo',
    payer: '0xPayerDemo',
    amount: 100_000_000n,
    expiry: BigInt(Math.floor(Date.now() / 1000) + 3_600),
    status: InvoiceStatus.PAID,
  },
]

interface Props {
  demoMode: boolean
  onSelectInvoice?: (id: number) => void
}

export default function InvoiceList({ demoMode, onSelectInvoice }: Props) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (demoMode) {
      setInvoices(DEMO_INVOICES)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    async function load() {
      try {
        const provider = new ethers.JsonRpcProvider(config.rpcUrl)
        const escrow = new ethers.Contract(config.escrowAddress, ESCROW_ABI, provider)

        // Fetch created events
        const events = await escrow.queryFilter(escrow.filters.InvoiceCreated())
        if (cancelled) return

        const loaded: Invoice[] = await Promise.all(
          events
            .filter((e): e is ethers.EventLog => e instanceof ethers.EventLog)
            .map(async (ev) => {
              const id = Number(ev.args.id)
              const inv = await escrow.getInvoice(BigInt(id))
              return {
                id,
                token: inv.token,
                merchant: inv.merchant,
                payer: inv.payer,
                amount: inv.amount,
                expiry: inv.expiry,
                status: inv.status as InvoiceStatus,
              }
            })
        )
        if (!cancelled) setInvoices(loaded)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => { cancelled = true }
  }, [demoMode])

  if (loading) return <div className="card"><p>Loading invoices…</p></div>
  if (error) return <div className="card"><p className="error">Could not load invoices: {error}</p></div>

  return (
    <div className="card">
      <h2>Invoices {demoMode && <span className="demo-badge">DEMO</span>}</h2>
      {invoices.length === 0 ? (
        <p>No invoices yet. Create one above.</p>
      ) : (
        <table className="invoice-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Amount (MUSD)</th>
              <th>Status</th>
              <th>Payer</th>
              <th>Expiry</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} className={`status-${STATUS_LABEL[inv.status].toLowerCase()}`}>
                <td>{inv.id}</td>
                <td>{(Number(inv.amount) / 1_000_000).toFixed(2)}</td>
                <td><span className={`badge badge-${STATUS_LABEL[inv.status].toLowerCase()}`}>{STATUS_LABEL[inv.status]}</span></td>
                <td className="addr">
                  {inv.payer === ethers.ZeroAddress ? '—' : `${inv.payer.slice(0, 6)}…${inv.payer.slice(-4)}`}
                </td>
                <td>{new Date(Number(inv.expiry) * 1000).toLocaleDateString()}</td>
                <td>
                  <button className="btn-sm" onClick={() => onSelectInvoice?.(inv.id)}>
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
