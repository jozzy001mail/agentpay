// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/AgentPayEscrow.sol";
import "../src/MockUSD.sol";

// ─── Fuzz tests ───────────────────────────────────────────────────────────────

contract AgentPayEscrowFuzzTest is Test {
    AgentPayEscrow public escrow;
    MockUSD public token;

    address internal merchant = makeAddr("merchant");
    address internal payer = makeAddr("payer");

    function setUp() public {
        escrow = new AgentPayEscrow();
        token = new MockUSD(address(this));
        token.mint(payer, type(uint128).max);
    }

    /// @dev Any amount in [1, MAX_INVOICE_AMOUNT] with any future expiry must succeed.
    function testFuzz_createInvoice_validParams(uint256 amount, uint256 expiry) public {
        amount = bound(amount, 1, escrow.MAX_INVOICE_AMOUNT());
        expiry = bound(expiry, block.timestamp + 1, block.timestamp + 365 days);

        vm.prank(merchant);
        uint256 id = escrow.createInvoice(address(token), amount, merchant, expiry);

        AgentPayEscrow.Invoice memory inv = escrow.getInvoice(id);
        assertEq(inv.amount, amount);
        assertEq(inv.expiry, expiry);
        assertEq(uint256(inv.status), uint256(AgentPayEscrow.Status.CREATED));
    }

    /// @dev Amount 0 always reverts.
    function testFuzz_createInvoice_zeroAmount_alwaysReverts(uint256 expiry) public {
        expiry = bound(expiry, block.timestamp + 1, block.timestamp + 365 days);
        vm.expectRevert(AgentPayEscrow.ZeroAmount.selector);
        vm.prank(merchant);
        escrow.createInvoice(address(token), 0, merchant, expiry);
    }

    /// @dev Amount > cap always reverts.
    function testFuzz_createInvoice_overCap_alwaysReverts(uint256 excess) public {
        excess = bound(excess, 1, type(uint128).max);
        uint256 amount = escrow.MAX_INVOICE_AMOUNT() + excess;
        vm.expectRevert(AgentPayEscrow.AmountExceedsCap.selector);
        vm.prank(merchant);
        escrow.createInvoice(address(token), amount, merchant, block.timestamp + 1 days);
    }

    /// @dev Past expiry always reverts.
    function testFuzz_createInvoice_pastExpiry_alwaysReverts(uint256 amount, uint256 secondsInPast) public {
        amount = bound(amount, 1, escrow.MAX_INVOICE_AMOUNT());
        // expiry = 0..block.timestamp (inclusive)
        uint256 expiry = bound(secondsInPast, 0, block.timestamp);
        vm.expectRevert(AgentPayEscrow.ExpiryInPast.selector);
        vm.prank(merchant);
        escrow.createInvoice(address(token), amount, merchant, expiry);
    }

    /// @dev Full create → pay cycle works for any valid amount.
    function testFuzz_createAndPay(uint256 amount) public {
        amount = bound(amount, 1, escrow.MAX_INVOICE_AMOUNT());

        vm.prank(merchant);
        uint256 id = escrow.createInvoice(address(token), amount, merchant, block.timestamp + 1 days);

        vm.startPrank(payer);
        token.approve(address(escrow), amount);
        escrow.pay(id);
        vm.stopPrank();

        assertEq(token.balanceOf(address(escrow)), amount);
        assertEq(uint256(escrow.getInvoice(id).status), uint256(AgentPayEscrow.Status.PAID));
    }
}

// ─── Invariant tests ──────────────────────────────────────────────────────────

/// @title AgentPayEscrowInvariantHandler
/// @notice Stateful handler that creates and pays invoices so the invariant
///         runner can probe them.
contract InvariantHandler is Test {
    AgentPayEscrow public escrow;
    MockUSD public token;

    address internal merchant = makeAddr("merchant");
    address internal payer = makeAddr("payer");

    uint256[] public invoiceIds;
    uint256 public paidTotal;

    constructor() {
        escrow = new AgentPayEscrow();
        token = new MockUSD(address(this));
        // Give payer a large token balance
        token.mint(payer, type(uint128).max);
    }

    function createAndPay(uint256 amount) external {
        amount = bound(amount, 1, escrow.MAX_INVOICE_AMOUNT());
        uint256 exp = block.timestamp + 1 days;

        vm.prank(merchant);
        uint256 id = escrow.createInvoice(address(token), amount, merchant, exp);

        vm.startPrank(payer);
        token.approve(address(escrow), amount);
        escrow.pay(id);
        vm.stopPrank();

        invoiceIds.push(id);
        paidTotal += amount;
    }

    function releaseOne(uint256 seed) external {
        if (invoiceIds.length == 0) return;
        uint256 idx = seed % invoiceIds.length;
        uint256 id = invoiceIds[idx];
        AgentPayEscrow.Invoice memory inv = escrow.getInvoice(id);
        if (inv.status != AgentPayEscrow.Status.PAID) return;

        paidTotal -= inv.amount;
        vm.prank(merchant);
        escrow.release(id);
    }

    function refundOne(uint256 seed) external {
        if (invoiceIds.length == 0) return;
        uint256 idx = seed % invoiceIds.length;
        uint256 id = invoiceIds[idx];
        AgentPayEscrow.Invoice memory inv = escrow.getInvoice(id);
        if (inv.status != AgentPayEscrow.Status.PAID) return;

        paidTotal -= inv.amount;
        vm.prank(merchant);
        escrow.refund(id);
    }
}

contract AgentPayEscrowInvariantTest is Test {
    InvariantHandler public handler;

    function setUp() public {
        handler = new InvariantHandler();
        // Only let the fuzzer call handler functions
        targetContract(address(handler));
    }

    /// @notice Escrow token balance must equal the sum of all PAID invoice amounts.
    function invariant_escrowBalanceEqualsPaidSum() public view {
        uint256 escrowBalance = handler.token().balanceOf(address(handler.escrow()));
        assertEq(escrowBalance, handler.paidTotal());
    }
}
