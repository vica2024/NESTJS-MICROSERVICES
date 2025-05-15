import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ClientGrpc, Client, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { lastValueFrom, Observable } from 'rxjs';

interface ConfigServiceGrpc {
  GetConfig(data: { service: string }): Observable<{ data: Record<string, string> }>;
}

@Injectable()
export class RemoteConfigService implements OnModuleInit {
  private readonly logger = new Logger(RemoteConfigService.name);

  private configService: ConfigServiceGrpc;

  @Client({
    transport: Transport.GRPC,
    options: {
      package: 'config',
      protoPath: join(__dirname, '../../../proto/config_service.proto'),
      url: 'localhost:6000',
    },
  })
  private client: ClientGrpc;

  async onModuleInit() {
    
    this.configService = this.client.getService<ConfigServiceGrpc>('ConfigService');
    try {
      this.logger.log('Testing gRPC connection to config service...');
      const { data } = await lastValueFrom(
        this.configService.GetConfig({ service: 'auth-service' }),
      );
      this.logger.log('✅ gRPC config service connected. Sample data:');
      this.logger.debug(data);
    } catch (error) {
      this.logger.error('❌ Failed to connect to config gRPC service:', error.message);
    }
  }

  /**
   * put multiple service names
   * @param serviceNames 
   * @returns 
   */
  async load(...serviceNames: string[]): Promise<Record<string, Record<string, string>>> {
    const configPromises = serviceNames.map(async (serviceName) => {
      // 获取每个服务的配置
      const { data } = await lastValueFrom(this.configService.GetConfig({ service: serviceName }));
      return { [serviceName]: data };
    });

    // 使用 Promise.all 来并发请求多个服务配置
    const configs = await Promise.all(configPromises);
    
    // 将结果合并为一个对象，格式为 { service1: { config }, service2: { config }, ... }
    return Object.assign({}, ...configs);
  }
}
