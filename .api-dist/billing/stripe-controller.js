"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const stripe_1 = __importDefault(require("stripe"));
const express = __importStar(require("express"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const customEnvPath = process.env.STASH3_ENV
    || path_1.default.join(process.cwd(), ".env"); // fallback to local .env
dotenv_1.default.config({ path: customEnvPath });
console.log("[env] loaded from:", customEnvPath);
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-08-27.basil" });
const stripeRouter = (0, express_1.Router)();
/**
 * Env you should set (example):
 * - PRICE_PERSONAL_ONE_TIME      // one-time price id (Personal - Perpetual)
 * - PRICE_PROFESSIONAL_SUB_MONTH // recurring price id (Professional - monthly)
 * - PRICE_TEAM_SUB_MONTH         // recurring price id (Team - monthly)
 * - FRONTEND_URL                 // e.g. https://yourapp.com
 * - STRIPE_WEBHOOK_SECRET        // webhook signing secret
 */
const PRICES = {
    personal: process.env.PRICE_PERSONAL_ONE_TIME,
    professional: process.env.PRICE_PROFESSIONAL_SUB_MONTH,
    professional_annual: process.env.PRICE_PROFESSIONAL_SUB_ANNUAL, // subscription
};
/**
 * Create a Checkout Session
 * Body: { tier: "personal" | "professional" | "team", accountId: string }
 * - For "personal": mode=payment (perpetual license)
 * - For "professional"/"team": mode=subscription
 */
stripeRouter.post("/checkout/sessions", async (req, res) => {
    try {
        const { tier, accountId } = req.body ?? {};
        if (!tier || !PRICES[tier] || !accountId) {
            return res.status(400).json({ error: "Invalid tier or accountId" });
        }
        const isSubscription = tier !== "personal";
        // (optional) TODO DB: ensure `accountId` exists and is allowed to start checkout
        // e.g., verify ownership/auth; ensure no active sub if you want one-at-a-time.
        const session = await stripe.checkout.sessions.create({
            mode: isSubscription ? "subscription" : "payment",
            line_items: [{ price: PRICES[tier], quantity: 1 }],
            success_url: `${process.env.FRONTEND_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_URL}/billing/cancel`,
            // carry context to webhook so you can link to your DB
            metadata: { tier, accountId },
            // recommend collecting email to link Stripe customer
            customer_creation: "if_required",
            allow_promotion_codes: true,
        });
        res.json({ id: session.id, url: session.url });
    }
    catch (err) {
        res.status(500).json({ error: err.message ?? "failed" });
    }
});
stripeRouter.post("/webhooks/stripe", express.raw({ type: "application/json" }), (req, res) => {
    const sig = req.headers["stripe-signature"];
    if (!sig)
        return res.sendStatus(400);
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    }
    catch (err) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    // Handle the minimal set: checkout completion + sub lifecycle
    switch (event.type) {
        case "checkout.session.completed": {
            const s = event.data.object;
            const tier = s.metadata?.tier;
            const accountId = s.metadata?.accountId;
            const customerId = s.customer;
            if (s.mode === "subscription") {
                const subId = s.subscription;
                // TODO DB: upsert your `subscription` entity:
                // - key by accountId
                // - store: tier, stripeCustomerId: customerId, stripeSubscriptionId: subId
                // - set status: "active"
                // - set plan type: "professional" or "team"
            }
            else {
                // one-time purchase (perpetual license)
                const paymentIntentId = s.payment_intent;
                // TODO DB: create/mark `subscription` entity for perpetual license:
                // - link to accountId
                // - store: tier="personal", stripeCustomerId: customerId, paymentIntentId
                // - set entitlement: { plan: "personal_perpetual", updatesUntil: <date if you do maintenance window> }
            }
            break;
        }
        case "customer.subscription.updated":
        case "customer.subscription.created": {
            const sub = event.data.object;
            const status = sub.status; // active, past_due, canceled, etc.
            // TODO DB: find `subscription` entity by sub.id and update status/period_end, seats, etc.
            break;
        }
        case "customer.subscription.deleted": {
            const sub = event.data.object;
            // TODO DB: mark your `subscription` entity canceled/ended; revoke Pro/Team entitlements
            break;
        }
        case "invoice.payment_failed": {
            const invoice = event.data.object;
            console.log(`⚠️  Invoice payment failed for invoice ${invoice.id}`);
            console.log(JSON.stringify(invoice, null, 2));
            //const subId = invoice.subscription as string | null;
            // TODO DB/Notification: flag delinquent; optionally grace period
            break;
        }
        // add more handlers as needed
    }
    res.json({ received: true });
});
exports.default = stripeRouter;
