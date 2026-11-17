/**
 * Runtime configuration for the AgentPay dashboard.
 * Values are injected via Vite env vars (VITE_ prefix).
 */

export const config = {
  chainId: 97, // BSC testnet
  rpcUrl:
    import.meta.env.VITE_RPC_URL ??
    "https://bsc-testnet.bnbchain.org/api/v1/public",
  escrowAddress:
    import.meta.env.VITE_ESCROW_ADDRESS ??
    "0x0000000000000000000000000000000000000000",
  tokenAddress:
    import.meta.env.VITE_TOKEN_ADDRESS ??
    "0x0000000000000000000000000000000000000000",
  /** Public base URL used to build shareable payment links. */
  appUrl: import.meta.env.VITE_APP_URL ?? "https://agentpay.vercel.app",
} as const;
