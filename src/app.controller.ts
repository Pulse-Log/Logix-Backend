import { Controller, Get, UseFilters, UseGuards, UseInterceptors } from '@nestjs/common';
import { AppService } from './app.service';
import { JwtAuthGuard } from './global-guard/jwt-auth.guard';
import { HttpExceptionFilter } from './helper/filter/exception.filter';
import { TransformInterceptor } from './helper/interceptor/transform.interceptor';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @UseFilters(HttpExceptionFilter)
  @UseInterceptors(TransformInterceptor)
  @UseGuards(JwtAuthGuard)
  getHello(): string {
    return this.appService.getHello();
  }
}
