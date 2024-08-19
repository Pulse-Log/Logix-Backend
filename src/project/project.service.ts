import { forwardRef, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { CreateProjectDto } from './dto/create-project.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Project } from './entities/project.entity';
import { Repository } from 'typeorm';
import { Interface } from './entities/interface.entity';
import { Source } from './entities/source.entity';
import { CreateProjectStackDto } from './dto/create-project-stack.dto';
import { Stack } from './entities/stack.entity';
import { Signature } from './entities/signature.entity';
import { CreateStackSignatureDto } from './dto/create-signature.dto';
import { UpdateStackDto } from './dto/update-stack.dto';
import { UpdateSignaturesDto } from './dto/update-signature.dto';
import { GetUserProjectDto } from './dto/get-user-projects.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { Http } from 'winston/lib/winston/transports';
import { Viewer } from './entities/viewer.entity';
import { CreateComponentDto } from './dto/create-component.dto';
import { Component } from './entities/components.entity';
import { GetStackSignatures } from './dto/get-stack-signatures.dto';
import { KafkaManager } from 'src/kafka-consumer-manager/kafka-manager.service';
import { LogSocketService } from 'src/log-socket/log-socket.service';
import { ProjectSettings } from './entities/settings.entity';
import { CommonUserIdDto } from './dto/common/common.dto';

@Injectable()
export class ProjectService {
  constructor(@InjectRepository(Project) private readonly projectRepository: Repository<Project>,
  @InjectRepository(Interface) private readonly interfaceRepository: Repository<Interface>,
  @InjectRepository(Stack) private readonly stackRepository: Repository<Stack>,
  @InjectRepository(Signature) private readonly signatureRepository: Repository<Signature>,
  @InjectRepository(Viewer) private readonly viewerRepository: Repository<Viewer>,
  @InjectRepository(Component) private readonly componentRepository: Repository<Component>,
  @InjectRepository(ProjectSettings) private readonly projectSettingsRepository: Repository<ProjectSettings>,
  @Inject(forwardRef(()=>KafkaManager))private kafkaManager: KafkaManager,
  @Inject(forwardRef(() => LogSocketService))
        private socketService: LogSocketService
){
    console.log("Initializing Project Service");
    this.startup();
  }

  async startup(){
    const kafka = await this.interfaceRepository.findOne({where: {name: 'Kafka'}});
    const linechart = await this.viewerRepository.findOne({where: {name: 'LineChart'}});
    const terminal = await this.viewerRepository.findOne({where: {name: 'Terminal'}});
    if(!kafka){
      console.log("Creating kafka interface.");
      const kafkaInterface = new Interface({name: 'Kafka'});
      await this.interfaceRepository.save(kafkaInterface);
    }else{
      console.log(kafka.interfaceId);
    }
    if(!terminal){
      console.log("Creating terminal viewer.");
      const terminalInterface = new Viewer({name: 'Terminal'});
      await this.viewerRepository.save(terminalInterface);
    }else{
      console.log(terminal.viewerId);
    }
    if(!linechart){
      console.log("Creating Linechart viewer.");
      const line = new Viewer({name: 'LineChart'});
      await this.viewerRepository.save(line);
    }else{
      console.log(linechart.viewerId);
    }
  }

  async getProject(getUserProjectDto: GetUserProjectDto, projectId: string){
    const project = await this.projectRepository.findOne({where: {projectId: projectId},relations: ["stacks","stacks.signatures"]});
    if(project.userId!==getUserProjectDto.userId){
      throw new HttpException('Invalid access', HttpStatus.FORBIDDEN);
    }
    if(!project){
      throw new HttpException('Project not found', HttpStatus.NOT_FOUND);
    }
    return project;
  }

  async getProjectSettings(getUserProjectDto: GetUserProjectDto, projectId: string){
    const settings = await this.projectSettingsRepository.findOne({where: {projectId: projectId}, relations: ["project", "project.source", "project.source.interface"]});
    if(settings){
      if(settings.project.userId!==getUserProjectDto.userId){
        throw new HttpException('Invalid access', HttpStatus.FORBIDDEN);
      }
      return settings;
    }else{
      const newSettings = new ProjectSettings({projectId: projectId});
      await this.projectSettingsRepository.save(newSettings);
      return await this.projectSettingsRepository.findOne({where: {projectId: projectId}, relations: ["project", "project.source", "project.source.interface"]});
    }
  }

  async getUserProjects(getUserProjectDto: GetUserProjectDto){
    return await this.projectRepository.find({where: {userId: getUserProjectDto.userId}, relations: ["stacks"]});
  }

  async createProject(createProjectDto: CreateProjectDto) {
    const inter = await this.interfaceRepository.findOne({where: {name: createProjectDto.source.interface}});
    if(!inter){
      throw new HttpException('Invalid interface', HttpStatus.BAD_REQUEST);
    }
    if(inter.name==='Kafka'){
      if(createProjectDto.source.configuration["username"]===undefined || createProjectDto.source.configuration["password"]===undefined || createProjectDto.source.configuration["broker"]===undefined){
        throw new HttpException('Missing required configuration parameters for Kafka source', HttpStatus.BAD_REQUEST);
      }
    }
    const project = new Project({...createProjectDto, source: new Source({...createProjectDto.source, interface: inter})});
    const saved =  await this.projectRepository.save(project);
    this.runConsumer(saved.projectId).catch(error => {
      console.error('Async operation failed:', error);
    });

    return saved;
  }

  async runConsumer(projectId: string){
    const project = await this.projectRepository.findOne({where: {projectId: projectId},relations:['stacks', 'source', 'stacks.signatures']});
    await this.kafkaManager.createConsumer(project.userId, project.projectId, project);
  }

  async updateProjectStatus(projectId: string, status: string){
    const project = await this.projectRepository.findOne({where: {projectId: projectId}});
    project.status = status;
    await this.projectRepository.save(project);
  }


  async updateProject(projectId: string, updateProjectDto: UpdateProjectDto){
    try{
      
      let project = await this.projectRepository.findOne({
        where: { projectId: projectId},
        relations: ["settings", "source", "source.interface"],
      });

      if (!project) {
        throw new HttpException('Project not found', HttpStatus.NOT_FOUND);
      }

      if(project.userId!==updateProjectDto.userId){
        throw new HttpException('Invalid access', HttpStatus.FORBIDDEN);
      }

      if(updateProjectDto.settings.connectionTimeout>60){
        throw new HttpException('Invalid connection timeout', HttpStatus.BAD_REQUEST);
      }

      this.projectRepository.merge(project, {...updateProjectDto});

      if (updateProjectDto.source) {
        if(updateProjectDto.source.configuration){
          if(project.source.interface.name==='Kafka'){
            if(updateProjectDto.source.configuration["username"]===undefined || updateProjectDto.source.configuration["password"]===undefined || updateProjectDto.source.configuration["broker"]===undefined){
              throw new HttpException('Missing required configuration parameters for Kafka source', HttpStatus.BAD_REQUEST);
            }
            project.source.configuration = updateProjectDto.source.configuration;
          }
        }
      }
      console.log(project);
      await this.projectRepository.save(project);
      
      if(this.kafkaManager.checkRunningConsumer(project.projectId)){
        this.socketService.restartInterface(project.projectId, project.userId).catch(error => {
          console.error('Restart operation failed:', error);
        });
      }
      return project;
    }catch(err){
      console.error(err);
      throw new HttpException('Failed to update project', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async deleteStack(projectId: string, sId: string, commonDto: CommonUserIdDto){
    const stack = await this.stackRepository.findOne({where: {sId: sId},relations:["project"]});
    if(!stack){
      throw new HttpException('Stack not found', HttpStatus.NOT_FOUND);
    }else if(stack.projectId!==projectId || stack.project.userId!==commonDto.userId){
      throw new HttpException('Invalid access', HttpStatus.FORBIDDEN);
    }
    await this.stackRepository.remove(stack);
    if(this.kafkaManager.checkRunningConsumer(stack.projectId)){
      this.socketService.restartInterface(stack.projectId, stack.project.userId).catch(error => {
        console.error('Restart operation failed:', error);
      });
    }
    return "Deleted successfully";
  }
 
  async deleteSignature(sId: string, signatureId: string, projectId: string, commonDto: CommonUserIdDto){
    let signature = await this.signatureRepository.findOne({where: {signatureId: signatureId}, relations:['stack', 'stack.project']});
    if(!signature || signature.stack.sId!==sId || signature.stack.project.userId!==commonDto.userId || projectId!==signature.stack.projectId){
      throw new HttpException('Not authorized to delete this signature or signature not found', HttpStatus.FORBIDDEN);
    }
    // if(signature.stack.signatures.length===1){
    //   throw new HttpException("Cannot delete last signature.", HttpStatus.BAD_REQUEST);
    // }
    console.log(signature);
    await this.signatureRepository.remove(signature);
    if(this.kafkaManager.checkRunningConsumer(projectId)){
      this.socketService.restartInterface(projectId, commonDto.userId).catch(error => {
        console.error('Restart operation failed:', error);
      });
    }
    return "Signature deleted successfully";
  }

  async getAllInterfaces(){
    return await this.interfaceRepository.find();
  }

  async createProjectGroups(createProjectStackDto: CreateProjectStackDto) {
    const project = await this.projectRepository.findOne({where: {projectId: createProjectStackDto.projectId, userId: createProjectStackDto.userId},relations:['stacks', 'stacks.signatures']});
      if(!project){
        throw new HttpException('Project not found', HttpStatus.NOT_FOUND);
      }
      if(createProjectStackDto.signatures.length===0){
        throw new HttpException("Inculde atleast one signature.",HttpStatus.BAD_REQUEST);
      }
      const stack = new Stack({
        ...createProjectStackDto,
        signatures: createProjectStackDto.signatures.map((signature) => new Signature(signature)),
      });
      await this.stackRepository.save(stack);
      if(this.kafkaManager.checkRunningConsumer(createProjectStackDto.projectId)){
        this.socketService.restartInterface(project.projectId, project.userId).catch(error => {
          console.error('Restart operation failed:', error);
        });;
      }
      return await this.projectRepository.findOne({where: {projectId: createProjectStackDto.projectId},relations:['stacks', 'stacks.signatures']});
  }

  async updateProjectStack(sId: string, updateProjectStackDto: UpdateStackDto) {
    let stack = await this.stackRepository.findOne({where: {sId: sId},relations:['project', 'signatures']});
    if(!stack || stack.project.userId!==updateProjectStackDto.userId){
      throw new HttpException('Not authorized to update this stack or stack not found', HttpStatus.FORBIDDEN);
    }
    this.stackRepository.merge(stack, updateProjectStackDto);
    return await this.stackRepository.save(stack);
  }

  async updateSignature(sId: string, signatureId: string, updateSignatureDto: UpdateSignaturesDto){
    let signature = await this.signatureRepository.findOne({where: {signatureId: signatureId}, relations:['stack', 'stack.project']});
    if(!signature || signature.stack.sId!==sId || signature.stack.project.userId!==updateSignatureDto.userId){
      throw new HttpException('Not authorized to update this signature or signature not found', HttpStatus.FORBIDDEN);
    }
    this.signatureRepository.merge(signature, updateSignatureDto);
    return await this.signatureRepository.save(signature);
  }

  async createstackSignature(createSignatureDto: CreateStackSignatureDto){
    const stack = await this.stackRepository.findOne({where: {sId: createSignatureDto.sId}, relations:["project"]});
    if(!stack) {
      throw new HttpException('Stack not found', HttpStatus.NOT_FOUND);
    }else if(stack.project.userId!==createSignatureDto.userId){
      throw new HttpException('Not authorized to update this project', HttpStatus.FORBIDDEN);
    }
    const signature = new Signature({...createSignatureDto});
    await this.signatureRepository.save(signature);
    if(this.kafkaManager.checkRunningConsumer(stack.projectId)){
      this.socketService.restartInterface(stack.projectId, createSignatureDto.userId).catch(error=>{
        console.error('Restart operation failed:', error);
      })
    }
    return await this.stackRepository.findOne({where: {sId: createSignatureDto.sId}, relations:["project", "signatures"]});
  }
  async createComponent(createComponentDto: CreateComponentDto){
    const stack = await this.stackRepository.findOne({where: {sId: createComponentDto.sId}, relations:['project']});
    if(!stack || stack.project.userId!==createComponentDto.userId){
      throw new HttpException('Not authorized to update this project or stack not found', HttpStatus.FORBIDDEN);
    }
    const component = new Component({...createComponentDto});
    return await this.componentRepository.save(component);
  }

  async getViewers(){
    return await this.viewerRepository.find();
  }

  async getStack(getStackSignatureDto: GetStackSignatures, sId: string){
    const stack = await this.stackRepository.findOne({where: {sId: sId}, relations:['project','signatures', 'components', 'components.signature', 'components.viewer']});
    if(!stack) {
      throw new HttpException('Stack not found', HttpStatus.NOT_FOUND);
    }
    if(stack.project.userId!==getStackSignatureDto.userId){
      throw new HttpException('Not authorized to update this project', HttpStatus.FORBIDDEN);
    }
    return stack;
  }

  async findGroupsOfProject(projectId: string, userId: string) {
    const project = await this.projectRepository.findOne({where: {projectId: projectId, userId: userId}, relations:['stacks', 'source', 'stacks.signatures']});
    return project;
  }

  async deleteProject(projectId: string, commonDto: CommonUserIdDto) {
    const project = await this.projectRepository.findOne({where: {projectId: projectId, userId: commonDto.userId}});
    if (!project) {
      throw new HttpException('Project not found', HttpStatus.NOT_FOUND);
    }
    await this.projectRepository.remove(project);
    if(this.kafkaManager.checkRunningConsumer(projectId)){
      await this.kafkaManager.stopIfRunningConsumer(projectId);
    }
    return "Project deleted successfully";
  }

  async deleteComponent(projectId: string, sId: string, signatureId: string, componentId: string, commonDto: CommonUserIdDto) {
    const component = await this.componentRepository.findOne({where: {componentId: componentId},relations:["stack", "stack.project"]});
    if(!component || component.stack.sId!==sId || component.stack.project.userId!==commonDto.userId || component.stack.projectId!==projectId || component.signatureId!==signatureId){
      throw new HttpException('Component not found or you are not authorized to access it.', HttpStatus.BAD_REQUEST);
    }
    await this.componentRepository.remove(component);
    return "Component deleted successfully";
  }
}
