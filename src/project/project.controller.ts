import { Controller, Get, Post, Body, Patch, Param, Delete, Inject } from '@nestjs/common';
import { ProjectService } from './project.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { CreateProjectGroupDto } from './dto/create-project-group.dto';

@Controller('project')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}


  @Post('new/group')
  createNewGroup(@Body() createIdentificationGroupDto: CreateProjectGroupDto) {
    return this.projectService.createProjectGroups(createIdentificationGroupDto);
  }
  @Post('new')
  create(@Body() createProjectDto: CreateProjectDto) {
    return this.projectService.createProject(createProjectDto);
  }

  

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.projectService.findGroupsOfProject(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProjectDto: UpdateProjectDto) {
    return this.projectService.update(+id, updateProjectDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.projectService.remove(+id);
  }
}
