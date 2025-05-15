import { IsString,IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class LoginDto {
   @ApiProperty({ 
    example: 'username',
    description: 'The username of the user',
    required: true 
  })
  @IsString()
  username: string;

   @ApiProperty({ 
    example: 'password',
    description: 'The username of the user',
    required: true 
  })
  @IsString()
  password: string;
}


// register.dto.ts
export class RegisterDto {
  @ApiProperty({ 
    example: 'username',
    description: 'The username of the user',
    required: true 
  })
  @IsString()
  username: string;

   @ApiProperty({ 
    example: 'password',
    description: 'The password of the user',
    required: true 
  })
  @IsString()
  password: string;
   
   @ApiProperty({ 
    example: 'email',
    description: 'The email of the user',
    required: true 
  })
   @IsEmail()
  email: string;
}

// refresh-token.dto.ts
export class RefreshTokenDto {
  
   @ApiProperty({ 
    example: 'refreshToken',
    description: 'The refresh token of the user',
    required: true 
  })
  @IsString()
  refreshToken: string;
}