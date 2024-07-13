import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Groups } from "./groups.entity";
import { AbstractEntity } from "src/helper/abstract.entity";

@Entity()
export class Project extends AbstractEntity<Project>{
    @PrimaryGeneratedColumn('increment')
    p_id: number; 

    @Column()
    name: string;

    @Column()
    description: string;

    @CreateDateColumn()
    created_at: Date;

    @Column()
    bootstrap_string: string;

    @Column()
    username: string;

    @Column()
    password: string;

    @OneToMany(()=>Groups, (group)=>group.project_id, {cascade:true})
    groups: Groups[];
}
