import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ProjectModule } from './project/project.module';
import { KafkaConsumerManagerModule } from './kafka-consumer-manager/kafka-consumer-manager.module';
import { LogSocketModule } from './log-socket/log-socket.module';
import { JwtStrategy } from './global-guard/jwt-strategy';
import * as cors from 'cors';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: `.env.${process.env.NODE_ENV}`,
      isGlobal: true
    }),
    
    TypeOrmModule.forRoot({
      type: 'postgres',
      url:'postgres://tsdbadmin:d3w97zzxqi34jszk@lrwt8m3wle.lsfokbxtud.tsdb.cloud.timescale.com:37767/tsdb?sslmode=require',
      database: 'logix-db',
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
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    const corsOptions = {
      origin: 'http://localhost:3000', // Replace with your frontend app's URL
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      credentials: true, // Enable passing cookies, if needed
    };
    
    consumer.apply(cors(corsOptions)).forRoutes('*');
  }
}
