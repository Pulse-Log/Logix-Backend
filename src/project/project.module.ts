import { Module } from '@nestjs/common';
import { ProjectService } from './project.service';
import { ProjectController } from './project.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from './entities/project.entity';
import { Groups } from './entities/groups.entity';
import { Identify } from './entities/identifications.entity';
import { KafkaManager } from 'src/kafka-consumer-manager/kafka-manager.service';
import { JwtAuthGuard } from 'src/global-guard/jwt-auth.guard';
import { PassportModule } from '@nestjs/passport';

@Module({
  imports:[
    TypeOrmModule.forFeature([Project, Groups, Identify]), PassportModule
  ],
  controllers: [ProjectController],
  providers: [ProjectService],
  exports: [ProjectService]
})
export class ProjectModule {}
