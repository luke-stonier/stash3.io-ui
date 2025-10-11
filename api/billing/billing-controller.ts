import {Router} from "express";
import Stripe from "stripe";
import type {Request, Response} from "express";
import * as express from "express";
import path from "path";
import dotenv from "dotenv";
import {AuthRequest} from "../types/auth";
import {db} from "../api";
import {User} from "../entities/User";
import {UserPurchasePlan} from "../entities/UserBilling";

if (process.env.NODE_ENV !== "production") {
    const customEnvPath = process.env.STASH3_ENV
        || path.join(process.cwd(), ".env");  // fallback to local .env
    dotenv.config({path: customEnvPath});
    console.log("[env] loaded from:", customEnvPath);
} else {
    console.log("[env] production mode");
}


const billingRouter = Router();

billingRouter.get("", async (req: AuthRequest, res) => {
    if (!req.user) return res.status(401).json({error: "Unauthorized"});

    const userRepo = db.getRepository(User);
    const billingRepo = db.getRepository(UserPurchasePlan);

    const user = await userRepo.findOneBy({id: req.user.sub});
    if (!user) return res.status(404).json({error: "User not found"});
    const currentPlan = await billingRepo.findOneBy({userId: req.user.sub});
    
    if (!currentPlan || currentPlan.status === 'pending_checkout' || currentPlan.status === 'cancelled') res.status(204).send();
    else res.json({ ...currentPlan });
});


export default billingRouter;