import { Module } from '@nestjs/common';
import { RemindersController } from './reminders.controller';
import { RemindersService } from './reminders.service';
import { RemindersRepository } from './reminders.repository';
import { ReminderGeneratorService } from './reminder-generator.service';

@Module({
  controllers: [RemindersController],
  providers:   [RemindersService, RemindersRepository, ReminderGeneratorService],
  exports:     [RemindersService],
})
export class RemindersModule {}
