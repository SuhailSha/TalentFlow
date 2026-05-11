import { IsArray, IsOptional, IsString, Matches } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @Matches(/^[a-z0-9_]+$/, { message: 'name must be lowercase letters, numbers, and underscores only' })
  name: string;

  @IsString()
  displayName: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  permissions: string[];
}
