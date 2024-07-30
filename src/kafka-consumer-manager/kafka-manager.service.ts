import { Inject, Injectable, forwardRef } from "@nestjs/common";
import { Worker } from "worker_threads";
import { LogSocketService } from "src/log-socket/log-socket.service";
import { Project } from "src/project/entities/project.entity";
import { ProjectService } from "src/project/project.service";
import { KafkaMessageDto } from "./dto/kafka-log.dto";
import { identifyKafkaError } from "./kafka-error-detection";
import * as path from 'path';

@Injectable()
export class KafkaManager {
    private workers: Map<string, Worker> = new Map();
    private signatureStackMap: Map<string,Map<string, string[]>> = new Map();
    private stacks: Map<string, string[]> = new Map();

    constructor(
        private projectService: ProjectService,
        @Inject(forwardRef(() => LogSocketService))
        private socketService: LogSocketService
    ) {
        console.log("Initializing Kafka Manager");
    }

    async createConsumer(user_id: string, project_id: string, project: Project) {
        try {
            if(!this.signatureStackMap.has(project_id)){
                this.signatureStackMap.set(project_id, new Map());
            }
            if(!this.stacks.has(project_id)){
                this.stacks.set(project_id, []);
            }
            for(let key of project.stacks){
                this.stacks.get(project_id).push(key.sId);
                for(let sig of key.signatures){
                    if(!this.signatureStackMap.has(sig.topic)){
                        this.signatureStackMap.get(project_id).set(sig.topic, []);
                    }
                    let list = this.signatureStackMap.get(project_id).get(sig.topic);
                    list.push(key.sId);
                    this.signatureStackMap.get(project_id).set(sig.topic, list);
                }
            }
            console.log(this.signatureStackMap);
            console.log(this.stacks);
            const workerData = {
                project_id,
                connectionString: project.source.configuration["broker"],
                username: project.source.configuration["username"],
                password: project.source.configuration["password"],
                topics: this.getTopics(project),
            }; 

            const worker = new Worker(path.join(__dirname, 'kafka-consumer.worker.js'), {
                workerData
            });

            worker.on('message', (message) => {
                if (message.type === 'newLog') {
                    this.socketService.sendLog(message.data, this.signatureStackMap.get(project_id).get(message.data.topic));
                } else if (message.type === 'error') {
                    this.socketService.sendProjectInfoLogs(message.data, this.stacks.get(project_id));
                }
            });

            worker.on('error', (error) => {
                console.error(`Worker error for project ${project_id}:`, error);
                this.handleWorkerError(project_id, error);
            });

            worker.on('exit', (code) => {
                if (code !== 0) {
                    console.error(`Worker for project ${project_id} stopped with exit code ${code}`);
                    this.handleWorkerExit(project_id);
                }
            });

            this.workers.set(project_id.toString(), worker);
        } catch (err) {
            const val = identifyKafkaError(err);
            this.socketService.sendProjectInfoLogs(val, this.stacks.get(project_id));
            await this.removeConsumer(project_id);
            await this.socketService.forceDisconnect(this.stacks.get(project_id));
        }
    }

    private getTopics(project: Project): string[] {
        const topics = new Set<string>();
        for (let group of project.stacks) {
            for (let topic of group.signatures) {
                topics.add(topic.topic);
            }
        }
        return Array.from(topics);
    }

    async removeConsumer(project_id: string) {
        const worker = this.workers.get(project_id.toString());
        if (worker) {
            worker.terminate();
            this.workers.delete(project_id.toString());
        }
    }

    private handleWorkerError(project_id: string, error: Error) {
        const val = identifyKafkaError(error);
        this.socketService.sendProjectInfoLogs(val, this.stacks.get(project_id));
        if (val.errorType === "NumberOfRetriesExceeded" || val.errorType === "NonRetriableError" || val.errorType === "ConnectionError" || val.errorType === "BrokerNotFound") {
            this.removeConsumer(project_id);
            this.socketService.forceDisconnect(this.stacks.get(project_id));
            this.signatureStackMap.delete(project_id);
        }
    }

    checkRunningConsumer(project_id: string){
        return (this.workers.has(project_id))
    }

    private handleWorkerExit(project_id: string) {
        this.removeConsumer(project_id);
        this.signatureStackMap.delete(project_id);
        this.socketService.forceDisconnect(this.stacks.get(project_id));
    }
}