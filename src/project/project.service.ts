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

@Injectable()
export class ProjectService {
  constructor(@InjectRepository(Project) private readonly projectRepository: Repository<Project>,
  @InjectRepository(Interface) private readonly interfaceRepository: Repository<Interface>,
  @InjectRepository(Stack) private readonly stackRepository: Repository<Stack>,
  @InjectRepository(Signature) private readonly signatureRepository: Repository<Signature>
){
    console.log("Initializing Project Service");
    this.startup();
  }

  async startup(){
    const kafka = await this.interfaceRepository.findOne({where: {name: 'Kafka'}});
    if(!kafka){
      console.log("Creating kafka interface.");
      const kafkaInterface = new Interface({name: 'Kafka'});
      await this.interfaceRepository.save(kafkaInterface);
    }else{
      console.log(kafka.interfaceId);
    }
  }

  async createProject(createProjectDto: CreateProjectDto) {
    const inter = await this.interfaceRepository.findOne({where: {interfaceId: createProjectDto.source.interfaceId}});
    if(!inter){
      throw new HttpException('Invalid interface', HttpStatus.BAD_REQUEST);
    }
    if(inter.name==='Kafka'){
      if(createProjectDto.source.configuration["username"]===undefined || createProjectDto.source.configuration["password"]===undefined || createProjectDto.source.configuration["broker"]===undefined){
        throw new HttpException('Missing required configuration parameters for Kafka source', HttpStatus.BAD_REQUEST);
      }
    }
    const project = new Project({...createProjectDto, source: new Source({...createProjectDto.source})});
    return await this.projectRepository.save(project);
  }


  async updateProject(projectId: string, updateProjectDto: CreateProjectDto){
    try{
      let project = await this.projectRepository.findOne({
        where: { projectId: projectId, userId: updateProjectDto.userId },
        relations: ['source'],
      });

      if (!project) {
        throw new HttpException('Project not found', HttpStatus.NOT_FOUND);
      }

      this.projectRepository.merge(project, updateProjectDto);

      if (updateProjectDto.source) {
        if(updateProjectDto.source.interfaceId){
          const interfaceUpdate = await this.interfaceRepository.findOne({where: {interfaceId:updateProjectDto.source.interfaceId}});
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

  async findGroupsOfProject(projectId: string, userId: string) {
    const project = await this.projectRepository.findOne({where: {projectId: projectId, userId: userId}, relations:['stacks', 'source', 'stacks.signatures']});
    return project;
  }

  remove(id: number) {
    return `This action removes a #${id} project`;
  }
}
