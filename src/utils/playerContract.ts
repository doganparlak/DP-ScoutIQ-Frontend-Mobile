export type PlayerContract = {
  isOnLoan?: boolean;
  contractTeamId?: number;
  contractTeamName?: string;
  loanEndDate?: string;
  contractEndDate?: string;
};

function textValue(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const text = value.trim();
  return text && !/^(null|none|nan|n\/a|-)$/i.test(text) ? text : undefined;
}

export function normalizePlayerContract(raw: Record<string, unknown>): PlayerContract {
  const status = raw.isOnLoan ?? raw.is_on_loan;
  const normalized = String(status ?? '').trim().toLowerCase();
  const id = raw.contractTeamId ?? raw.contract_team_id;
  return {
    isOnLoan: ['true', '1', 'yes'].includes(normalized) ? true
      : ['false', '0', 'no'].includes(normalized) ? false : undefined,
    contractTeamId: id !== null && id !== undefined && String(id).trim() && Number.isFinite(Number(id)) ? Number(id) : undefined,
    contractTeamName: textValue(raw.contractTeamName ?? raw.contract_team_name),
    loanEndDate: textValue(raw.loanEndDate ?? raw.loan_end_date),
    contractEndDate: textValue(raw.contractEndDate ?? raw.contract_end_date),
  };
}

// Contract dates describe calendar days, so do not parse them as UTC timestamps.
export function formatPlayerContractDate(value: string | undefined, locale: string): string | undefined {
  if (!value) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!match) return undefined;
  const [, y, m, d] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d), 12);
  if (date.getFullYear() !== Number(y) || date.getMonth() !== Number(m) - 1 || date.getDate() !== Number(d)) return undefined;
  return date.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
}
