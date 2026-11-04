export interface Stats {
  atk: number;
  def: number;
  hp: number;
}

export type BaseStats = Stats;
export type IVs = Stats;

export interface Cost {
  stardust: number;
  candy: number;
  xl: number;
}

export type Variant = 'normal' | 'shadow' | 'purified';

export interface Modifiers {
  variant: Variant;
  lucky: boolean;
}

export interface SpreadInput {
  base: BaseStats;
  ivs: IVs;
}

export interface LeagueInput extends SpreadInput {
  cap: number;
  maxLevel: number;
}
