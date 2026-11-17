/**
 * AgentPay dashboard — root component.
 *
 * Pages: Create Invoice | Invoice List | Invoice Detail
 * Agent chat panel always visible on the right (desktop).
 * Demo mode toggle: labelled DEMO, no wallet or real funds needed.
 */
import { useState } from 'react'
import InvoiceForm from './InvoiceForm'
import InvoiceList from './InvoiceList'
import InvoiceDetail from './InvoiceDetail'
import AgentChat from './AgentChat'
import './App.css'

type Page = 'create' | 'list' | 'detail'

export default function App() {
  const [demoMode, setDemoMode] = useState(true) // safe default
  const [page, setPage] = useState<Page>('list')
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null)

  function goToDetail(id: number) {
    setSelectedInvoiceId(id)
    setPage('detail')
  }

  return (
    <div className="app-layout">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className="app-header">
        <div className="header-left">
          <span className="logo">🧪 AgentPay</span>
          <span className="tagline">Stablecoin payment links</span>
        </div>
        <nav className="app-nav">
          <button className={page === 'list' ? 'nav-active' : ''} onClick={() => setPage('list')}>Invoices</button>
          <button className={page === 'create' ? 'nav-active' : ''} onClick={() => setPage('create')}>Create</button>
        </nav>
        <label className="demo-toggle">
          <input
            type="checkbox"
            checked={demoMode}
            onChange={(e) => setDemoMode(e.target.checked)}
            role="switch"
          />
          {demoMode ? '🔬 DEMO MODE ON' : 'DEMO MODE OFF'}
        </label>
      </header>

      {demoMode && (
        <div className="demo-global-banner">
          DEMO — simulated flow, no real funds, unaudited testnet code
        </div>
      )}

      {/* ── Main area ───────────────────────────────────────────────── */}
      <div className="app-body">
        <main className="app-main">
          {page === 'create' && (
            <InvoiceForm
              demoMode={demoMode}
              onCreated={(id) => { setSelectedInvoiceId(id); setPage('detail') }}
            />
          )}
          {page === 'list' && (
            <>
              <InvoiceList demoMode={demoMode} onSelectInvoice={goToDetail} />
              <div style={{ marginTop: '1rem' }}>
                <button onClick={() => setPage('create')}>+ Create Invoice</button>
              </div>
            </>
          )}
          {page === 'detail' && selectedInvoiceId !== null && (
            <InvoiceDetail
              invoiceId={selectedInvoiceId}
              demoMode={demoMode}
              onBack={() => setPage('list')}
            />
          )}
        </main>

        {/* ── Agent chat panel ──────────────────────────────────────── */}
        <aside className="app-chat">
          <AgentChat demoMode={demoMode} />
        </aside>
      </div>

      <footer className="app-footer">
        <p>
          AgentPay — Kiroween 2026, Frankenstein category.{' '}
          <a href="https://github.com/jozzy001mail/agentpay" target="_blank" rel="noreferrer">GitHub</a>
          {' | '}
          Escrow is unaudited testnet code — do not use with real funds.
        </p>
      </footer>
    </div>
  )
}
