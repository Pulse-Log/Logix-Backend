import { Module } from '@nestjs/common';
import { ProjectService } from './project.service';
import { ProjectController } from './project.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from './entities/project.entity';
import { KafkaManager } from 'src/kafka-consumer-manager/kafka-manager.service';
import { JwtAuthGuard } from 'src/global-guard/jwt-auth.guard';
import { PassportModule } from '@nestjs/passport';
import { Stack } from './entities/stack.entity';
import { Signature } from './entities/signature.entity';
import { Source } from './entities/source.entity';
import { Interface } from './entities/interface.entity';

@Module({
  imports:[
    TypeOrmModule.forFeature([Project, Stack, Signature, Source, Interface]), PassportModule
  ],
  controllers: [ProjectController],
  providers: [ProjectService],
  exports: [ProjectService]
})
export class ProjectModule {}
