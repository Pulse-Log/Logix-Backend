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
import { GetStackSignatures } from './dto/get-stack-signatures.dto';
import { CreateComponentDto } from './dto/create-component.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { CommonUserIdDto } from './dto/common/common.dto';

@Controller('project')
@UseFilters(HttpExceptionFilter)
@UseGuards(JwtAuthGuard,UserIdGuard)
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}
  @Get('interfaces')
  getAllInterfaces(){
    return this.projectService.getAllInterfaces();
  }
  @Get('viewers')
  getAllViewers(){
    return this.projectService.getViewers();
  }
  @Get('all')
  getAllProjects(@Query() getUserProjectDto: GetUserProjectDto) {
    return this.projectService.getUserProjects(getUserProjectDto);
  }
  @Get(':project_id/settings')
  getProjectSettings(@Query() getUserProjectDto: GetUserProjectDto, @Param('project_id') id: string) {
    return this.projectService.getProjectSettings(getUserProjectDto, id);
  }
  @Get(':project_id')
  getUserProject(@Query() getUserProjectDto: GetUserProjectDto, @Param('project_id') id:string) {
    return this.projectService.getProject(getUserProjectDto, id);
  }
  @Get(':project_id/stack/:sId')
  getStack(@Query() getStackSignatureDto: GetStackSignatures, @Param('sId') sId: string){
    return this.projectService.getStack(getStackSignatureDto, sId);
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
  @Post('stack/component/new')
  createComponent(@Body() createComponentDto: CreateComponentDto){
    return this.projectService.createComponent(createComponentDto);
  }



  
  @Patch('/:project_id/stack/:id')
  updateStack(@Param('id') id:string, @Body() updateStackdto: UpdateStackDto){
    return this.projectService.updateProjectStack(id, updateStackdto);
  }
  @Patch('/:project_id/stack/:id/signature/:signature')
  updateSignature(@Param('id') sId:string,@Param('signature') signatureId:string, @Body() updateSignatureDto: UpdateSignaturesDto){
    return this.projectService.updateSignature(sId, signatureId, updateSignatureDto);
  }
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProjectDto: UpdateProjectDto) {
    return this.projectService.updateProject(id, updateProjectDto);
  }


  @Delete(':project_id/stack/:sId')
  deleteStack(@Param('project_id') project_id: string, @Param('sId') sId:string, @Query() commonDto: CommonUserIdDto) {
    return this.projectService.deleteStack(project_id, sId, commonDto);
  }
  @Delete(':project_id/stack/:sId/signature/:signature')
  deleteSignature(@Param('sId') sId: string, @Param('signature') signatureId: string, @Param('project_id') projectId: string, @Query() commonDto: CommonUserIdDto) {
    return this.projectService.deleteSignature(sId, signatureId, projectId, commonDto);
  }
  @Delete(':project_id')
  remove(@Param('project_id') id: string, @Query() commonDto: CommonUserIdDto) {
    return this.projectService.deleteProject(id, commonDto);
  }
  @Delete(':project_id/stack/:sId/signature/:signature/component/:componentId')
  deleteComponent(@Param('project_id') id: string, @Param('componentId') componentId: string, @Query() commonDto: CommonUserIdDto, @Param('sId') sId: string, @Param('signature') signatureId: string){
    return this.projectService.deleteComponent(id,sId,signatureId,componentId,commonDto);
  }

}
