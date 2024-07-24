import { Inject, Injectable, forwardRef } from "@nestjs/common";
import { ConnectedSocket, MessageBody, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { KafkaMessage } from "kafkajs";
import { Server, Socket } from "socket.io";
import { KafkaMessageDto } from "src/kafka-consumer-manager/dto/kafka-log.dto";
import { KafkaErrorDetails } from "src/kafka-consumer-manager/kafka-error-detection";
import { KafkaManager } from "src/kafka-consumer-manager/kafka-manager.service";
import { ProjectService } from "src/project/project.service";

@Injectable()
@WebSocketGateway({namespace: 'logs'})
export class LogSocketService implements OnGatewayInit, OnGatewayDisconnect {
    constructor(private projectService: ProjectService, @Inject(forwardRef(()=>KafkaManager))private kafkaManager: KafkaManager){
        console.log("Initializing LogSocketService");
    }
    
    @WebSocketServer()
    server: Server;

    afterInit(server: Server) {
        server.on('connection',(socket)=>{
            console.log("New user connected");
            console.log(socket.id);
        })
    }

    @SubscribeMessage('project')
    async connectProject(@ConnectedSocket() socket: Socket, @MessageBody() body: string) {
        if (socket.rooms) {
            const rooms = Array.from(socket.rooms);
            for (const room of rooms) {
                if (room !== socket.id) {
                    await socket.leave(room);
                }
            }
        }
        console.log(body["projectId"]+" "+body["userId"]);
        const project = await this.projectService.findGroupsOfProject(body["projectId"], body["userId"]);
        if(!project) {
            socket.emit('error', 'Project not found');
            socket.disconnect(true);
            return;
        }
        if(!this.kafkaManager.checkRunningConsumer(body["projectId"])){
            console.log("Creating new consumer");
            await this.kafkaManager.createConsumer(body["userId"], body["projectId"], project);
        }
        socket.join(body["sId"]);
        socket.data.userId = body["userId"];
        socket.data.projectId = body["projectId"];
        socket.data.sId = body["sId"];
    }

    async handleDisconnect(client: Socket) {
        const sId = client.data.sId;
        if(sId){
            client.leave(sId);
            client.disconnect(true);
        }
    }

    sendProjectInfoLogs(err: KafkaErrorDetails, sId: string[]){
        console.log(err);
        console.log(sId);
        this.server.to(sId).emit("project_info_log",err);
    }

    async forceDisconnect(sId: string[]){
        this.server.to(sId).disconnectSockets(true);
    }


    sendLog(message: KafkaMessageDto, sId: string[]){
        this.server.to(sId).emit("newLog", message);
    }

}