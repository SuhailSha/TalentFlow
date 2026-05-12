import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

import { validateEnv } from './config';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { PermissionsGuard } from './auth/guards/permissions.guard';
import { AppContextModule } from './common/context/app-context.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { AuditModule } from './common/audit/audit.module';
import { AuditInterceptor } from './common/audit/audit.interceptor';
import { WorkflowModule } from './common/workflow/workflow.module';
import { ActivityModule } from './common/activity/activity.module';
import { TransactionModule } from './common/transaction/transaction.module';
import { DatabaseModule } from './database';
import { EmailModule } from './email/email.module';
import { HealthModule } from './health/health.module';
import { LoggerModule } from './logger/logger.module';
import { QueueModule } from './queue/queue.module';
import { StorageModule } from './storage/storage.module';
import { CandidatesModule } from './modules/candidates/candidates.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { VendorsModule } from './modules/vendors/vendors.module';
import { SubmissionsModule } from './modules/submissions/submissions.module';
import { InterviewsModule } from './modules/interviews/interviews.module';
import { RemindersModule } from './modules/reminders/reminders.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { OrganizationModule } from './modules/organization/organization.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { SubscriptionModule } from './modules/subscription/subscription.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { SearchModule } from './modules/search/search.module';
import { ScheduledModule } from './scheduled/scheduled.module';

@Module({
  imports: [
    // ── Framework / Config ─────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),

    // ── Request context (CLS) — must be first; guards depend on it ──────────
    AppContextModule,

    // ── Logging ────────────────────────────────────────────────────────────
    LoggerModule,

    // ── Event Bus ─────────────────────────────────────────────────────────
    // wildcard: true  → enables 'candidate.*' pattern listeners
    // delimiter: '.'  → matches our "resource.action" naming convention
    // maxListeners: 20 → raise from default 10 (one per domain module)
    // verboseMemoryLeak: true → warn when listener count approaches limit
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      maxListeners: 30,
      verboseMemoryLeak: true,
    }),

    // ── Cron scheduler ─────────────────────────────────────────────────────
    // Required for @Cron decorators in ScheduledModule. Discovery is global.
    ScheduleModule.forRoot(),

    // ── Database ───────────────────────────────────────────────────────────
    DatabaseModule,

    // ── Audit (must come after EventEmitter + Database) ────────────────────
    AuditModule,

    // ── Shared workflow / transaction / activity infrastructure ────────────
    WorkflowModule,
    TransactionModule,
    ActivityModule,

    // ── Queue Infrastructure ───────────────────────────────────────────────
    QueueModule.register(),

    // ── File Storage ───────────────────────────────────────────────────────
    StorageModule.register(),

    // ── Email delivery ─────────────────────────────────────────────────────
    EmailModule.register(),

    // ── Feature Modules ────────────────────────────────────────────────────
    AuthModule,
    HealthModule,
    CandidatesModule,
    JobsModule,
    VendorsModule,
    SubmissionsModule,
    InterviewsModule,
    RemindersModule,
    NotificationsModule,
    OrganizationModule,
    UsersModule,
    RolesModule,
    SubscriptionModule,
    DashboardModule,
    SearchModule,
    ScheduledModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    // Interceptor order matters — executed top-to-bottom on request,
    // bottom-to-top on response (like middleware onion model).
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
    // Guard order: JWT runs first (populates req.user + CLS),
    // then PermissionsGuard checks req.user.permissions.
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
})
export class AppModule {}
