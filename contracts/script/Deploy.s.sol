// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/MockUSD.sol";
import "../src/AgentPayEscrow.sol";

/// @notice Deploy MockUSD + AgentPayEscrow to Base Sepolia (chain 84532).
///
/// Usage:
///   forge script script/Deploy.s.sol \
///     --rpc-url https://sepolia.base.org \
///     --broadcast \
///     --private-key $DEPLOYER_KEY
///
/// Addresses are printed to stdout and must be recorded in
/// deployments/base-sepolia.json manually.
///
/// Note: Base Sepolia was chosen over BSC testnet because the BSC testnet
/// faucet gates claims on holding 0.002 BNB on BSC mainnet, which neither
/// the deployer nor the user's wallet holds. The contracts are chain-agnostic.
contract Deploy is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_KEY");
        address deployer = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);

        // Deploy demo stablecoin — minter is the deployer so the demo flow
        // can mint tokens for judges without any additional setup.
        MockUSD mockUSD = new MockUSD(deployer);

        // Deploy the escrow — no constructor args, no admin, immutable.
        AgentPayEscrow escrow = new AgentPayEscrow();

        vm.stopBroadcast();

        console2.log("=== AgentPay Testnet Deployment ===");
        console2.log("Chain:        ", block.chainid);
        console2.log("Deployer:     ", deployer);
        console2.log("MockUSD:      ", address(mockUSD));
        console2.log("AgentPayEscrow:", address(escrow));
        console2.log("");
        console2.log("Save to deployments/base-sepolia.json:");
        console2.log("{");
        console2.log('  "chainId": 84532,');
        console2.log('  "mockUSD": "', address(mockUSD), '",');
        console2.log('  "escrow":  "', address(escrow), '"');
        console2.log("}");
    }
}
