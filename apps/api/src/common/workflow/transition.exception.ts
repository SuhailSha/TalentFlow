import { BadRequestException } from '@nestjs/common';

export class TransitionNotAllowedException extends BadRequestException {
  constructor(from: string, to: string, allowed: string[]) {
    super(
      `Cannot transition from ${from} to ${to}. ` +
      `Allowed: ${allowed.length ? allowed.join(', ') : 'none (terminal state)'}`,
    );
  }
}

export class AlreadyInStateException extends BadRequestException {
  constructor(status: string) {
    super(`Already in ${status} status`);
  }
}
