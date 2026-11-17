/**
 * AgentPay MCP server — runtime configuration.
 *
 * Values are read from environment variables so the server never embeds
 * addresses or URLs in source. Defaults point at the BSC testnet deployment.
 */

export const config = {
  /** JSON-RPC endpoint for reading chain state. */
  rpcUrl: process.env.AGENTPAY_RPC_URL ?? "https://sepolia.base.org",

  /** Deployed AgentPayEscrow contract address (checksummed). */
  escrowAddress: process.env.AGENTPAY_ESCROW_ADDRESS ?? "0xCaFa05aAc1CEDa6d51425480f7eCE7770aD4700E",

  /** Demo stablecoin address (MockUSD on testnet). */
  tokenAddress: process.env.AGENTPAY_TOKEN_ADDRESS ?? "0x63E19d83d3d983021eB96b3f5405acA21cD6530C",
} as const;
