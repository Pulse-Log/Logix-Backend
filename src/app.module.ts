import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ProjectModule } from './project/project.module';
import { KafkaConsumerManagerModule } from './kafka-consumer-manager/kafka-consumer-manager.module';
import { LogSocketModule } from './log-socket/log-socket.module';
import { JwtStrategy } from './global-guard/jwt-strategy';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: `.env.${process.env.NODE_ENV}`,
      isGlobal: true
    }),
    
    TypeOrmModule.forRoot({
      type: 'postgres',
      url:'postgresql://lakshyabhati24:0oPaImQNi2rX@ep-crimson-firefly-70756794.ap-southeast-1.aws.neon.tech/logix-login?sslmode=require',
      database: 'logix-login',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: process.env.NODE_ENV==='development'? true : null,
      logging:true,
      ssl: true,
    }),
    
    ProjectModule,
    
    KafkaConsumerManagerModule,
    
    LogSocketModule,
  ],
  controllers: [AppController],
  providers: [AppService, JwtStrategy],
})
export class AppModule {}
