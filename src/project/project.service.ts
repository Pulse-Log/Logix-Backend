import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
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

@Injectable()
export class ProjectService {
  constructor(@InjectRepository(Project) private readonly projectRepository: Repository<Project>,
  @InjectRepository(Interface) private readonly interfaceRepository: Repository<Interface>,
  @InjectRepository(Stack) private readonly stackRepository: Repository<Stack>,
  @InjectRepository(Signature) private readonly signatureRepository: Repository<Signature>,
  @InjectRepository(Viewer) private readonly viewerRepository: Repository<Viewer>,
  @InjectRepository(Component) private readonly componentRepository: Repository<Component>
){
    console.log("Initializing Project Service");
    this.startup();
  }

  async startup(){
    const kafka = await this.interfaceRepository.findOne({where: {name: 'Kafka'}});
    const linechart = await this.viewerRepository.findOne({where: {name: 'LineChart'}});
    if(!kafka){
      console.log("Creating kafka interface.");
      const kafkaInterface = new Interface({name: 'Kafka'});
      await this.interfaceRepository.save(kafkaInterface);
    }else{
      console.log(kafka.interfaceId);
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
    const project = await this.projectRepository.findOne({where: {projectId: projectId},relations: ["stacks"]});
    if(project.userId!==getUserProjectDto.userId){
      throw new HttpException('Invalid access', HttpStatus.FORBIDDEN);
    }
    if(!project){
      throw new HttpException('Project not found', HttpStatus.NOT_FOUND);
    }
    return project;
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
    return await this.projectRepository.save(project);
  }


  async updateProject(projectId: string, updateProjectDto: UpdateProjectDto){
    try{
      let project = await this.projectRepository.findOne({
        where: { projectId: projectId, userId: updateProjectDto.userId },
        relations: ['source'],
      });

      if (!project) {
        throw new HttpException('Project not found', HttpStatus.NOT_FOUND);
      }

      this.projectRepository.merge(project, {...updateProjectDto, source:{interfaceId: project.source.interfaceId}});

      if (updateProjectDto.source) {
        if(updateProjectDto.source.interface){
          const interfaceUpdate = await this.interfaceRepository.findOne({where: {name:updateProjectDto.source.interface}});
          if(!interfaceUpdate){
            throw new HttpException('Invalid interface', HttpStatus.BAD_REQUEST);
          }
          project.source.interface = interfaceUpdate;
        }
        if(updateProjectDto.source.configuration){
          if(project.source.interface.name==='Kafka'){
            if(updateProjectDto.source.configuration["username"]===undefined || updateProjectDto.source.configuration["password"]===undefined || updateProjectDto.source.configuration["broker"]===undefined){
              throw new HttpException('Missing required configuration parameters for Kafka source', HttpStatus.BAD_REQUEST);
            }
            project.source.configuration = updateProjectDto.source.configuration;
          }
        }
      }
      await this.projectRepository.save(project);

      return project;
    }catch(err){
      console.error(err);
      throw new HttpException('Failed to update project', HttpStatus.INTERNAL_SERVER_ERROR);
    }
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
        throw new HttpException("Inculde atleast one stack.",HttpStatus.BAD_REQUEST);
      }
      const stack = new Stack({
        ...createProjectStackDto,
        signatures: createProjectStackDto.signatures.map((signature) => new Signature(signature)),
      });

      await this.stackRepository.save(stack);
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

  remove(id: number) {
    return `This action removes a #${id} project`;
  }
}
