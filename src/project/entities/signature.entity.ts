import { Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { Stack } from "./stack.entity";
import { AbstractEntity } from "src/helper/abstract.entity";
import { Component } from "./components.entity";

@Entity()
export class Signature extends AbstractEntity<Signature>{
    @PrimaryGeneratedColumn('uuid')
    signatureId: string;

    @Column()
    topic: string;

    @Column({nullable: true})
    key?: string;

    @Column('json')
    schema: Record<string, any>;

    @Column()
    sId: string;

    @ManyToOne(()=>Stack, {onDelete: 'CASCADE'})
    @JoinColumn({name: 'sId'})
    stack: Stack;

    @OneToMany(()=>Component, (ob)=>ob.signature, {cascade: true})
    components: Component[];
}