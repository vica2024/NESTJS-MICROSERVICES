// users.controller.ts
import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Controller('users')
@UseGuards(AuthGuard('jwt')) // 保护所有用户路由
export class UsersController {

  @Get()
  async findAll() {
    // 获取所有用户列表
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    // 获取单个用户详情
  }
  

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateData: { username?: string; email?: string }
  ) {
    // 更新用户信息
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    // 删除用户
  }

  @Put(':id/password')
  async changePassword(
    @Param('id') id: string,
    @Body() { oldPassword, newPassword }: { oldPassword: string; newPassword: string }
  ) {
    // 修改密码
  }

  @Post('invite')
  async invite(@Body() inviteData: { email: string; role: string }) {
    // 邀请用户
  }

}