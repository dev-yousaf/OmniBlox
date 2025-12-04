import { IsEmail, IsString, IsNotEmpty } from 'class-validator';

export class UpdateSignupEmailDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsEmail()
  @IsNotEmpty()
  newEmail: string;
}
