import { Column, CreateDateColumn, Entity, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { Stack } from "./stack.entity";
import { AbstractEntity } from "src/helper/abstract.entity";
import { Source } from "./source.entity";

@Entity()
export class Project extends AbstractEntity<Project>{
    
    @PrimaryGeneratedColumn('uuid')
    projectId: string; 

    @Column()
    name: string;

    @Column()
    description: string;

    @Column()
    userId: string;

    @CreateDateColumn()
    createdAt: Date;

    @OneToOne(()=>Source, (source)=>source.project, {cascade: true})
    source: Source;

    @OneToMany(()=>Stack, (group)=>group.project, {cascade:true})
    stacks: Stack[];
}
