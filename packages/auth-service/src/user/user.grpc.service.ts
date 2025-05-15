import { Injectable, OnModuleInit } from '@nestjs/common';
import { ClientGrpc, Client } from '@nestjs/microservices';
import { join } from 'path';
import { Observable } from 'rxjs';
import { grpcClientOptions } from '../grpc.options';

interface UserService {
  FindOneByEmail(data: { email: string }): Observable<any>;
}

@Injectable()
export class UserGrpcService implements OnModuleInit {
  @Client(grpcClientOptions) private client: ClientGrpc;
  private userService: UserService;

  onModuleInit() {
    this.userService = this.client.getService<UserService>('UserService');
  }

  async findByEmail(email: string): Promise<any> {
    return this.userService.FindOneByEmail({ email }).toPromise();
  }
}
