import { AbstractEntity } from "src/helper/abstract.entity";
import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from "typeorm";
import { Project } from "./project.entity";

@Entity()
export class ProjectSettings extends AbstractEntity<ProjectSettings>{
    @PrimaryColumn('uuid')
    projectId: string;

    @OneToOne(()=>Project, (pro)=>pro.settings, {onDelete: 'CASCADE'})
    @JoinColumn({name:'projectId'})
    project: Project;

    @Column({default: 400})
    numberOfLogs: number;

    @Column({default: 30})
    connectionTimeout: number;
}