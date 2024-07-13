import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Groups } from "./groups.entity";
import { AbstractEntity } from "src/helper/abstract.entity";

@Entity()
export class Identify extends AbstractEntity<Identify>{
    @PrimaryGeneratedColumn('increment')
    identity_id: number;

    @Column()
    topic_name: string;

    @Column()
    key: string;

    @Column('json')
    schema: Record<string, any>;

    @ManyToOne(()=>Groups, {onDelete: 'CASCADE'})
    @JoinColumn()
    group_id: Groups;
}