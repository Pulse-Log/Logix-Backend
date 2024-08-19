import { Column, CreateDateColumn, Entity, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { Stack } from "./stack.entity";
import { AbstractEntity } from "src/helper/abstract.entity";
import { Source } from "./source.entity";
import { ProjectSettings } from "./settings.entity";

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

    @Column({default: "Online"})
    status: string;

    @OneToOne(()=>Source, (source)=>source.project, {cascade: true})
    source: Source;

    @OneToOne(()=>ProjectSettings, (setting)=>setting.project, {cascade: true})
    settings: ProjectSettings;

    @OneToMany(()=>Stack, (group)=>group.project, {cascade:true})
    stacks: Stack[];
}
