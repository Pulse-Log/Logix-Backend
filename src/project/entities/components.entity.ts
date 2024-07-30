import { AbstractEntity } from "src/helper/abstract.entity";
import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { Signature } from "./signature.entity";
import { Viewer } from "./viewer.entity";
import { Stack } from "./stack.entity";

@Entity()
export class Component extends AbstractEntity<Component> {
    @PrimaryGeneratedColumn('uuid')
    componentId: string;

    @Column()
    name: string;

    @Column()
    description: string;

    @Column()
    dataPath: string;

    @Column()
    signatureId: string;

    @ManyToOne(()=>Signature, (ob)=>ob.components,{onDelete: 'CASCADE'})
    @JoinColumn({name:'signatureId'})
    signature: Signature;

    @Column()
    viewerId: string;

    @ManyToOne(()=>Viewer, {onDelete: 'CASCADE'})
    @JoinColumn({name:'viewerId'})
    viewer: Viewer;

    @Column()
    sId: string;
    
    @ManyToOne(()=>Stack, {onDelete: 'CASCADE'})
    @JoinColumn({name:'sId'})
    stack: Stack
}