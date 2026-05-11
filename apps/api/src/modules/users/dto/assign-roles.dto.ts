import { ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class AssignRolesDto {
  @IsArray()
  @ArrayMinSize(0)
  @IsUUID('4', { each: true })
  roleIds: string[];
}
