import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from "typeorm";

@Entity({ name: "buckets" })
export class Bucket {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Index()
    @Column()
    userId!: string;

    @Index()
    @Column()
    bucket!: string;

    @Column()
    region!: string;

    // store as JSON string: '["list","get","put","delete"]'
    @Column({ type: "text" })
    perms!: string;

    @CreateDateColumn()
    createdAt!: Date;
}
