import { Module, forwardRef } from '@nestjs/common';
import { KafkaManager } from './kafka-manager.service';
import { ProjectService } from 'src/project/project.service';
import { LogSocketService } from 'src/log-socket/log-socket.service';
import { ProjectModule } from 'src/project/project.module';
import { LogSocketModule } from 'src/log-socket/log-socket.module';

@Module({
    imports: [forwardRef(()=>ProjectModule), forwardRef(()=>LogSocketModule)],
    providers:[KafkaManager],
    exports: [KafkaManager]
})
export class KafkaConsumerManagerModule {}
