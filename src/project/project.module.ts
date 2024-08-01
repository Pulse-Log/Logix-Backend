import { forwardRef, Module } from '@nestjs/common';
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
import { Component } from './entities/components.entity';
import { Viewer } from './entities/viewer.entity';
import { KafkaConsumerManagerModule } from 'src/kafka-consumer-manager/kafka-consumer-manager.module';
import { LogSocketModule } from 'src/log-socket/log-socket.module';

@Module({
  imports:[
    TypeOrmModule.forFeature([Project, Stack, Signature, Source, Interface, Component, Viewer]), PassportModule, forwardRef(()=>KafkaConsumerManagerModule), forwardRef(()=>LogSocketModule)
  ],
  controllers: [ProjectController],
  providers: [ProjectService],
  exports: [ProjectService]
})
export class ProjectModule {}
