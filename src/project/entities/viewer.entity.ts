import { AbstractEntity } from "src/helper/abstract.entity";
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Component } from "./components.entity";

@Entity()
export class Viewer extends AbstractEntity<Viewer>{
    @PrimaryGeneratedColumn('uuid')
    viewerId: string;

    @Column()
    name: string;

    @OneToMany(()=>Component, (ob)=>ob.viewer)
    components: Component[];
}