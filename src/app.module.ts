import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ProjectModule } from './project/project.module';
import { KafkaConsumerManagerModule } from './kafka-consumer-manager/kafka-consumer-manager.module';
import { LogSocketModule } from './log-socket/log-socket.module';
import { JwtStrategy } from './global-guard/jwt-strategy';
import * as cors from 'cors';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    
    TypeOrmModule.forRootAsync({
      useFactory:(configService: ConfigService)=>({
        type: configService.get('DATABASE_TYPE'),
      url:configService.get('DATABASE_URL'),
      database: configService.get('DATABASE_NAME'),
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: process.env.NODE_ENV==='development'? true : null,
      logging:true,
      ssl: true,
      }),
      inject:[ConfigService]
      
    }),
    
    ProjectModule,
    
    KafkaConsumerManagerModule,
    
    LogSocketModule,
  ],
  controllers: [AppController],
  providers: [AppService, JwtStrategy, ConfigService],
})
export class AppModule implements NestModule {
  constructor(private configService: ConfigService) {}
  configure(consumer: MiddlewareConsumer) {
    const corsOptions = {
      origin: this.configService.get('CORS_ORIGIN'), // Replace with your frontend app's URL
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      credentials: true, // Enable passing cookies, if needed
    };
    
    consumer.apply(cors(corsOptions)).forRoutes('*');
  }
}
