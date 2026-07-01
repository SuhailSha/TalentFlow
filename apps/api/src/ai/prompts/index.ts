// Importing this file loads every prompt definition into the registry.
// Add new prompt versions by importing them here.

import './candidate-summary/v1';

export { getPrompt, listPrompts, registerPrompt } from './prompt-registry';
export type { PromptDefinition } from './prompt-registry';
