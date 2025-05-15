import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Consul  from 'consul';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ConsulService implements OnModuleDestroy {
  private readonly logger = new Logger(ConsulService.name);
  private consulClient: Consul;
  private serviceId: string;
  private serviceName: string;
  private servicePort: number;

  constructor(private readonly configService: ConfigService) {
    // 初始化 Consul 客户端
    this.consulClient = new Consul({
      host: 'localhost',
      port:  8500
    });

    this.serviceName = 'auth-service';  // 服务名
    this.servicePort = Number(process.env.AUTH_GRPC_PORT);// 服务端口
    this.serviceId = `${this.serviceName}`; // 通过 PID 确保服务 ID 唯一
  }

  async registerService() {
    // 注册服务到 Consul
    try {
      await this.consulClient.agent.service.register({
        id: this.serviceId,
        name: this.serviceName,
        address: '172.17.0.1', // 服务所在地址
        port: this.servicePort, // 服务端口
        tags: ['nestjs', 'microservice'],
        check: {
          name: `${this.serviceName} check`,  
          grpc: `172.17.0.1:${this.servicePort }/my.grpc.service`, // 格式: <host>:<port>/<service_name>
          grpcusetls: false, // 本地开发禁用 TLS
          interval: '10s',
          timeout: '5s'
        },
      });
      this.logger.log(`Service registered with ID: ${this.serviceId}`);
    } catch (err) {
      this.logger.error('Failed to register service to Consul', err);
      throw err;
    }
  }

  async deregisterService() {
    // 注销服务
    try {
      await this.consulClient.agent.service.deregister(this.serviceId);
      this.logger.log(`Service deregistered with ID: ${this.serviceId}`);
    } catch (err) {
      this.logger.error('Failed to deregister service from Consul', err);
      throw err;
    }
  }

  async getServiceInfo(serviceName: string): Promise<any[]> {
    // 从 Consul 获取服务实例
    try {
      const services = await this.consulClient.catalog.service.nodes(serviceName);
      this.logger.log(`Retrieved service instances for: ${serviceName}`);
      return services;
    } catch (err) {
      this.logger.error(`Failed to retrieve service info for ${serviceName}`, err);
      throw err;
    }
  }

  // 查找某个服务的地址
  async getServiceAddress(serviceName: string): Promise<string | null> {
    try {
      const services = await this.getServiceInfo(serviceName);
      if (services.length > 0) {
        const service = services[0]; // 获取第一个服务实例
        return `${service.Address}:${service.ServicePort}`;
      } else {
        return null;
      }
    } catch (err) {
      this.logger.error(`Failed to retrieve service address for ${serviceName}`, err);
      return null;
    }
  }

  // 模块销毁时注销服务
  async onModuleDestroy() {
    await this.deregisterService();
  }

  // 健康检查方法 (可选)
  async checkHealth() {
    const url = `http://localhost:${this.servicePort}/health`;
    try {
      const response = await fetch(url);
      if (response.ok) {
        this.logger.log(`Health check passed for service ${this.serviceName}`);
        return true;
      } else {
        this.logger.error(`Health check failed for service ${this.serviceName}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`Error during health check for service ${this.serviceName}`, error);
      return false;
    }
  }
}
