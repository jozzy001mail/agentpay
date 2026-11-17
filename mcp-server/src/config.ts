/**
 * AgentPay MCP server — runtime configuration.
 *
 * Values are read from environment variables so the server never embeds
 * addresses or URLs in source. Defaults point at the BSC testnet deployment.
 */

export const config = {
  /** JSON-RPC endpoint for reading chain state. */
  rpcUrl: process.env.AGENTPAY_RPC_URL ?? "https://bsc-testnet.bnbchain.org/api/v1/public",

  /** Deployed AgentPayEscrow contract address (checksummed). */
  escrowAddress: process.env.AGENTPAY_ESCROW_ADDRESS ?? "0x0000000000000000000000000000000000000000",

  /** Demo stablecoin address (MockUSD on testnet). */
  tokenAddress: process.env.AGENTPAY_TOKEN_ADDRESS ?? "0x0000000000000000000000000000000000000000",
} as const;
