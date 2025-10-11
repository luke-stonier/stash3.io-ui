import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
} from "typeorm";

@Entity({ name: "userPurchasePlan" })
export class UserPurchasePlan {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Index()
    @Column({ type: "varchar" })
    userId!: string;

    @CreateDateColumn({ type: "timestamptz", default: () => "CURRENT_TIMESTAMP" })
    startDate!: Date;

    @UpdateDateColumn({ type: "timestamptz" })
    lastUpdatedDate!: Date;

    @Column({ type: "timestamptz", nullable: true })
    endDate!: Date | null;

    @Column({
        type: "enum",
        enum: ["pending_checkout", "active", "renewing", "expired", "cancelled", "upgrading"],
        default: "pending_checkout",
    })
    status!: "pending_checkout" | "active" | "renewing" | "expired" | "cancelled" | "upgrading";

    @Column({ type: "varchar" })
    planName!: string;

    @Column({ type: "varchar" })
    planId!: string;

    @Column({ type: "boolean", default: false })
    isSubscription!: boolean;

    @Column({ type: "varchar" })
    stripeCustomerId!: string;

    @Column({ type: "varchar", nullable: true, default: null })
    stripeSubscriptionId!: string | null;

    @Column({ type: "varchar" })
    stripeInvoiceId!: string;
}
