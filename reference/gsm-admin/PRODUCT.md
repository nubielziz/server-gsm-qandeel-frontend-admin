# Product

<!-- impeccable:product-schema 1 -->

> Provenance: the init interview did not run. The owner asked to continue without stopping, so every fact below is **inferred** from his written brief and the 20-stage build plan (stages 0–13 B2B, 14–19 B2C), not confirmed in an interview. Items marked (inferred) should be confirmed before they bind future work.

## Platform

web

## Stack
Single self-contained HTML file: Tailwind CSS 3.4 compiled and inlined, vanilla JavaScript, fonts embedded. This was specified in the brief ("html و tailwind css"). The real admin will be built later with Refine; this file is a visual and behavioural demo of it.

## Users
- Operators (support and order desk) at a small GSM supplier in Amman who clear one live order queue all day, for both channels: merchant (B2B) orders and storefront (B2C) orders. They complete, reject or retry IMEI, Server, Remote and File service orders, answer one shared support inbox, and approve refunds. (inferred)
- A risk reviewer role (usually the same person) who decides on paid storefront orders the risk checks held, handles card disputes and keeps the blocklist. (inferred)
- A finance/admin role who reviews deposits, withdrawals, wallet adjustments and commission payouts against a double-entry ledger. (inferred)
- The owner, a solo developer who is also the admin, who sets prices, connects suppliers and watches margin, and who adds, suspends and limits other admins (roles: Owner, Admin, Finance, Support, Risk reviewer, Read only) and decides which IP addresses may reach the console, the storefront and the merchant API. (stated in the plan, then by the user)
- Merchants (resellers and repair shops, B2B) and storefront customers (consumers, B2C) are not users of this surface. Merchants use a separate portal and a Dhru-Fusion-v6.1-compatible API; customers use the public storefront. Both are shown here as records and as the people being supported. (stated in the plan)

## Product Purpose
Run a GSM service supply business from one console, selling to merchants (B2B) and directly to consumers (B2C) from the same catalogue, supplier layer and ledger. Merchant orders are paid from a prepaid wallet (hold, then settle or release). Storefront orders are paid first by card, wallet or crypto, and nothing goes to a supplier until payment is confirmed. The console prices each channel above a cost-plus floor, routes orders to upstream suppliers, handles refunds, disputes, support and fraud review, and pays agent commissions. Success is a short queue, no order stuck past its SLA, positive margin on every sale after gateway fees and chargebacks, and a ledger that always balances. (inferred from the plan)

## Positioning
Compatible with Dhru Fusion (merchants can switch with no integration work) but with a real ledger, a price-resolution trace and supplier failover that Dhru-style panels do not show. (inferred)

## Operating Context
- Orders arrive continuously through the merchant API and the public storefront; most are automated, a minority need manual review.
- Money moves in USD. A merchant wallet debit is held at order placement and settled on completion or released on rejection. A storefront customer pays in a local currency at a rate fixed at checkout, prices include VAT where it applies, and the money sits as customer funds until the order completes.
- A paid storefront order can be held by the risk checks (status review) until a person approves it or refunds it. Failed unlocks are refunded automatically; other refunds wait for approval.
- Suppliers are third-party APIs that go slow or down; balances are prepaid.
- Used on a desktop at a desk, with occasional phone checks for approvals.

## Capabilities and Constraints
- Order types: IMEI, Server, Remote, File. Order states: queued, processing, review, completed, rejected. Only IMEI services are sold on the storefront. Channels: api, portal, storefront.
- Storefront price can never go below the B2B base price plus 10%, so merchants never find it cheaper to buy at retail.
- Pricing resolution order: a client override wins, then a group service price. Otherwise the base price takes the category rule, then the group discount. The result can never go below cost plus minimum profit. Storefront customers sit in the system group Retail.
- Ledger accounts: fee_income, gateway_clearing, bank, supplier_prepaid, adjustments, client_wallet, client_hold, commission_expense, revenue, cogs, customer_funds, vat_payable, gateway_fees, chargeback_loss.
- Every mutation writes an audit entry.
- The first release is an MVP; commissions and some reports may ship later. The demo shows them anyway. (inferred)

## Brand Commitments
No existing logo or brand. The brief pins the quality bar: modern SaaS in the vein of Linear, Stripe and Vercel; dense, restrained, no AI-slop patterns. Working name in the demo: "GSM Supply".

## Evidence on Hand
- 20-stage build plan (Claude Docs artifact) and an interactive system map (`/root/gsm-map/dist/gsm-system-map.html`) with the data model (66 tables), 274 routes across 9 API surfaces and the money events for both channels.
- No real customers, orders, supplier names or prices exist yet. All demo data is synthetic and labelled so on screen. Supplier and merchant names are invented.

## Product Principles
1. The queue is the product: what needs a human is always the first thing on the screen.
2. Every amount can be traced: price to its resolution steps, money to its journal entry, change to its audit line.
3. Dense is fine, ambiguous is not: every state has a label as well as a colour.
4. Safe by default: destructive and money-moving actions confirm, then leave a visible trail.

## Accessibility & Inclusion
WCAG 2.2 AA target: 4.5:1 text contrast, visible focus, keyboard-operable tables, dialogs and menus, reduced-motion respected, status never colour-only. Layout uses logical properties so a right-to-left (Arabic) locale can be added later. (inferred)
