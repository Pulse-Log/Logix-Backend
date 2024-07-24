import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Stack } from "./stack.entity";
import { AbstractEntity } from "src/helper/abstract.entity";

@Entity()
export class Signature extends AbstractEntity<Signature>{
    @PrimaryGeneratedColumn('uuid')
    signatureId: string;

    @Column()
    value: string;

    @Column({nullable: true})
    key?: string;

    @Column('json')
    schema: Record<string, any>;

    @Column()
    sId: string;

    @ManyToOne(()=>Stack, {onDelete: 'CASCADE'})
    @JoinColumn({name: 'sId'})
    stack: Stack;
}