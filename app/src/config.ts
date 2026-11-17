/**
 * Runtime configuration for the AgentPay dashboard.
 * Values are injected via Vite env vars (VITE_ prefix).
 */

export const config = {
  chainId: 84532, // Base Sepolia
  rpcUrl:
    import.meta.env.VITE_RPC_URL ??
    "https://sepolia.base.org",
  escrowAddress:
    import.meta.env.VITE_ESCROW_ADDRESS ??
    "0xCaFa05aAc1CEDa6d51425480f7eCE7770aD4700E",
  tokenAddress:
    import.meta.env.VITE_TOKEN_ADDRESS ??
    "0x63E19d83d3d983021eB96b3f5405acA21cD6530C",
  /** Public base URL used to build shareable payment links. */
  appUrl: import.meta.env.VITE_APP_URL ?? "https://agentpay.vercel.app",
} as const;
