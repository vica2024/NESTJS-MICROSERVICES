// roles.controller.ts
import { Controller, Get, Put, UseGuards, Request, Body, Post, Param } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CreateRoleDto, UpdateRoleDto, PermissionsDto} from './dto/roles.dto';

@Controller('roles')
@UseGuards(AuthGuard('jwt')) // 保护所有用户路由
export class RolesController {
  @Get() // 获取所有角色
  async findAll() {}

  @Post() // 创建新角色
  async create(@Body() createRoleDto: CreateRoleDto) {}

  @Put(':id') // 更新角色
  async update(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {}

  @Get(':id/permissions') // 获取角色权限
  async getPermissions(@Param('id') id: string) {}

  @Put(':id/permissions') // 更新角色权限
  async updatePermissions(@Param('id') id: string, @Body() permissionsDto: PermissionsDto) {}
}