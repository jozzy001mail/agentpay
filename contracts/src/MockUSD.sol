// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title MockUSD
/// @notice Demo stablecoin for AgentPay testnet. 6 decimals, mintable by the
///         deployer-held minter address. NEVER deploy to mainnet.
///         No value. For demonstration and testing purposes only.
contract MockUSD is ERC20 {
    uint8 private constant _DECIMALS = 6;
    address public minter;

    error NotMinter();

    constructor(address _minter) ERC20("Mock USD", "MUSD") {
        minter = _minter;
    }

    function decimals() public pure override returns (uint8) {
        return _DECIMALS;
    }

    /// @notice Mint tokens. Only callable by the minter.
    function mint(address to, uint256 amount) external {
        if (msg.sender != minter) revert NotMinter();
        _mint(to, amount);
    }
}
