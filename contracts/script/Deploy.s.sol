// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/MockUSD.sol";
import "../src/AgentPayEscrow.sol";

/// @notice Deploy MockUSD + AgentPayEscrow to BSC testnet (chain 97).
///
/// Usage:
///   forge script script/Deploy.s.sol \
///     --rpc-url https://bsc-testnet.bnbchain.org/api/v1/public \
///     --broadcast \
///     --private-key $DEPLOYER_KEY
///
/// Addresses are printed to stdout and must be recorded in
/// deployments/bsc-testnet.json manually.
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
        console2.log("Save to deployments/bsc-testnet.json:");
        console2.log("{");
        console2.log('  "chainId": 97,');
        console2.log('  "mockUSD": "', address(mockUSD), '",');
        console2.log('  "escrow":  "', address(escrow), '"');
        console2.log("}");
    }
}
