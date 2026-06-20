export type TeamCommunicationTone = 'status' | 'chat' | 'objective' | 'warning';

export interface TeamCommunicationMessageInput {
  at: number;
  label: string;
  source?: string;
  tone?: TeamCommunicationTone;
}

export interface TeamCommunicationEntry {
  id: string;
  at: number;
  timeLabel: string;
  label: string;
  source: string;
  tone: TeamCommunicationTone;
}

export function buildTeamCommunicationEntry(
  input: TeamCommunicationMessageInput,
  index = 0,
): TeamCommunicationEntry {
  return {
    id: `${input.at.toFixed(1)}-${index}`,
    at: input.at,
    timeLabel: formatGameTime(input.at),
    label: input.label,
    source: input.source?.trim() || 'Team',
    tone: input.tone ?? inferTone(input.label),
  };
}

export class TeamCommunicationLog {
  private messages: TeamCommunicationEntry[] = [];
  private nextIndex = 0;

  constructor(
    private readonly maxEntries = 8,
    private readonly ttlSeconds = 12,
  ) {}

  push(input: TeamCommunicationMessageInput): void {
    const entry = buildTeamCommunicationEntry(input, this.nextIndex++);
    this.messages.unshift(entry);
    if (this.messages.length > this.maxEntries) this.messages.length = this.maxEntries;
  }

  entries(now: number): TeamCommunicationEntry[] {
    const alive = this.messages.filter((entry) => now - entry.at <= this.ttlSeconds);
    if (alive.length !== this.messages.length) this.messages = alive;
    return alive.map((entry) => ({ ...entry }));
  }
}

function inferTone(label: string): TeamCommunicationTone {
  const text = label.toLowerCase();
  if (/撤退|小心|消失|missing|危险|gank|警/.test(text)) return 'warning';
  if (/神符|boss|roshan|深渊|守护|glyph|前哨|outpost/.test(text)) return 'objective';
  if (/集合|推进|进攻|防守|做视野|插眼|chat|wheel/.test(text)) return 'chat';
  return 'status';
}

function formatGameTime(time: number): string {
  const sign = time < 0 ? '-' : '';
  const abs = Math.max(0, Math.floor(Math.abs(time)));
  const minutes = Math.floor(abs / 60);
  const seconds = (abs % 60).toString().padStart(2, '0');
  return `${sign}${minutes}:${seconds}`;
}
