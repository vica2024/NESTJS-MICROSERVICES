import { ClientOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';

export const grpcClientOptions: ClientOptions = {
  transport: Transport.GRPC,
  options: {
    package: 'USER_SERVICE',
    protoPath: join(__dirname, '../../proto/user_service.proto'),
    url: process.env.USER_SERVICE_URL, // user 微服务地址
  },
};
