import { NoteType } from '@repo/database';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateNoteDto {
  @IsString()
  @MinLength(1)
  content: string;

  @IsOptional()
  @IsEnum(NoteType)
  noteType?: NoteType;
}
