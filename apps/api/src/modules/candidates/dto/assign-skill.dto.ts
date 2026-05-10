import { ProficiencyLevel } from '@repo/database';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class AssignSkillDto {
  // Provide either an existing skillId OR a new skill name (get-or-create pattern).
  @IsOptional()
  @IsUUID('4')
  skillId?: string;

  // If skillId is absent, a new skill is created with this name.
  @IsOptional()
  @IsString()
  @MaxLength(100)
  skillName?: string;

  @IsOptional()
  @IsEnum(ProficiencyLevel)
  proficiencyLevel?: ProficiencyLevel;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(50)
  yearsOfExperience?: number;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
