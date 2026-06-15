export const COMMAND_CARD_ACTIONS = [
  'move',
  'attackMove',
  'stop',
  'hold',
  'selectHero',
  'selectCourier',
  'selectAllControlled',
  'glyph',
  'shop',
] as const;

export type CommandCardAction = typeof COMMAND_CARD_ACTIONS[number];

export function commandCardActionFromValue(value: string | null): CommandCardAction | null {
  return COMMAND_CARD_ACTIONS.includes(value as CommandCardAction) ? value as CommandCardAction : null;
}
