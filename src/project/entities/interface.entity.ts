import { AbstractEntity } from "src/helper/abstract.entity";
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Source } from "./source.entity";

@Entity()
export class Interface extends AbstractEntity<Interface> {
    @PrimaryGeneratedColumn('uuid')
    interfaceId: string;

    @Column()
    name: string;

    @OneToMany(()=>Source, (source)=>source.interface)
    sources: Source[];
}