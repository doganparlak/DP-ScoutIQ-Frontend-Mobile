import type { PlayerContract } from './playerContract';

export type PortfolioFilters = {
  values: Record<string, string>;
  status: '' | 'loan' | 'permanent';
  roles: string[];
};

type PortfolioPlayer = PlayerContract & {
  name: string; nationality?: string; team?: string;
  age?: number; form?: number; potential?: number; rolesShort: string[];
};
const fold = (value: string) => value.trim().replace(/ı/g, 'i').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

export function matchesPortfolioFilters(player: PortfolioPlayer, filters: PortfolioFilters): boolean {
  const { values, status, roles } = filters;
  if (!(['name', 'country', 'team'] as const).every(key => {
    const actual = key === 'country' ? player.nationality : player[key];
    return !values[key] || fold(actual ?? '').includes(fold(values[key]));
  })) return false;
  for (const key of ['age', 'form', 'potential'] as const) {
    const value = player[key];
    for (const bound of ['min', 'max'] as const) {
      const limit = values[`${key}${bound}`];
      if (!limit) continue;
      if (typeof value !== 'number' || !Number.isFinite(value)) return false;
      if (bound === 'min' ? value < Number(limit) : value > Number(limit)) return false;
    }
  }
  if (status && player.isOnLoan !== (status === 'loan')) return false;
  for (const [key, date] of [['loanEnd', player.loanEndDate], ['contractEnd', player.contractEndDate]] as const) {
    if (!values[key] || (key === 'loanEnd' && status === 'permanent')) continue;
    if (key === 'loanEnd' && player.isOnLoan !== true) return false;
    const day = date?.slice(0, 10);
    if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day) || day > values[key]) return false;
  }
  return !roles.length || roles.some(role => player.rolesShort.includes(role));
}
