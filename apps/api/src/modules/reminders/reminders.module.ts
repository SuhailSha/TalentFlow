import { Module } from '@nestjs/common';
import { RemindersBulkController } from './reminders-bulk.controller';
import { RemindersBulkService } from './reminders-bulk.service';
import { RemindersController } from './reminders.controller';
import { RemindersService } from './reminders.service';
import { RemindersRepository } from './reminders.repository';
import { ReminderGeneratorService } from './reminder-generator.service';

@Module({
  // Bulk controller MUST be registered before the per-record controller.
  // Otherwise POST /reminders/bulk/snooze matches POST /reminders/:id/snooze
  // (with :id = "bulk") and the body validation pipe rejects `ids` as an
  // unknown property before ParseUUIDPipe can reject "bulk" as a UUID.
  controllers: [RemindersBulkController, RemindersController],
  providers:   [RemindersService, RemindersRepository, ReminderGeneratorService, RemindersBulkService],
  exports:     [RemindersService],
})
export class RemindersModule {}
