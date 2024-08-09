import { Inject, Injectable, forwardRef } from "@nestjs/common";
import { Worker } from "worker_threads";
import { LogSocketService } from "../log-socket/log-socket.service";
import { Project } from "../project/entities/project.entity";
import { ProjectService } from "../project/project.service";
import { KafkaMessageDto } from "./dto/kafka-log.dto";
import * as path from 'path';
import { identifyKafkaError } from "./kafka-error-detection";

@Injectable()
export class KafkaManager {
    private workers: Map<string, Worker> = new Map();
    private signatureStackMap: Map<string, Map<string, string[]>> = new Map();
    private statusMap: Map<string,Map<string, Map<string, Set<string>>>> = new Map();

    constructor(
        @Inject(forwardRef(() => ProjectService))
        private projectService: ProjectService,
        @Inject(forwardRef(() => LogSocketService))
        private socketService: LogSocketService
    ) {
        console.log("Initializing Kafka Manager");
    }

    async createConsumer(user_id: string, project_id: string, project: Project) {
        try {
            this.initializeSignatureStackMap(project_id, project);
            console.log(this.signatureStackMap);
            console.log(this.statusMap);
            const workerData = this.prepareWorkerData(project_id, project);
            const worker = this.createWorker(project_id, workerData);
            this.setupWorkerEventListeners(worker, project_id);
            this.workers.set(project_id.toString(), worker);
        } catch (err) {
            await this.handleConsumerCreationError(err, project_id);
        }
    }

    private initializeSignatureStackMap(project_id: string, project: Project) {
        console.log(project);
        if (!this.signatureStackMap.has(project_id)) {
            this.signatureStackMap.set(project_id, new Map());
        }
        if (!this.statusMap.has(project_id)) {
            this.statusMap.set(project_id, new Map());
        }
        for (let key of project.stacks) {
            this.statusMap.get(project_id).set(key.sId,new Map([["Running", new Set<string>()],["Stopped", new Set<string>()]]));
            for (let sig of key.signatures) {
                if (!this.signatureStackMap.get(project_id).has(sig.topic)) {
                    this.signatureStackMap.get(project_id).set(sig.topic, []);
                }
                let list = this.signatureStackMap.get(project_id).get(sig.topic);
                list.push(key.sId);
                this.signatureStackMap.get(project_id).set(sig.topic, list);
            }
        }
    }

    private prepareWorkerData(project_id: string, project: Project) {
        return {
            project_id,
            connectionString: project.source.configuration["broker"],
            username: project.source.configuration["username"],
            password: project.source.configuration["password"],
            topics: this.getTopics(project),
        };
    }

    private createWorker(project_id: string, workerData: any) {
        const worker = new Worker(path.join(__dirname, 'kafka-consumer.worker.js'), {
            workerData
        });
        this.socketService.sendProjectInfoLogs("Starting consumer with projectId: " + project_id, project_id);
        return worker;
    }

    private setupWorkerEventListeners(worker: Worker, project_id: string) {
        worker.on('message', (message) => this.handleWorkerMessage(message, project_id));
        worker.on('error', (error) => this.handleWorkerError(project_id, error));
        worker.on('exit', (code) => this.handleWorkerExit(project_id, code));
    }

    private handleWorkerMessage(message: any, project_id: string) {
        switch (message.type) {
            case 'newLog':
                this.socketService.sendLog(message.data, this.signatureStackMap.get(project_id).get(message.data.topic));
                break;
            case 'error':
            case 'info_log':
                this.socketService.sendProjectInfoLogs(message.data, project_id);
                break;
            case 'online_topic_status':
                console.log("Got "+message.data);
                console.log(this.signatureStackMap.get(project_id));
                console.log(this.signatureStackMap.get(project_id).get(message.data));
                for(let stack of this.signatureStackMap.get(project_id).get(message.data.toString())){
                    console.log("Adding "+ stack);
                    this.statusMap.get(project_id).get(stack).get('Running').add(message.data.toString());
                    this.statusMap.get(project_id).get(stack).get('Stopped').delete(message.data.toString());
                }
                break;
            case 'offline_topic_status':
                for(let stack of this.signatureStackMap.get(project_id).get(message.data.toString())){
                    this.statusMap.get(project_id).get(stack).get('Stopped').add(message.data.toString());
                    this.statusMap.get(project_id).get(stack).get('Running').delete(message.data.toString());
                }
                break;
            case 'status_done':
                console.log("Status completed");
                console.log(this.statusMap);
                this.socketService.sendStacksStatus(project_id, this.statusMap.get(project_id));
                break;    
        }
    }

    private async handleConsumerCreationError(err: any, project_id: string) {
        const val = identifyKafkaError(err);
        this.socketService.sendProjectInfoLogs(`[ErrorCode] ${val.errorCode}`, project_id);
        this.socketService.sendProjectInfoLogs(`[ErrorType] ${val.errorType}`, project_id);
        this.socketService.sendProjectInfoLogs(`[ErrorDescription] ${val.description}`, project_id);
        this.socketService.sendProjectInfoLogs(`[SuggestedAction] ${val.suggestedAction}`, project_id);
        await this.removeConsumer(project_id);
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
        this.projectService.updateProjectStatus(project_id, "Offline");
        if (worker) {
            worker.terminate();
            this.workers.delete(project_id.toString());
        }
    }

    private handleWorkerError(project_id: string, error: Error) {
        const val = identifyKafkaError(error);
        this.logKafkaError(val, project_id);
        if (this.isNonRecoverableError(val.errorType)) {
            this.removeConsumer(project_id);
            this.signatureStackMap.delete(project_id);
            this.statusMap.delete(project_id);
        }
    }

    private logKafkaError(errorDetails: any, project_id: string) {
        this.socketService.sendProjectInfoLogs(`[ErrorCode] ${errorDetails.errorCode}`, project_id);
        this.socketService.sendProjectInfoLogs(`[ErrorType] ${errorDetails.errorType}`, project_id);
        this.socketService.sendProjectInfoLogs(`[ErrorDescription] ${errorDetails.description}`, project_id);
        this.socketService.sendProjectInfoLogs(`[SuggestedAction] ${errorDetails.suggestedAction}`, project_id);
    }

    private isNonRecoverableError(errorType: string): boolean {
        return ["NumberOfRetriesExceeded", "NonRetriableError", "ConnectionError", "BrokerNotFound"].includes(errorType);
    }

    checkRunningConsumer(project_id: string) {
        return this.workers.has(project_id);
    }

    sendStatus(project_id: string){
        if(this.signatureStackMap.has(project_id)){
            this.socketService.sendStacksStatus(project_id, this.statusMap.get(project_id));
            this.socketService.sendStatus(project_id, "Online");
        }else{
            this.socketService.sendStatus(project_id, "Offline");
        }
    }

    async stopIfRunningConsumer(project_id: string) {
        await this.removeConsumer(project_id);
        if (this.workers.get(project_id)) {
            this.socketService.sendProjectInfoLogs("Stopping consumer with projectId: " + project_id, project_id);
        }
        this.signatureStackMap.delete(project_id);
        this.statusMap.delete(project_id);
    }

    private async handleWorkerExit(project_id: string, code: number) {
        if (code !== 0) {
            console.error(`Worker for project ${project_id} stopped with exit code ${code}`);
            this.socketService.sendProjectInfoLogs(`Worker for project ${project_id} stopped with exit code ${code}`, project_id);
            await this.removeConsumer(project_id);
            await this.socketService.sendStatus(project_id, "Offline");
            this.signatureStackMap.delete(project_id);
            this.statusMap.delete(project_id);
        }
    }
}