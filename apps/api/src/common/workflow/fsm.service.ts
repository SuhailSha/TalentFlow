import { Injectable } from '@nestjs/common';

import type { FsmDefinition } from './fsm.types';
import { AlreadyInStateException, TransitionNotAllowedException } from './transition.exception';

@Injectable()
export class FsmService {
  /**
   * Validate a transition and throw a typed exception if not allowed.
   * Call this before persisting the state change.
   */
  validate<TState extends string>(
    fsm: FsmDefinition<TState>,
    from: TState,
    to: TState,
  ): void {
    if (from === to) throw new AlreadyInStateException(from);

    const allowed = (fsm.transitions[from] ?? []) as TState[];
    if (!allowed.includes(to)) {
      throw new TransitionNotAllowedException(from, to, allowed);
    }
  }

  /** Returns the list of states reachable from `from`. */
  allowedFrom<TState extends string>(
    fsm: FsmDefinition<TState>,
    from: TState,
  ): TState[] {
    return (fsm.transitions[from] ?? []) as TState[];
  }

  /** Returns true if `state` has no outbound transitions. */
  isTerminal<TState extends string>(
    fsm: FsmDefinition<TState>,
    state: TState,
  ): boolean {
    const targets = fsm.transitions[state];
    return !targets || targets.length === 0;
  }
}
