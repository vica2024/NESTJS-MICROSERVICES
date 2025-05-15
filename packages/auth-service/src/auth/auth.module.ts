import { Module,OnModuleInit } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthGrpcController } from './auth.grpc';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { UserGrpcService } from '../user/user.grpc.service';
import { RemoteConfigService } from './auth-config.service';


@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'yourSecretKey', // 推荐用 .env 注入
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [AuthController, AuthGrpcController],
  providers: [AuthService, JwtStrategy, UserGrpcService],
})
export class AuthModule{

//implements OnModuleInit {

  // constructor(private readonly configService: RemoteConfigService) {}
  
  // async onModuleInit() {
  //   const config = await this.configService.load('auth-service');
  //   //update jwt secret
  //   process.env.JWT_SECRET =config['auth-service'].JWT_SECRET;
  //   //update auth http service port
  //   process.env.AUTH_HTTP_PORT =config['auth-service'].AUTH_HTTP_PORT;
  //   //update auth grpc service port
  //   process.env.AUTH_GRPC_PORT =config['auth-service'].AUTH_GRPC_PORT;
  //   //update user grpc service url
  //   process.env.USER_SERVICE_URL =config['auth-service'].USER_SERVICE_URL;
   

  // }
}
