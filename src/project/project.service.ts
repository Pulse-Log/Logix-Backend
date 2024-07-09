import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Project } from './entities/project.entity';
import { Repository } from 'typeorm';
import { CreateProjectGroupDto } from './dto/create-project-group.dto';
import { Groups } from './entities/groups.entity';
import { Identify } from './entities/identifications.entity';

@Injectable()
export class ProjectService {
  constructor(@InjectRepository(Project) private readonly projectRepository: Repository<Project>){
    console.log("Initializing Project Service");
  }

  async createProject(createProjectDto: CreateProjectDto) {
    const project = new Project({bootstrap_string: createProjectDto.bootstrapString, name: createProjectDto.projectName, 'password':createProjectDto.password, username: createProjectDto.username});
    return await this.projectRepository.save(project);
  }

  async createProjectGroups(createProjectGroupDto: CreateProjectGroupDto) {
    console.log(createProjectGroupDto.project_id)
    const project = await this.projectRepository.findOne({where: {p_id: +createProjectGroupDto.project_id},relations:['groups', 'groups.identify']});
    if(!project){
      throw new HttpException('Project not found', HttpStatus.NOT_FOUND);
    }
    let group = new Groups({'name': createProjectGroupDto.name});
    group.identify = [];
    for(const createIdentificationGroupDto of createProjectGroupDto.identify){
      const identify = new Identify({...createIdentificationGroupDto});
      group.identify.push(identify);
    }
    project.groups.push(group);
    return await this.projectRepository.save(project);
  }

  async findGroupsOfProject(projectId: number) {
    const project = await this.projectRepository.findOne({where: {p_id: projectId}, relations:['groups', 'groups.identify']});
    return project;
  }

  update(id: number, updateProjectDto: UpdateProjectDto) {
    return `This action updates a #${id} project`;
  }

  remove(id: number) {
    return `This action removes a #${id} project`;
  }
}
