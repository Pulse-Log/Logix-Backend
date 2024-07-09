import { Module } from '@nestjs/common';
import { ProjectService } from './project.service';
import { ProjectController } from './project.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from './entities/project.entity';
import { Groups } from './entities/groups.entity';
import { Identify } from './entities/identifications.entity';
import { KafkaManager } from 'src/kafka-consumer-manager/kafka-manager.service';

@Module({
  imports:[
    TypeOrmModule.forFeature([Project, Groups, Identify])
  ],
  controllers: [ProjectController],
  providers: [ProjectService],
  exports: [ProjectService]
})
export class ProjectModule {}
