import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { ClientGrpc } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';
import { lastValueFrom } from 'rxjs';
import { AuthServiceClient } from './interfaces/auth.interface';
import { LoginDto, RegisterDto, RefreshTokenDto } from './dto/login.dto';

@ApiTags('Authentication') // 为控制器添加标签
@ApiBearerAuth() // 如果需要认证
@Controller('auth')
export class AuthController {

  private authService: AuthServiceClient;

  constructor(@Inject('AUTH_SERVICE') private client: ClientGrpc) { }

  onModuleInit() {
    this.authService = this.client.getService<AuthServiceClient>('AuthService');
  }
  @Post('login')
  @ApiOperation({ summary: 'User login', description: 'Authenticate user and return access token' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      example: {
        message: 'Login successful',
        data: {
          accessToken: 'string',
          refreshToken: 'string',
          user: {
            id: 'number',
            username: 'string',
            email: 'string'
          }
        }
      }
    }
  })

  @ApiResponse({ status: 400, description: 'Bad request - missing credentials' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid credentials' })
  async login(@Body() loginDto: LoginDto) {

    try {

      const response = await lastValueFrom(this.authService.ValidateUser({
        username: loginDto.username,
        password: loginDto.password,
      }));
     
      console.log(response);
      return response;
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.UNAUTHORIZED);
    }

  }


  @Post('register')
  @ApiOperation({ summary: 'User registration', description: 'Register a new user account' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'Registration successful',
    schema: {
      example: {
        message: 'Registration successful',
        data: {
          user: {
            id: 'number',
            username: 'string',
            email: 'string'
          }
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad request - missing required fields or invalid data' })
  async register(@Body() registerDto: RegisterDto) {
    // ...原有实现...
  }

  @Post('refresh-token')
  @ApiOperation({ summary: 'Refresh access token', description: 'Get new access token using refresh token' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    schema: {
      example: {
        message: 'Token refreshed successfully',
        data: {
          accessToken: 'string',
          refreshToken: 'string'
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad request - refresh token missing' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid refresh token' })
  async refreshToken(@Body() { refreshToken }: RefreshTokenDto) {
    // ...原有实现...
  }
}