import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
@Controller()
export class ConfigController {


    @GrpcMethod('ConfigService', 'GetConfig')
    GetConfig({ service }: { service: string }) {
        
        console.log('GetConfig', service);
        
        const configMap = {
            'auth-service': {
                AUTH_GRPC_PORT: process.env.AUTH_GRPC_PORT,
                AUTH_HTTP_PORT: process.env.AUTH_HTTP_PORT,
                USER_SERVICE_URL: process.env.USER_SERVICE_URL,
                JWT_SECRET:process.env.JWT_SECRET,
            },
            'gateway-service': {
                GATEWAY_HTTP_PORT: process.env.GATEWAY_PORT,
                AUTH_SERVICE_URL:process.env.AUTH_SERVICE_URL,
            },
            'user-service': {
                USER_GRPC_PORT: process.env.USER_GRPC_PORT,
                USER_HTTP_PORT: process.env.USER_HTTP_PORT,
            },
            // ...
        };

        return { data: configMap[service] || {} };
    }
}
