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

    private map = new Map<string, string>();
    
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
        console.log(body["project_id"]+" "+body["user_id"]);
        let val = this.map.get(socket.id);
        if(val!==undefined){
            console.log("Project changed");
            await this.kafkaManager.removeConsumer(+val);
        }
        console.log("Project changed successfully");
        this.map.set(socket.id, body["project_id"]);
        const project = await this.projectService.findGroupsOfProject(+body["project_id"]);
        if(!project) {
            socket.emit('error', 'Project not found');
            socket.disconnect(true);
            return;
        }
        this.kafkaManager.createConsumer(body["user_id"], +body["project_id"], project);
        socket.join(body["project_id"]);
        socket.data.userId = body["user_id"];
        socket.data.projectId = body["project_id"];
    }

    async handleDisconnect(client: Socket) {
        const project_id = client.data.projectId;
        this.map.delete(client.id);
        if(project_id){
            await this.kafkaManager.removeConsumer(+project_id);
            client.leave(project_id);
            client.disconnect(true);
        }
    }

    sendProjectInfoLogs(err: KafkaErrorDetails, projectId: string){
        this.server.to(projectId).emit("project_info_log",err);
    }

    async forceDisconnect(project_id: string){
        const sockets = await this.server.to(project_id).fetchSockets();
        for(let socket of sockets){
            this.map.delete(socket.id);
        }
        this.server.to(project_id).disconnectSockets(true);
    }


    sendLog(message: KafkaMessageDto, project_id: string){
        this.server.to(project_id).emit("newLog", message);
    }

}