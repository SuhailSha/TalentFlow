import { InterviewParticipantRole } from '@repo/database';
import { IsEmail, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class AddParticipantDto {
  @IsOptional()
  @IsUUID('4')
  userId?: string;

  @IsString()
  @MaxLength(200)
  name: string;

  @IsEmail()
  @MaxLength(200)
  email: string;

  @IsEnum(InterviewParticipantRole)
  role: InterviewParticipantRole;
}
