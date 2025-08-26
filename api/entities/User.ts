import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from "typeorm";

@Entity({ name: "users" })
export class User {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Index({ unique: true })
    @Column()
    email!: string;

    @Column()
    passwordHash!: string;

    @CreateDateColumn()
    createdAt!: Date;
}
