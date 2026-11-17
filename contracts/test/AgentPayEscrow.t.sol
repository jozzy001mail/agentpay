// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/AgentPayEscrow.sol";
import "../src/MockUSD.sol";

contract AgentPayEscrowTest is Test {
    AgentPayEscrow public escrow;
    MockUSD public token;

    address internal merchant = makeAddr("merchant");
    address internal payer = makeAddr("payer");
    address internal stranger = makeAddr("stranger");

    uint256 internal constant AMOUNT = 100 * 10 ** 6; // 100 MUSD
    uint256 internal expiry;

    function setUp() public {
        escrow = new AgentPayEscrow();
        token = new MockUSD(address(this));
        expiry = block.timestamp + 1 days;
        // Fund payer
        token.mint(payer, 1_000 * 10 ** 6);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    function _create() internal returns (uint256 id) {
        vm.prank(merchant);
        id = escrow.createInvoice(address(token), AMOUNT, merchant, expiry);
    }

    function _pay(uint256 id) internal {
        vm.startPrank(payer);
        token.approve(address(escrow), AMOUNT);
        escrow.pay(id);
        vm.stopPrank();
    }

    // ─── createInvoice ────────────────────────────────────────────────────────

    function test_createInvoice_emitsAndStores() public {
        vm.expectEmit(true, true, true, true);
        emit AgentPayEscrow.InvoiceCreated(0, address(token), merchant, AMOUNT, expiry);

        uint256 id = _create();
        assertEq(id, 0);

        AgentPayEscrow.Invoice memory inv = escrow.getInvoice(id);
        assertEq(inv.token, address(token));
        assertEq(inv.merchant, merchant);
        assertEq(inv.amount, AMOUNT);
        assertEq(inv.expiry, expiry);
        assertEq(uint256(inv.status), uint256(AgentPayEscrow.Status.CREATED));
        assertEq(inv.payer, address(0));
    }

    function test_createInvoice_incrementsId() public {
        uint256 id0 = _create();
        uint256 id1 = _create();
        assertEq(id0, 0);
        assertEq(id1, 1);
        assertEq(escrow.invoiceCount(), 2);
    }

    function test_createInvoice_revert_zeroAmount() public {
        vm.expectRevert(AgentPayEscrow.ZeroAmount.selector);
        vm.prank(merchant);
        escrow.createInvoice(address(token), 0, merchant, expiry);
    }

    function test_createInvoice_revert_amountExceedsCap() public {
        uint256 overCap = escrow.MAX_INVOICE_AMOUNT() + 1;
        vm.expectRevert(AgentPayEscrow.AmountExceedsCap.selector);
        vm.prank(merchant);
        escrow.createInvoice(address(token), overCap, merchant, expiry);
    }

    function test_createInvoice_exactCap_succeeds() public {
        uint256 cap = escrow.MAX_INVOICE_AMOUNT();
        vm.prank(merchant);
        uint256 id = escrow.createInvoice(address(token), cap, merchant, expiry);
        assertEq(id, 0);
    }

    function test_createInvoice_revert_zeroTokenAddress() public {
        vm.expectRevert(AgentPayEscrow.ZeroTokenAddress.selector);
        vm.prank(merchant);
        escrow.createInvoice(address(0), AMOUNT, merchant, expiry);
    }

    function test_createInvoice_revert_zeroMerchantAddress() public {
        vm.expectRevert(AgentPayEscrow.ZeroMerchantAddress.selector);
        vm.prank(merchant);
        escrow.createInvoice(address(token), AMOUNT, address(0), expiry);
    }

    function test_createInvoice_revert_expiryInPast() public {
        vm.expectRevert(AgentPayEscrow.ExpiryInPast.selector);
        vm.prank(merchant);
        escrow.createInvoice(address(token), AMOUNT, merchant, block.timestamp);
    }

    function test_createInvoice_revert_expiryExactlyNow() public {
        vm.expectRevert(AgentPayEscrow.ExpiryInPast.selector);
        vm.prank(merchant);
        escrow.createInvoice(address(token), AMOUNT, merchant, block.timestamp - 1);
    }

    // ─── pay ──────────────────────────────────────────────────────────────────

    function test_pay_emitsAndStores() public {
        uint256 id = _create();

        vm.startPrank(payer);
        token.approve(address(escrow), AMOUNT);

        vm.expectEmit(true, true, false, false);
        emit AgentPayEscrow.InvoicePaid(id, payer);
        escrow.pay(id);
        vm.stopPrank();

        AgentPayEscrow.Invoice memory inv = escrow.getInvoice(id);
        assertEq(uint256(inv.status), uint256(AgentPayEscrow.Status.PAID));
        assertEq(inv.payer, payer);
        // Funds now in escrow
        assertEq(token.balanceOf(address(escrow)), AMOUNT);
    }

    function test_pay_revert_alreadyPaid() public {
        uint256 id = _create();
        _pay(id);
        vm.startPrank(payer);
        token.approve(address(escrow), AMOUNT);
        vm.expectRevert(AgentPayEscrow.NotCreated.selector);
        escrow.pay(id);
        vm.stopPrank();
    }

    function test_pay_revert_expired() public {
        uint256 id = _create();
        vm.warp(expiry + 1);
        vm.startPrank(payer);
        token.approve(address(escrow), AMOUNT);
        vm.expectRevert(AgentPayEscrow.Expired.selector);
        escrow.pay(id);
        vm.stopPrank();
    }

    function test_pay_revert_notFound() public {
        vm.expectRevert(AgentPayEscrow.NotFound.selector);
        vm.prank(payer);
        escrow.pay(99);
    }

    // ─── release ──────────────────────────────────────────────────────────────

    function test_release_emitsAndTransfers() public {
        uint256 id = _create();
        _pay(id);

        uint256 before = token.balanceOf(merchant);

        vm.expectEmit(true, true, false, true);
        emit AgentPayEscrow.InvoiceReleased(id, merchant, AMOUNT);

        vm.prank(merchant);
        escrow.release(id);

        assertEq(token.balanceOf(merchant), before + AMOUNT);
        assertEq(token.balanceOf(address(escrow)), 0);
        assertEq(uint256(escrow.getInvoice(id).status), uint256(AgentPayEscrow.Status.RELEASED));
    }

    function test_release_revert_notMerchant() public {
        uint256 id = _create();
        _pay(id);
        vm.expectRevert(AgentPayEscrow.NotMerchant.selector);
        vm.prank(stranger);
        escrow.release(id);
    }

    function test_release_revert_notPaid() public {
        uint256 id = _create();
        vm.expectRevert(AgentPayEscrow.NotPaid.selector);
        vm.prank(merchant);
        escrow.release(id);
    }

    function test_release_revert_doubleRelease() public {
        uint256 id = _create();
        _pay(id);
        vm.prank(merchant);
        escrow.release(id);
        vm.expectRevert(AgentPayEscrow.NotPaid.selector);
        vm.prank(merchant);
        escrow.release(id);
    }

    // ─── refund ───────────────────────────────────────────────────────────────

    function test_refund_byMerchant() public {
        uint256 id = _create();
        _pay(id);

        uint256 before = token.balanceOf(payer);

        vm.expectEmit(true, true, false, true);
        emit AgentPayEscrow.InvoiceRefunded(id, payer, AMOUNT);

        vm.prank(merchant);
        escrow.refund(id);

        assertEq(token.balanceOf(payer), before + AMOUNT);
        assertEq(token.balanceOf(address(escrow)), 0);
        assertEq(uint256(escrow.getInvoice(id).status), uint256(AgentPayEscrow.Status.REFUNDED));
    }

    function test_refund_byAnyone_afterExpiry() public {
        uint256 id = _create();
        _pay(id);

        vm.warp(expiry + 1);

        uint256 before = token.balanceOf(payer);

        vm.prank(stranger);
        escrow.refund(id);

        assertEq(token.balanceOf(payer), before + AMOUNT);
    }

    function test_refund_revert_notPaid() public {
        uint256 id = _create();
        vm.expectRevert(AgentPayEscrow.NotPaid.selector);
        vm.prank(merchant);
        escrow.refund(id);
    }

    function test_refund_revert_notExpired_notMerchant() public {
        uint256 id = _create();
        _pay(id);
        // stranger tries to refund before expiry
        vm.expectRevert(AgentPayEscrow.NotExpiredYet.selector);
        vm.prank(stranger);
        escrow.refund(id);
    }

    function test_refund_revert_doubleRefund() public {
        uint256 id = _create();
        _pay(id);
        vm.prank(merchant);
        escrow.refund(id);
        vm.expectRevert(AgentPayEscrow.NotPaid.selector);
        vm.prank(merchant);
        escrow.refund(id);
    }

    // ─── Expiry edge-cases ────────────────────────────────────────────────────

    function test_payAtExactExpiry_reverts() public {
        uint256 id = _create();
        vm.warp(expiry);
        vm.startPrank(payer);
        token.approve(address(escrow), AMOUNT);
        vm.expectRevert(AgentPayEscrow.Expired.selector);
        escrow.pay(id);
        vm.stopPrank();
    }

    function test_payOneSecondBeforeExpiry_succeeds() public {
        uint256 id = _create();
        vm.warp(expiry - 1);
        _pay(id);
        assertEq(uint256(escrow.getInvoice(id).status), uint256(AgentPayEscrow.Status.PAID));
    }

    // ─── getInvoice / notFound ─────────────────────────────────────────────────

    function test_getInvoice_revert_notFound() public {
        vm.expectRevert(AgentPayEscrow.NotFound.selector);
        escrow.getInvoice(0);
    }

    // ─── Merchant-only release (REQ-C3) ───────────────────────────────────────

    function test_onlyMerchantCanRelease() public {
        uint256 id = _create();
        _pay(id);
        // Payer cannot release
        vm.expectRevert(AgentPayEscrow.NotMerchant.selector);
        vm.prank(payer);
        escrow.release(id);
        // Merchant can
        vm.prank(merchant);
        escrow.release(id);
    }
}
