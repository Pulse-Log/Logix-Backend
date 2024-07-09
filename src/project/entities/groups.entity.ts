import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Project } from "./project.entity";
import {Identify} from "./identifications.entity";
import { AbstractEntity } from "src/helper/abstract.entity";

@Entity()
export class Groups extends AbstractEntity<Groups>{
    @PrimaryGeneratedColumn('increment')
    g_id: number;

    @Column()
    name: string;

    @ManyToOne(()=>Project, {onDelete:'CASCADE'})
    @JoinColumn()
    project_id: Project;

    @OneToMany(()=>Identify, (id)=>id.group_id)
    identify: Identify[]

}