import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { AuthService } from './auth.service';

@Controller() // 可以不需要，如果只是gRPC服务可以不暴露HTTP接口
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // 用于gRPC调用的接口，注意：'AuthService' 和 proto 中定义的服务名保持一致
  @GrpcMethod('AuthService', 'ValidateUser')
  async ValidateUser(data: { username: string; password: string }) {
    return this.authService.ValidateUser(data.username, data.password);
  }
}
