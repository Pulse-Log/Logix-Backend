import { Inject, Injectable, forwardRef } from "@nestjs/common";
import { Consumer, Kafka } from "kafkajs";
import { LogSocketService } from "src/log-socket/log-socket.service";
import { Project } from "src/project/entities/project.entity";
import { ProjectService } from "src/project/project.service";
import { KafkaMessageDto } from "./dto/kafka-log.dto";
import { identifyKafkaError } from "./kafka-error-detection";

@Injectable()
export class KafkaManager {
    private consumers: Map<String, Consumer> = new Map();

    constructor(private projectService: ProjectService, @Inject(forwardRef(()=>LogSocketService)) private socketService: LogSocketService){
        console.log("Initializing Kafka");
    }

    async createConsumer(user_id: string, project_id: number, project: Project) {
        try{
            let connectionString = project.bootstrap_string;
        const kafka = new Kafka({'brokers':[connectionString],ssl:true, sasl:{
            mechanism: 'plain',
            username: project.username,
            password: project.password,
          }});
        const consumer = kafka.consumer({groupId: `logix-${project_id}`});
        // await consumer.connect();
        await consumer.connect();
        this.consumers.set(project_id.toString(), consumer);

        let topics = new Set<string>;
        for(let group of project.groups){
            for(let topic of group.identify){
                topics.add(topic.topic_name);
            }
        }

        for(let topic of topics){
            await consumer.subscribe({topic: topic}).catch(err=>{
                let val = identifyKafkaError(err);
                val.description = `Topic: [${topic}] is not defined in the broker. Please make sure that the topic is handled correctly in all the groups.`;
                this.socketService.sendProjectInfoLogs(val, project_id.toString());
            });
        }

        await consumer.run({
            eachMessage: async ({ topic, partition, message }) => {
                console.log({
                    // key: message.key.toString(),
                    value: message.value.toString(),
                    timestamp: message.timestamp,
                    topic: topic,
                    partition: partition,
                });
                const kafkaDto = new KafkaMessageDto();
                kafkaDto.key ="testing";
                kafkaDto.value = JSON.parse(message.value.toString());
                kafkaDto.partition = partition;
                kafkaDto.topic = topic;
                kafkaDto.timestamp = message.timestamp.toString();
                this.socketService.sendLog(kafkaDto, project_id.toString());
            }
        })
        }catch(err){
            const val = identifyKafkaError(err);
            this.socketService.sendProjectInfoLogs(val, project_id.toString());
            if(val.errorType==="NumberOfRetriesExceeded" || val.errorType==="NonRetriableError" || val.errorType==="ConnectionError" || val.errorType==="BrokerNotFound"){
                await this.removeConsumer(project_id);
                await this.socketService.forceDisconnect(project_id.toString());
            }
        }
    }

    async removeConsumer(project_id: number){
        const consumer = this.consumers.get(project_id.toString());
        if(consumer){
            await consumer.disconnect();
            this.consumers.delete(project_id.toString());
        }
    }
}