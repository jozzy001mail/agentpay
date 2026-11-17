// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title AgentPayEscrow — Property-Based Tests (Kiro PBT)
///
/// These tests encode the escrow state-machine invariants:
///   CREATED → PAID → RELEASED
///   CREATED → PAID → REFUNDED
///   No illegal transitions (e.g. CREATED → RELEASED, PAID → PAID, etc.)
///   Only the payer receives a refund.
///   Only the merchant may release.
///
/// Each property is exercised with fuzzer-driven sequences via Foundry's
/// built-in property testing (boundXxx + expectRevert patterns).

import "forge-std/Test.sol";
import "../src/AgentPayEscrow.sol";
import "../src/MockUSD.sol";

contract AgentPayEscrowPBT is Test {
    AgentPayEscrow public escrow;
    MockUSD public token;

    address internal merchant = makeAddr("merchant");
    address internal payer = makeAddr("payer");
    address internal randomCaller = makeAddr("randomCaller");

    uint256 internal constant AMOUNT = 50 * 10 ** 6;

    function setUp() public {
        escrow = new AgentPayEscrow();
        token = new MockUSD(address(this));
        token.mint(payer, type(uint128).max);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    function _create() internal returns (uint256 id) {
        vm.prank(merchant);
        id = escrow.createInvoice(address(token), AMOUNT, merchant, block.timestamp + 1 days);
    }

    function _pay(uint256 id) internal {
        vm.startPrank(payer);
        token.approve(address(escrow), AMOUNT);
        escrow.pay(id);
        vm.stopPrank();
    }

    // ─── P1: CREATED cannot be released directly ──────────────────────────────

    /// @notice Property: release on a CREATED invoice always reverts.
    function testPBT_release_onCreated_alwaysReverts() public {
        uint256 id = _create();
        vm.expectRevert(AgentPayEscrow.NotPaid.selector);
        vm.prank(merchant);
        escrow.release(id);
    }

    // ─── P2: CREATED cannot be refunded directly ──────────────────────────────

    /// @notice Property: refund on a CREATED invoice always reverts.
    function testPBT_refund_onCreated_alwaysReverts() public {
        uint256 id = _create();
        vm.expectRevert(AgentPayEscrow.NotPaid.selector);
        vm.prank(merchant);
        escrow.refund(id);
    }

    // ─── P3: RELEASED is terminal — no further pay/release/refund ─────────────

    /// @notice Property: once RELEASED, any further mutation reverts.
    function testPBT_released_isTerminal() public {
        uint256 id = _create();
        _pay(id);
        vm.prank(merchant);
        escrow.release(id);

        // Attempt pay
        vm.startPrank(payer);
        token.approve(address(escrow), AMOUNT);
        vm.expectRevert(AgentPayEscrow.NotCreated.selector);
        escrow.pay(id);
        vm.stopPrank();

        // Attempt release again
        vm.expectRevert(AgentPayEscrow.NotPaid.selector);
        vm.prank(merchant);
        escrow.release(id);

        // Attempt refund
        vm.expectRevert(AgentPayEscrow.NotPaid.selector);
        vm.prank(merchant);
        escrow.refund(id);
    }

    // ─── P4: REFUNDED is terminal ─────────────────────────────────────────────

    /// @notice Property: once REFUNDED, any further mutation reverts.
    function testPBT_refunded_isTerminal() public {
        uint256 id = _create();
        _pay(id);
        vm.prank(merchant);
        escrow.refund(id);

        // Attempt pay
        vm.startPrank(payer);
        token.approve(address(escrow), AMOUNT);
        vm.expectRevert(AgentPayEscrow.NotCreated.selector);
        escrow.pay(id);
        vm.stopPrank();

        // Attempt release
        vm.expectRevert(AgentPayEscrow.NotPaid.selector);
        vm.prank(merchant);
        escrow.release(id);

        // Attempt refund
        vm.expectRevert(AgentPayEscrow.NotPaid.selector);
        vm.prank(merchant);
        escrow.refund(id);
    }

    // ─── P5: Refund always goes to payer, never to anyone else ────────────────

    /// @notice Property: refund always credits the payer's balance.
    function testPBT_refund_alwaysGoesToPayer(address caller) public {
        // Caller can be anyone; funds must go to payer.
        vm.assume(caller != address(0));
        uint256 id = _create();
        _pay(id);

        uint256 payerBefore = token.balanceOf(payer);

        // After expiry, any caller can trigger refund.
        vm.warp(block.timestamp + 2 days);
        vm.prank(caller);
        escrow.refund(id);

        assertEq(token.balanceOf(payer), payerBefore + AMOUNT);
        // Caller balance unchanged (they received nothing).
        if (caller != payer) {
            assertEq(token.balanceOf(caller), 0);
        }
    }

    // ─── P6: Release always goes to merchant ─────────────────────────────────

    /// @notice Property: release always credits the merchant's balance.
    function testPBT_release_alwaysGoesToMerchant() public {
        uint256 id = _create();
        _pay(id);

        uint256 merchantBefore = token.balanceOf(merchant);

        vm.prank(merchant);
        escrow.release(id);

        assertEq(token.balanceOf(merchant), merchantBefore + AMOUNT);
    }

    // ─── P7: Only merchant may release, fuzzed over callers ──────────────────

    /// @notice Property: any caller that is not the merchant cannot release.
    function testPBT_onlyMerchantCanRelease(address caller) public {
        vm.assume(caller != merchant);
        vm.assume(caller != address(0));

        uint256 id = _create();
        _pay(id);

        vm.expectRevert(AgentPayEscrow.NotMerchant.selector);
        vm.prank(caller);
        escrow.release(id);
    }

    // ─── P8: Status monotonically advances, never goes backward ──────────────

    /// @notice Property: after each valid transition the new status is strictly
    ///         higher than the previous one (using enum ordinal ordering).
    function testPBT_statusMonotonicallyAdvances() public {
        uint256 id = _create();
        uint256 s0 = uint256(escrow.getInvoice(id).status);
        assertEq(s0, uint256(AgentPayEscrow.Status.CREATED));

        _pay(id);
        uint256 s1 = uint256(escrow.getInvoice(id).status);
        assertGt(s1, s0); // PAID(1) > CREATED(0)

        vm.prank(merchant);
        escrow.release(id);
        uint256 s2 = uint256(escrow.getInvoice(id).status);
        assertGt(s2, s1); // RELEASED(2) > PAID(1)
    }

    // ─── P9: Double-pay always reverts ────────────────────────────────────────

    /// @notice Property: paying an invoice that is already PAID always reverts.
    function testPBT_doublePay_alwaysReverts() public {
        uint256 id = _create();
        _pay(id);

        vm.startPrank(payer);
        token.approve(address(escrow), AMOUNT);
        vm.expectRevert(AgentPayEscrow.NotCreated.selector);
        escrow.pay(id);
        vm.stopPrank();
    }

    // ─── P10: Fuzzed state machine over (action, seed) pairs ─────────────────

    /// @notice Property: a fuzzed sequence of (create → pay → release-or-refund)
    ///         for any valid amount never violates final-status uniqueness:
    ///         status is exactly one of {RELEASED, REFUNDED}, not both.
    function testPBT_finalStatus_isExactlyOne(uint256 amount, bool doRelease) public {
        amount = bound(amount, 1, escrow.MAX_INVOICE_AMOUNT());

        vm.prank(merchant);
        uint256 id = escrow.createInvoice(address(token), amount, merchant, block.timestamp + 1 days);

        vm.startPrank(payer);
        token.approve(address(escrow), amount);
        escrow.pay(id);
        vm.stopPrank();

        vm.prank(merchant);
        if (doRelease) {
            escrow.release(id);
            assertEq(uint256(escrow.getInvoice(id).status), uint256(AgentPayEscrow.Status.RELEASED));
        } else {
            escrow.refund(id);
            assertEq(uint256(escrow.getInvoice(id).status), uint256(AgentPayEscrow.Status.REFUNDED));
        }
    }
}
