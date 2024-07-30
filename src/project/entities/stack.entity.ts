import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Project } from "./project.entity";
import { Signature} from "./signature.entity";
import { AbstractEntity } from "src/helper/abstract.entity";
import { Component } from "./components.entity";

@Entity()
export class Stack extends AbstractEntity<Stack>{
    @PrimaryGeneratedColumn('uuid')
    sId: string;

    @Column()
    name: string;

    @Column()
    description: string;

    @CreateDateColumn()
    createdAt: Date;

    @Column()
    projectId: string;

    @ManyToOne(()=>Project, (pro)=>pro.stacks, {onDelete:'CASCADE'})
    @JoinColumn({name: 'projectId'})
    project: Project;

    @OneToMany(()=>Signature, (id)=>id.stack, {cascade: true})
    signatures: Signature[]

    @OneToMany(()=>Component, (ob)=>ob.stack)
    components: Component[]

}