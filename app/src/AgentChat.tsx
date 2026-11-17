/**
 * AgentChat — in-app AI chat panel.
 *
 * Recognises create-invoice, status-check, release and refund intents from
 * plain English. Shows the parsed action for user confirmation before anything
 * on-chain. No LLM API key is required; it uses the deterministic parser in
 * chat-intent.ts. When run inside Kiro the full Kiro agent can call MCP tools.
 */
import { useState, useRef, useEffect } from 'react'
import { ethers } from 'ethers'
import { parseIntent, intentToConfirmationText, type ParsedIntent } from './chat-intent'
import { ESCROW_ABI } from './abi'
import { config } from './config'
import type { ChatMessage } from './types'

interface Props {
  demoMode: boolean
}

export default function AgentChat({ demoMode }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'agent',
      text: demoMode
        ? 'Hi! I\'m the AgentPay assistant (DEMO mode). Try: "Create a $25 invoice for delivery fee" or "Release invoice 1".'
        : 'Hi! I\'m the AgentPay assistant. Try: "Create a $25 invoice for delivery fee", "Has invoice 3 been paid?", or "Release invoice 2".',
    },
  ])
  const [input, setInput] = useState('')
  const [pendingIntent, setPendingIntent] = useState<ParsedIntent | null>(null)
  const [pendingPayoutAddress, setPendingPayoutAddress] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  function addMessage(msg: ChatMessage) {
    setMessages((ms) => [...ms, msg])
  }

  async function handleSend() {
    const text = input.trim()
    if (!text) return
    setInput('')
    addMessage({ role: 'user', text })

    const intent = parseIntent(text)
    const response = intentToConfirmationText(intent)

    if (intent.kind === 'unknown') {
      addMessage({ role: 'agent', text: response })
      return
    }

    if (intent.kind === 'status_check') {
      // Fetch and report immediately
      addMessage({ role: 'agent', text: 'Checking…' })
      try {
        let statusText: string
        if (demoMode) {
          statusText = `Invoice #${intent.invoiceId}: status PAID (DEMO — simulated)`
        } else {
          const provider = new ethers.JsonRpcProvider(config.rpcUrl)
          const escrow = new ethers.Contract(config.escrowAddress, ESCROW_ABI, provider)
          const inv = await escrow.getInvoice(BigInt(intent.invoiceId))
          const labels = ['CREATED', 'PAID', 'RELEASED', 'REFUNDED']
          statusText = `Invoice #${intent.invoiceId}: status ${labels[inv.status] ?? inv.status}, amount ${(Number(inv.amount) / 1_000_000).toFixed(2)} MUSD, expiry ${new Date(Number(inv.expiry) * 1000).toLocaleString()}`
        }
        setMessages((ms) => {
          const copy = [...ms]
          copy[copy.length - 1] = { role: 'agent', text: statusText }
          return copy
        })
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err)
        setMessages((ms) => {
          const copy = [...ms]
          copy[copy.length - 1] = { role: 'agent', text: `Could not load invoice: ${errMsg}` }
          return copy
        })
      }
      return
    }

    // For money-moving intents: show confirmation UI
    addMessage({ role: 'agent', text: response })
    setPendingIntent(intent)
  }

  async function handleConfirm() {
    if (!pendingIntent) return

    // Validate extra inputs for create_invoice
    if (pendingIntent.kind === 'create_invoice') {
      if (!pendingPayoutAddress.trim()) {
        addMessage({ role: 'agent', text: 'Please enter your payout address.' })
        return
      }
    }

    addMessage({ role: 'user', text: 'Confirmed.' })
    setPendingIntent(null)

    if (demoMode) {
      await new Promise((r) => setTimeout(r, 600))
      const kind = pendingIntent.kind
      if (kind === 'create_invoice') {
        const ci = pendingIntent as Extract<typeof pendingIntent, { kind: 'create_invoice' }>
        addMessage({ role: 'agent', text: `DEMO — Invoice created for $${ci.amountUsd} MUSD (label: "${ci.label}"). Payment link: ${config.appUrl}/pay/demo-${Date.now()}` })
      } else if (kind === 'release_invoice') {
        const ri = pendingIntent as Extract<typeof pendingIntent, { kind: 'release_invoice' }>
        addMessage({ role: 'agent', text: `DEMO — Invoice #${ri.invoiceId} released. Funds sent to merchant.` })
      } else if (kind === 'refund_invoice') {
        const fi = pendingIntent as Extract<typeof pendingIntent, { kind: 'refund_invoice' }>
        addMessage({ role: 'agent', text: `DEMO — Invoice #${fi.invoiceId} refunded to payer.` })
      }
      setPendingPayoutAddress('')
    }
  }

  function handleCancel() {
    setPendingIntent(null)
    setPendingPayoutAddress('')
    addMessage({ role: 'agent', text: 'Cancelled. What else can I help with?' })
  }

  return (
    <div className="agent-chat">
      <h2>Agent Chat {demoMode && <span className="demo-badge">DEMO</span>}</h2>
      <div className="chat-messages" ref={listRef}>
        {messages.map((msg, i) => (
          <div key={i} className={`chat-msg chat-msg-${msg.role}`}>
            <span className="chat-role">{msg.role === 'agent' ? '🤖' : '👤'}</span>
            <span className="chat-text" style={{ whiteSpace: 'pre-line' }}>{msg.text}</span>
          </div>
        ))}
      </div>

      {pendingIntent && pendingIntent.kind !== 'status_check' && (
        <div className="confirm-box">
          {pendingIntent.kind === 'create_invoice' && (
            <>
              <label>
                Payout address
                <input
                  type="text"
                  placeholder="0x…"
                  value={pendingPayoutAddress}
                  onChange={(e) => setPendingPayoutAddress(e.target.value)}
                />
              </label>
            </>
          )}
          <div className="confirm-actions">
            <button onClick={handleConfirm}>Confirm</button>
            <button className="btn-secondary" onClick={handleCancel}>Cancel</button>
          </div>
        </div>
      )}

      <div className="chat-input-row">
        <input
          type="text"
          placeholder="Type a message…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSend() }}
        />
        <button onClick={handleSend}>Send</button>
      </div>
    </div>
  )
}
