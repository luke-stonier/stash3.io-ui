import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from "typeorm";

@Entity({ name: "awsAccountRef" })
export class AWSAccountRef {
    @PrimaryGeneratedColumn("uuid")
    id!: string;
    
    @Index()
    @Column()
    userId!: string;

    @Column()
    name: string;

    @Column()
    handle: string;

    @CreateDateColumn()
    createdAt!: Date;
}
