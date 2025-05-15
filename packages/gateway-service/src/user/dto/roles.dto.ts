// dtos/index.ts

// 租户相关
export class CreateTenantDto {
  name: string;
  subdomain: string;
  ownerEmail: string;
  ownerPassword: string;
}

export class SubscriptionDto {
  planId: string;
  billingCycle: 'monthly' | 'yearly';
  paymentMethodId?: string;
}

// 用户相关
export class RegisterDto {
  tenantId?: string; // 可为空，表示注册新租户
  email: string;
  password: string;
  name: string;
}

export class InviteDto {
  email: string;
  role: string;
}

export class UpdateRoleDto {
  role: string;
}

// 权限相关
export class CreateRoleDto {
  name: string;
  description: string;
  permissions: string[];
}

export class PermissionsDto {
  permissions: string[];
}