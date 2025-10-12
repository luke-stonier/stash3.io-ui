import {Router} from "express";
import Stripe from "stripe";
import type {Request, Response} from "express";
import * as express from "express";
import path from "path";
import dotenv from "dotenv";
import {User} from "../entities/User";
import {db} from "../api";
import {UserPurchasePlan} from "../entities/UserBilling";
import {AuthRequest, RawRequest} from "../types/auth";

if (process.env.NODE_ENV !== "production") {
    const customEnvPath = process.env.STASH3_ENV
        || path.join(process.cwd(), ".env");  // fallback to local .env
    dotenv.config({path: customEnvPath});
    console.log("[env] loaded from:", customEnvPath);
} else {
    console.log("[env] production mode");
}


const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {apiVersion: "2025-08-27.basil"});
const stripeRouter = Router();

/**
 * Env you should set (example):
 * - PRICE_PERSONAL_ONE_TIME      // one-time price id (Personal - Perpetual)
 * - PRICE_PROFESSIONAL_SUB_MONTH // recurring price id (Professional - monthly)
 * - PRICE_TEAM_SUB_MONTH         // recurring price id (Team - monthly)
 * - FRONTEND_URL                 // e.g. https://yourapp.com
 * - STRIPE_WEBHOOK_SECRET        // webhook signing secret
 */

const PRICES = {
    personal: process.env.PRICE_PERSONAL_ONE_TIME!,       // one-time
    professional: process.env.PRICE_PROFESSIONAL_SUB_MONTH!, // subscription
    professional_annual: process.env.PRICE_PROFESSIONAL_SUB_ANNUAL!,              // subscription
} as const;

/**
 * Create a Checkout Session
 * Body: { tier: "personal" | "professional" | "team", accountId: string }
 * - For "personal": mode=payment (perpetual license)
 * - For "professional"/"team": mode=subscription
 */
stripeRouter.post("/checkout/sessions", async (req: AuthRequest, res) => {
    try {
        if (!req.user) return res.status(401).json({error: "Unauthorized"});
        const {tier, accountId, origin} = req.body ?? {};
        if (!tier || !PRICES[tier as keyof typeof PRICES] || !accountId) {
            return res.status(400).json({error: "Invalid tier or accountId"});
        }

        if (req.user.sub !== accountId) {
            return res.status(403).json({error: "Forbidden: accountId does not match user"});
        }
        
        const returnUrl = "https://stash3.io/api/static/holding"

        const isSubscription = tier !== "personal";

        const userRepo = db.getRepository(User);
        const billingRepo = db.getRepository(UserPurchasePlan);

        const user = await userRepo.findOneBy({id: accountId});
        if (!user) return res.status(404).json({error: "User not found"});
        const currentPlan = await billingRepo.findOneBy({userId: accountId});
        if (currentPlan !== null) {
            if (!isSubscription && !currentPlan.isSubscription && currentPlan.status === 'active') { // trying to purchase single plan with existing single plan - block
                return res.status(400).json({error: "You already have an active subscription"});
            }

            if (isSubscription && currentPlan.isSubscription) { // trying to purchase sub with existing sub - block - we manually renew
                return res.status(400).json({error: "You already have an active subscription"});
            }
        }

        const paymentRequest: Stripe.Checkout.SessionCreateParams = {
            mode: isSubscription ? "subscription" : "payment",
            line_items: [{price: PRICES[tier as keyof typeof PRICES], quantity: 1}],
            success_url: `${returnUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${returnUrl}/billing/cancel`,
            metadata: {tier, accountId},
            allow_promotion_codes: true,
            customer_email: req.user.email
        }
        if (!isSubscription) {
            paymentRequest.customer_creation = 'always';
        }
        const session = await stripe.checkout.sessions.create(paymentRequest);

        if (currentPlan === null) {
            const newPlan = billingRepo.create({
                userId: accountId,
                planId: PRICES[tier as keyof typeof PRICES],
                planName: tier,
                status: "pending_checkout",
                isSubscription,
                startDate: new Date(),
                endDate: null,
                lastUpdatedDate: new Date(),
                stripeCustomerId: "",
                stripeSubscriptionId: null,
                stripeInvoiceId: "",
            });
            await billingRepo.save(newPlan);
        } else {
            currentPlan.planId = PRICES[tier as keyof typeof PRICES];
            currentPlan.planName = tier;
            currentPlan.status = "upgrading";
            currentPlan.isSubscription = isSubscription;
            currentPlan.lastUpdatedDate = new Date();
            await billingRepo.save(currentPlan);
        }

        res.json({ id: session.id, url: session.url });
    } catch (err: any) {
        res.status(500).json({error: err.message ?? "failed"});
    }
});

stripeRouter.get("/portal", async (req: AuthRequest, res) => {

    try {
        if (!req.user) return res.status(401).json({error: "Unauthorized"});
        if (!req.user.sub) return res.status(401).json({error: "Unauthorized"});

        const billingRepo = db.getRepository(UserPurchasePlan);
        const billingPlan = await billingRepo.findOneBy({userId: req.user.sub});
        console.log(req.user.sub, billingPlan);
        if (!billingPlan || !billingPlan.stripeCustomerId) return res.status(400).json({error: "No billing profile found"});

        const custId = billingPlan.stripeCustomerId;
        if (!custId) return res.status(400).json({error: "No billing profile found"});

        const portalSession = await stripe.billingPortal.sessions.create({
            customer: custId,
            return_url: "https://stash3.io/api/static/holding/close",
        });

        return res.status(200).json({
            ...portalSession
        });
    } catch (error) {
        console.error("Failed to create portal session", error);
        return res.status(500).json({error: "Failed to create portal session"});
    }
});

stripeRouter.post("/webhooks", express.raw({type: "application/json"}), async (req: RawRequest, res: Response) => {
    const sig = req.headers["stripe-signature"] as string | undefined;
    if (!sig) return res.sendStatus(400).send("Missing signature");
    if (!req.rawBody)  return res.sendStatus(400).send("Missing rawBody");

    let event: Stripe.Event;
    try {
        event = stripe.webhooks.constructEvent(
            req.rawBody,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET!
        );
    } catch (err) {
        return res.status(400).send(`Webhook Error: ${(err as any).message}`);
    }

    const billingRepo = db.getRepository(UserPurchasePlan);
    const now = () => new Date();
    const toDate = (unix?: number | null) =>
        unix ? new Date(unix * 1000) : null;

    // --- Stripe field shims to handle evolving types ---
    const getSubPeriodEnd = (sub: any): number | undefined => {
        return sub?.current_period_end ?? sub?.current_period?.end ?? undefined;
    };

    const getInvoiceSubscriptionId = (invoice: any): string | null => {
        if (typeof invoice?.subscription === "string") return invoice.subscription;
        if (typeof invoice?.subscription?.id === "string")
            return invoice.subscription.id;
        const li = invoice?.lines?.data?.[0];
        if (typeof li?.subscription === "string") return li.subscription;
        if (typeof li?.subscription?.id === "string") return li.subscription.id;
        return null;
    };

    // --- Helpers ---
    const upsertByUser = async (
        userId: string,
        patch: Partial<UserPurchasePlan>
    ) => {
        const row =
            (await billingRepo.findOneBy({userId})) ||
            billingRepo.create({userId});
        Object.assign(row, patch);
        row.startDate = row.startDate ?? now();
        row.lastUpdatedDate = now();
        await billingRepo.save(row);
    };

    const findByStripe = async (opts: {
        subscriptionId?: string | null;
        customerId?: string | null;
    }) => {
        const {subscriptionId, customerId} = opts;
        let row: UserPurchasePlan | null = null;
        if (subscriptionId) {
            row = await billingRepo.findOneBy({
                stripeSubscriptionId: subscriptionId,
            });
        }
        if (!row && customerId) {
            row = await billingRepo.findOneBy({stripeCustomerId: customerId});
        }
        return row;
    };

    // Map Stripe subscription statuses to app statuses
    const subStatusToApp: Record<
        string,
        "active" | "renewing" | "expired" | "cancelled"
    > = {
        active: "active",
        trialing: "active",
        past_due: "renewing",
        unpaid: "renewing",
        incomplete: "renewing",
        paused: "renewing",
        canceled: "cancelled",
        incomplete_expired: "expired",
    };

    const nameFromPriceId = (priceId?: string | null): string | undefined => {
        if (!priceId) return;
        const match = Object.entries(PRICES).find(([, id]) => id === priceId);
        return match?.[0];
    };

    // --- Event handling ---
    switch (event.type) {
        case "checkout.session.completed": {
            const s = event.data.object as Stripe.Checkout.Session;
            const accountId = s.metadata?.accountId as string | undefined;
            const tier = s.metadata?.tier as keyof typeof PRICES | undefined;
            if (!accountId) break;
            
            const eventId = event.id;
            const csId = s.id;
            const invoiceId = (s.invoice as string) ?? "";
            const paymentIntentId = (s.payment_intent as string) ?? "";
            const isSubscription = s.mode === "subscription";
            const subId = (s.subscription as string) ?? null;
            const customerId = (s.customer as string) ?? "";

            await upsertByUser(accountId, {
                status: "active",
                planName: tier ?? (isSubscription ? "professional" : "personal"),
                planId: tier ? PRICES[tier] : PRICES.personal,
                isSubscription,
                stripeInvoiceId: (invoiceId || paymentIntentId || csId || `NO_ID.eventId.${eventId}`).toString(),
                stripeCustomerId: customerId,
                stripeSubscriptionId: subId,
                endDate: null,
            });

            break;
        }

        case "customer.subscription.created":
        case "customer.subscription.updated": {
            const sub = event.data.object as Stripe.Subscription;
            const customerId = (sub.customer as string) ?? "";
            const priceId = sub.items?.data?.[0]?.price?.id ?? undefined;
            const accountId = sub.metadata?.accountId as string | undefined;

            let row: UserPurchasePlan | null = null;
            if (accountId) {
                row = await billingRepo.findOneBy({userId: accountId});
            }
            if (!row) {
                row = await findByStripe({
                    subscriptionId: sub.id,
                    customerId,
                });
            }
            if (!row) break;

            row.status = subStatusToApp[sub.status] ?? "renewing";
            row.isSubscription = true;
            row.stripeCustomerId = customerId || row.stripeCustomerId;
            row.stripeSubscriptionId = sub.id;
            if (priceId) {
                row.planId = priceId;
                row.planName = nameFromPriceId(priceId) ?? row.planName;
            }

            // Handle expiration or renewal
            row.endDate =
                row.status === "expired"
                    ? toDate(getSubPeriodEnd(sub))
                    : null;
            row.lastUpdatedDate = now();
            await billingRepo.save(row);
            break;
        }

        case "customer.subscription.deleted": {
            const sub = event.data.object as Stripe.Subscription;
            const customerId = (sub.customer as string) ?? "";
            const row = await findByStripe({
                subscriptionId: sub.id,
                customerId,
            });
            if (row) {
                const endTs =
                    (sub as any)?.ended_at ?? getSubPeriodEnd(sub) ?? null;
                row.status = "expired";
                row.endDate = toDate(endTs);
                row.lastUpdatedDate = now();
                await billingRepo.save(row);
            }
            break;
        }

        case "invoice.payment_failed":
        case "invoice.paid": {
            const invoice = event.data.object as Stripe.Invoice;
            const subId = getInvoiceSubscriptionId(invoice);
            const customerId = (invoice as any)?.customer ?? null;

            const row =
                (subId
                    ? await billingRepo.findOneBy({stripeSubscriptionId: subId})
                    : null) ??
                (customerId
                    ? await billingRepo.findOneBy({stripeCustomerId: customerId})
                    : null);

            if (row) {
                row.status =
                    event.type === "invoice.paid" ? "active" : "renewing";
                row.stripeInvoiceId = invoice.id || 'unset';
                if (event.type === "invoice.paid") row.endDate = null;
                row.lastUpdatedDate = now();
                await billingRepo.save(row);
            }
            break;
        }
    }

    res.json({received: true});
});


export default stripeRouter;