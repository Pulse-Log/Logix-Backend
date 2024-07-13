import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Project } from "./project.entity";
import {Identify} from "./identifications.entity";
import { AbstractEntity } from "src/helper/abstract.entity";

@Entity()
export class Groups extends AbstractEntity<Groups>{
    @PrimaryGeneratedColumn('increment')
    g_id: number;

    @Column()
    name: string;

    @Column()
    description: string;

    @CreateDateColumn()
    created_at: Date;

    @ManyToOne(()=>Project, (pro)=>pro.groups, {onDelete:'CASCADE'})
    @JoinColumn()
    project_id: Project;

    @OneToMany(()=>Identify, (id)=>id.group_id, {cascade: true})
    identify: Identify[]

}