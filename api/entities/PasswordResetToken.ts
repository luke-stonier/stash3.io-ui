// entities/PasswordResetToken.ts
import { Entity, PrimaryGeneratedColumn, CreateDateColumn, Column, Index, ManyToOne, JoinColumn } from "typeorm";
import { User } from "./User";

@Entity({ name: "password_reset_tokens" })
export class PasswordResetToken {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Index()
    @Column("uuid")
    userId!: string;

    @ManyToOne(() => User, { onDelete: "CASCADE" })
    @JoinColumn({ name: "userId" })
    user!: User;

    // Store only a HASH of the token (never the raw token)
    @Index({ unique: true })
    @Column({ type: "varchar", length: 128 })
    tokenHash!: string;

    @Index()
    @Column({ type: "timestamptz" })
    expiresAt!: Date;

    @Column({ type: "timestamptz", nullable: true })
    usedAt!: Date | null;

    @CreateDateColumn()
    createdAt!: Date;

    // Optional auditing
    @Column({ type: "varchar", length: 255, nullable: true })
    requestedIp!: string | null;

    @Column({ type: "varchar", length: 255, nullable: true })
    requestedUa!: string | null;
}
