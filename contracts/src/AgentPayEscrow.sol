// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title AgentPayEscrow
/// @notice Non-custodial stablecoin payment-link escrow for AgentPay.
///         Unaudited testnet code — do not use with real funds.
contract AgentPayEscrow is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─── Types ────────────────────────────────────────────────────────────────

    enum Status {
        CREATED,
        PAID,
        RELEASED,
        REFUNDED
    }

    struct Invoice {
        address token;
        address merchant;
        address payer;
        uint256 amount;
        uint256 expiry;
        Status status;
    }

    // ─── Constants ────────────────────────────────────────────────────────────

    /// 10,000 units at 6 decimals (REQ-C6).
    uint256 public constant MAX_INVOICE_AMOUNT = 10_000 * 10 ** 6;

    // ─── State ────────────────────────────────────────────────────────────────

    uint256 private _nextId;
    mapping(uint256 => Invoice) private _invoices;

    // ─── Events ───────────────────────────────────────────────────────────────

    event InvoiceCreated(
        uint256 indexed id,
        address indexed token,
        address indexed merchant,
        uint256 amount,
        uint256 expiry
    );
    event InvoicePaid(uint256 indexed id, address indexed payer);
    event InvoiceReleased(uint256 indexed id, address indexed merchant, uint256 amount);
    event InvoiceRefunded(uint256 indexed id, address indexed payer, uint256 amount);

    // ─── Errors ───────────────────────────────────────────────────────────────

    error ZeroAmount();
    error AmountExceedsCap();
    error ZeroTokenAddress();
    error ZeroMerchantAddress();
    error ExpiryInPast();
    error NotFound();
    error NotCreated();
    error NotPaid();
    error Expired();
    error NotExpiredYet();
    error NotMerchant();

    // ─── Write functions ──────────────────────────────────────────────────────

    /// @notice Create a new invoice.
    /// @param token   ERC20 stablecoin address.
    /// @param amount  Exact token amount (smallest units). Must be ≤ MAX_INVOICE_AMOUNT.
    /// @param merchant Address that can release or refund.
    /// @param expiry  Unix timestamp (must be in the future).
    /// @return id     The new invoice ID.
    function createInvoice(address token, uint256 amount, address merchant, uint256 expiry)
        external
        returns (uint256 id)
    {
        if (amount == 0) revert ZeroAmount();
        if (amount > MAX_INVOICE_AMOUNT) revert AmountExceedsCap();
        if (token == address(0)) revert ZeroTokenAddress();
        if (merchant == address(0)) revert ZeroMerchantAddress();
        if (expiry <= block.timestamp) revert ExpiryInPast();

        id = _nextId++;
        _invoices[id] = Invoice({
            token: token,
            merchant: merchant,
            payer: address(0),
            amount: amount,
            expiry: expiry,
            status: Status.CREATED
        });

        emit InvoiceCreated(id, token, merchant, amount, expiry);
    }

    /// @notice Pay an invoice. Caller must have approved this contract for `amount` of `token`.
    /// @param id Invoice ID.
    function pay(uint256 id) external nonReentrant {
        Invoice storage inv = _get(id);
        if (inv.status != Status.CREATED) revert NotCreated();
        if (block.timestamp >= inv.expiry) revert Expired();

        inv.status = Status.PAID;
        inv.payer = msg.sender;

        IERC20(inv.token).safeTransferFrom(msg.sender, address(this), inv.amount);

        emit InvoicePaid(id, msg.sender);
    }

    /// @notice Release escrowed funds to the merchant's payout address.
    ///         Only the merchant may call this.
    /// @param id Invoice ID.
    function release(uint256 id) external nonReentrant {
        Invoice storage inv = _get(id);
        if (msg.sender != inv.merchant) revert NotMerchant();
        if (inv.status != Status.PAID) revert NotPaid();

        inv.status = Status.RELEASED;
        uint256 amount = inv.amount;
        address merchant = inv.merchant;

        IERC20(inv.token).safeTransfer(merchant, amount);

        emit InvoiceReleased(id, merchant, amount);
    }

    /// @notice Refund the payer.
    ///         The merchant may refund any PAID invoice at any time.
    ///         Anyone may refund a PAID invoice after expiry.
    /// @param id Invoice ID.
    function refund(uint256 id) external nonReentrant {
        Invoice storage inv = _get(id);
        if (inv.status != Status.PAID) revert NotPaid();

        bool byMerchant = (msg.sender == inv.merchant);
        bool afterExpiry = (block.timestamp >= inv.expiry);

        if (!byMerchant && !afterExpiry) revert NotExpiredYet();

        inv.status = Status.REFUNDED;
        uint256 amount = inv.amount;
        address payer = inv.payer;

        IERC20(inv.token).safeTransfer(payer, amount);

        emit InvoiceRefunded(id, payer, amount);
    }

    // ─── View functions ───────────────────────────────────────────────────────

    /// @notice Return the full Invoice struct for a given ID.
    function getInvoice(uint256 id) external view returns (Invoice memory) {
        return _get(id);
    }

    /// @notice Total number of invoices created (IDs run 0 … nextId-1).
    function invoiceCount() external view returns (uint256) {
        return _nextId;
    }

    // ─── Internal helpers ─────────────────────────────────────────────────────

    function _get(uint256 id) internal view returns (Invoice storage) {
        if (id >= _nextId) revert NotFound();
        return _invoices[id];
    }
}
