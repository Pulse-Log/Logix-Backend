// src/log-socket/log-socket.service.ts
import { Inject, Injectable, forwardRef } from "@nestjs/common";
import { ConnectedSocket, MessageBody, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { ProjectService } from "../project/project.service";
import { KafkaMessageDto } from "src/kafka-consumer-manager/dto/kafka-log.dto";
import { KafkaManager } from "src/kafka-consumer-manager/kafka-manager.service";

@Injectable()
@WebSocketGateway({
    namespace: 'logs',
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true,
    },
})
export class LogSocketService implements OnGatewayInit, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    constructor(
        @Inject(forwardRef(() => KafkaManager))
        private kafkaManager: KafkaManager,
        @Inject(forwardRef(() => ProjectService))
        private projectService: ProjectService
    ) {
        console.log("Initializing LogSocketService");
    }

    afterInit(server: Server) {
        server.on('connection', (socket) => {
            console.log("New user connected");
            console.log(socket.id);
        });
    }

    @SubscribeMessage('joinStack')
    async connectProject(@ConnectedSocket() socket: Socket, @MessageBody() body: any) {
        await this.leaveAllRoomsExcept(socket, [socket.id, body.projectId]);
        await this.joinRoom(socket, body);
    }

    @SubscribeMessage('editInterface')
    async editInterface(@ConnectedSocket() socket: Socket, @MessageBody() body: any) {
        if (body.status === "pause") {
            await this.pauseProject(body.projectId);
        } else if (body.status === "restart") {
            await this.restartProject(body.projectId, body.userId);
        }
    }

    @SubscribeMessage('leaveStack')
    async leaveStack(@ConnectedSocket() socket: Socket) {
        await this.leaveAllRoomsExcept(socket, [socket.id, socket.data.projectId]);
    }

    @SubscribeMessage('joinProject')
    async joinProject(@ConnectedSocket() socket: Socket, @MessageBody() body: any) {
        await this.leaveAllRooms(socket);
        const project = await this.projectService.findGroupsOfProject(body.projectId, body.userId);
        if (!project) {
            this.handleProjectNotFound(socket);
            return;
        }
        await this.joinProjectRoom(socket, body, project);
    }

    async handleDisconnect(socket: Socket) {
        await this.leaveAllRooms(socket);
        socket.disconnect(true);
    }

    sendProjectInfoLogs(err: string, project_id: string) {
        const now = new Date();
        const dateTimeString = now.toISOString();
        const formattedError = `${dateTimeString} : ${err}`;
        this.server.to(project_id).emit("project_info_log", formattedError);
    }

    sendLog(message: KafkaMessageDto, sId: string[]) {
        this.server.to(sId).emit("newLog", message);
    }

    sendStatus(projectId: string, status: string) {
        this.server.to(projectId).emit("status", status);
    }

    sendStacksStatus(project_id: string, status:Map<string, Map<string, Set<string>>>){
        this.server.to(project_id).emit('stackStatus',this.serializeNestedMapSet(status));
    }

    sendLpsUpdate(projectId: string, lpsMap: Map<string, number> | undefined) {
        console.log("Updtaessss");
        if(lpsMap!==undefined){
            console.log(lpsMap);
        console.log(Object.fromEntries(lpsMap));
        this.server.to(projectId).emit('lpsUpdate', Object.fromEntries(lpsMap));
        }
        
        
    }

    private async leaveAllRoomsExcept(socket: Socket, exceptRooms: string[]) {
        if (socket.rooms) {
            const rooms = Array.from(socket.rooms);
            for (const room of rooms) {
                if (!exceptRooms.includes(room)) {
                    await socket.leave(room);
                }
            }
        }
    }

    private serializeNestedMapSet(map: Map<string, Map<string, Set<string>>>): object {
        const obj = {};
        for (const [key1, value1] of map.entries()) {
          obj[key1] = {};
          for (const [key2, value2] of value1.entries()) {
            obj[key1][key2] = Array.from(value2);
          }
        }
        return obj;
      }

    private async leaveAllRooms(socket: Socket) {
        if (socket.rooms) {
            const rooms = Array.from(socket.rooms);
            for (const room of rooms) {
                if (room !== socket.id) {
                    await socket.leave(room);
                }
            }
        }
    }

    private async joinRoom(socket: Socket, body: any) {
        socket.join(body.sId);
        socket.data.userId = body.userId;
        socket.data.projectId = body.projectId;
        socket.data.sId = body.sId;
    }

    private async pauseProject(projectId: string) {
        console.log("Changing status to pause");
        await this.kafkaManager.stopIfRunningConsumer(projectId);
        this.sendStatus(projectId, "Offline");
    }

    private async restartProject(projectId: string, userId: string) {
        console.log("Changing status to restart");
        this.sendProjectInfoLogs("Restarting/ starting project. Please wait", projectId);
        this.sendStatus(projectId, "Offline");
        await this.restartInterface(projectId, userId);
        this.kafkaManager.sendStatus(projectId);
    }

    async restartInterface(projectId: string, userId: string) {
        await this.kafkaManager.stopIfRunningConsumer(projectId);
        const project = await this.projectService.findGroupsOfProject(projectId, userId);
        console.log("Creating new consumer");
        this.projectService.updateProjectStatus(projectId, "Online");
        await this.kafkaManager.createConsumer(userId, projectId, project);
    }

    private handleProjectNotFound(socket: Socket) {
        socket.emit('error', 'Project not found');
        socket.disconnect(true);
    }

    private async joinProjectRoom(socket: Socket, body: any, project: any) {
        socket.join(body.projectId);
        socket.data.userId = body.userId;
        socket.data.projectId = body.projectId;
        this.kafkaManager.sendStatus(body.projectId);
    }
}