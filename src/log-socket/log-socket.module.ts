import { Module, forwardRef } from '@nestjs/common';
import { LogSocketService } from './log-socket.service';
import { ProjectService } from 'src/project/project.service';
import { KafkaManager } from 'src/kafka-consumer-manager/kafka-manager.service';
import { ProjectModule } from 'src/project/project.module';
import { KafkaConsumerManagerModule } from 'src/kafka-consumer-manager/kafka-consumer-manager.module';

@Module({
    imports: [ProjectModule, forwardRef(()=>KafkaConsumerManagerModule)],
    providers:[LogSocketService],
    exports: [LogSocketService]
})
export class LogSocketModule {}
