import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserGrpcService } from '../user/user.grpc.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private userGrpcService: UserGrpcService,
  ) {}

  async ValidateUser(username: string, password: string) {
     //To search user by username
     return await this.login({username:username,userId:1});
  }

  async login(user: any) {
    const payload = { sub: user.userId, username: user.username };
    return {
      success: true,
      message: 'Login successful!', 
      accessToken: this.jwtService.sign(payload),
    };
  }
}
