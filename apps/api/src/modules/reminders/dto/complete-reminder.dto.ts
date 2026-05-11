import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CompleteReminderDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class DismissReminderDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
