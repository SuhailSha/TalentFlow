import { ValidationPipe } from '@nestjs/common';

/**
 * Custom validation pipe for multipart form endpoints.
 * Less strict than the global pipe to allow form field processing.
 */
export class MultipartValidationPipe extends ValidationPipe {
  constructor() {
    super({
      whitelist: true,
      forbidNonWhitelisted: false, // Allow extra fields for multipart processing
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    });
  }
}
