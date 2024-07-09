import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ProjectModule } from './project/project.module';
import { KafkaConsumerManagerModule } from './kafka-consumer-manager/kafka-consumer-manager.module';
import { LogSocketModule } from './log-socket/log-socket.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: `.env.${process.env.NODE_ENV}`,
      isGlobal: true
    }),
    
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'myuser',
      password: 'mypassword',
      database: 'mydatabase',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: process.env.NODE_ENV==='development'? true : null,
      logging:true,
      ssl: process.env.NODE_ENV==='production'? true : null
    }),
    
    ProjectModule,
    
    KafkaConsumerManagerModule,
    
    LogSocketModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
