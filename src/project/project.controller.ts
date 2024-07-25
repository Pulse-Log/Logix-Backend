import { Controller, Get, Post, Body, Patch, Param, Delete, Inject, UseGuards, UseFilters, Query } from '@nestjs/common';
import { ProjectService } from './project.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { JwtAuthGuard } from 'src/global-guard/jwt-auth.guard';
import { HttpExceptionFilter } from 'src/helper/filter/exception.filter';
import { UserIdGuard } from 'src/global-guard/userid.guard';
import { CreateProjectStackDto } from './dto/create-project-stack.dto';
import { CreateStackSignatureDto } from './dto/create-signature.dto';
import { UpdateStackDto } from './dto/update-stack.dto';
import { UpdateSignaturesDto } from './dto/update-signature.dto';
import { GetUserProjectDto } from './dto/get-user-projects.dto';

@Controller('project')
@UseFilters(HttpExceptionFilter)
@UseGuards(JwtAuthGuard,UserIdGuard)
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}
  @Get('interfaces')
  getAllInterfaces(){
    return this.projectService.getAllInterfaces();
  }
  @Get('all')
  getAllProjects(@Query() getUserProjectDto: GetUserProjectDto) {
    return this.projectService.getUserProjects(getUserProjectDto);
  }
  @Get(':project_id')
  getUserProject(@Query() getUserProjectDto: GetUserProjectDto, @Param('project_id') id:string) {
    return this.projectService.getProject(getUserProjectDto, id);
  }



  
  @Post('new')
  create(@Body() createProjectDto: CreateProjectDto) {
    return this.projectService.createProject(createProjectDto);
  }
  @Post('stack/new')
  createNewGroup(@Body() createIdentificationGroupDto: CreateProjectStackDto) {
    return this.projectService.createProjectGroups(createIdentificationGroupDto);
  }
  @Post('stack/signature/new')
  createNewSignature(@Body() createSignature: CreateStackSignatureDto) {
    return this.projectService.createstackSignature(createSignature);
  }



  
  @Patch('/:project_id/stack/:id')
  updateStack(@Param('id') id:string, @Body() updateStackdto: UpdateStackDto){
    return this.projectService.updateProjectStack(id, updateStackdto);
  }
  @Patch('/:project_id/stack/:id/signature/:signature')
  updateSignature(@Param('id') sId:string,@Param('signature') signatureId:string, @Body() updateSignatureDto: UpdateSignaturesDto){
    return this.projectService.updateSignature(sId, signatureId, updateSignatureDto);
  }
  @Patch('update/:id')
  update(@Param('id') id: string, @Body() updateProjectDto: CreateProjectDto) {
    return this.projectService.updateProject(id, updateProjectDto);
  }
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.projectService.remove(+id);
  }
}
