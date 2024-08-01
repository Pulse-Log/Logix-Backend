import { AbstractEntity } from "src/helper/abstract.entity";
import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { Project } from "./project.entity";
import { Interface } from "./interface.entity";

@Entity()
export class Source extends AbstractEntity<Source> {

    @PrimaryGeneratedColumn('uuid')
    sourceId: string;

    @Column('json')
    configuration: Record<string,any>;

    @Column()
    projectId: string;

    @Column()
    interfaceId: string;

    @OneToOne(()=>Project, (pro)=>pro.source, {onDelete: 'CASCADE'})
    @JoinColumn({name: 'projectId'})
    project: Project;

    @ManyToOne(()=>Interface, (inte)=>inte.sources)
    @JoinColumn({name: 'interfaceId'})
    interface: Interface;
}