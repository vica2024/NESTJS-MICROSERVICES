// tenant.middleware.ts
import { Injectable, NestMiddleware, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const tenantId = 
      req.headers['x-tenant-id'] || 
      req.query.tenantId || 
      this.extractFromSubdomain(req);
    
    if (!tenantId) throw new BadRequestException('Tenant identification required');
    
    req.tenantId = tenantId;
    next();
  }
  
  private extractFromSubdomain(req: Request): any {
    // 实现子域名解析逻辑
  }
}