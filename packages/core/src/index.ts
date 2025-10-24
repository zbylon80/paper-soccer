// ======= Eksport typów =======
export * from './types';

// ======= Eksport funkcji pomocniczych =======
export * from './utils';

// ======= Eksport walidacji ruchów =======
export * from './moveValidation';

// ======= Eksport silnika gry =======
export { GameEngine } from './gameEngine';

// ======= Eksport domyślnych wartości =======
export const DEFAULT_CONFIG = {
  width: 10,
  height: 8,
  goalWidth: 2
} as const;
