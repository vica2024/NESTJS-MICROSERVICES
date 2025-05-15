// profile.controller.ts
import { Controller, Get, Put, UseGuards, Request, Body } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Controller('profile')
@UseGuards(AuthGuard('jwt'))
export class ProfileController {
  @Get()
  async getProfile(@Request() req) {
    // 获取当前用户资料
    return req.user;
  }

  @Put()
  async updateProfile(@Request() req, @Body() updateData) {
    // 更新当前用户资料
  }

  @Put('avatar')
  async updateAvatar(@Request() req, @Body() { avatarUrl }: { avatarUrl: string }) {
    // 更新头像
  }
}