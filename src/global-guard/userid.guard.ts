import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { User } from './interface/userId.interface';

@Injectable()
export class UserIdGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request: Request = context.switchToHttp().getRequest();
    const user: User = request.user as User;
    
    let userIdFromRequest: string | undefined;

    if (request.method === 'GET') {
      userIdFromRequest = request.query.userId as string;
    } else {
      userIdFromRequest = request.body.userId;
    }

    if (!userIdFromRequest) {
      throw new UnauthorizedException('User ID is required in the request');
    }

    if (userIdFromRequest !== user.userId) {
      throw new UnauthorizedException('User ID in the request does not match the token');
    }

    return true;
  }
}