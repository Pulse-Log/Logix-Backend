import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { User } from './interface/userId.interface';

@Injectable()
export class UserIdGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request: Request = context.switchToHttp().getRequest();
    
    const user: User = request.user as User; // Explicitly cast to User type
    const userIdFromBody = request.body.userId;

    if (!userIdFromBody) {
      throw new UnauthorizedException('User ID is required in the request body');
    }

    if (userIdFromBody !== user.userId) {
      throw new UnauthorizedException('User ID in the body does not match the token');
    }

    return true;
  }
}
