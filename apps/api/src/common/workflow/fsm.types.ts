export interface FsmDefinition<TState extends string> {
  transitions: Partial<Record<TState, TState[]>>;
  terminal?: TState[];
}

export interface TransitionContext<TState extends string> {
  id: string;
  organizationId: string;
  from: TState;
  to: TState;
}
