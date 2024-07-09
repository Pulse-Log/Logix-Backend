import { Module } from '@nestjs/common';
import { ProjectService } from './project.service';
import { ProjectController } from './project.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from './entities/project.entity';
import { Groups } from './entities/groups.entity';
import { Identify } from './entities/identifications.entity';

@Module({
  imports:[
    TypeOrmModule.forFeature([Project, Groups, Identify])
  ],
  controllers: [ProjectController],
  providers: [ProjectService],
})
export class ProjectModule {}
