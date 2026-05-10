import { ImportanceLevel } from '@repo/database';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateIf,
} from 'class-validator';

export class AssignJobSkillDto {
  // Provide either skillId (existing) or skillName (get-or-create)
  @ValidateIf((o: AssignJobSkillDto) => !o.skillName)
  @IsUUID('4')
  skillId?: string;

  @ValidateIf((o: AssignJobSkillDto) => !o.skillId)
  @IsString()
  skillName?: string;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @IsEnum(ImportanceLevel)
  importanceLevel?: ImportanceLevel;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minimumYears?: number;
}
