// src/components/PlayerCard.tsx
import * as React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { FileClock, FileText } from 'lucide-react-native';
import { CARD, TEXT, MUTED, ACCENT, LINE, DANGER } from '@/theme';
import type { PlayerData } from '@/types';
import { rolePickerCode } from '@/services/api';
import { useTranslation } from 'react-i18next';

type Props = {
  player: PlayerData;
  onAddFavorite?: (p: PlayerData) => void | Promise<boolean>;
  addFavoriteDisabled?: boolean;
  onGenerateReport?: (p: PlayerData) => void | Promise<void>;
  reportState?: 'idle' | 'loading' | 'ready';
  reportDisabled?: boolean;
  titleAlign?: 'left' | 'center';
  hideNationalityLeague?: boolean;
  visualTheme?: {
    cardBackground: string;
    accent: string;
  };
};

function isValidPotential(x: unknown): x is number {
  return typeof x === 'number' && Number.isFinite(x) && x >= 0 && x <= 100;
}

function getScoreColor(score: number): string {
  if (score < 50) return DANGER;
  if (score < 70) return '#F59E0B';
  return ACCENT;
}

function roleShortLabel(value?: string) {
  return rolePickerCode(value);
}

function buildRoleDistribution(meta: PlayerData['meta']) {
  const rawCounts: Record<string, number> = meta?.positionCounts ?? {};
  const counts = Object.entries(rawCounts).reduce<Record<string, number>>((acc, [role, count]) => {
    const short = roleShortLabel(role);
    if (short && count > 0) acc[short] = (acc[short] || 0) + count;
    return acc;
  }, {});
  const total = Object.values(counts).reduce((sum: number, count: number) => sum + count, 0);
  const fromCounts = Object.entries(counts)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([role, count]) => ({
      role,
      pct: total > 0 ? Math.round((count / total) * 100) : null,
    }))
    .filter((item) => item.role);

  if (fromCounts.length) return fromCounts;

  return Array.from(new Set((meta?.positionNamesSeen?.length ? meta.positionNamesSeen : meta?.roles ?? [])
    .map(roleShortLabel)
    .filter(Boolean)))
    .map((role) => ({ role, pct: null }));
}

function ScoreBar({
  label,
  value,
  accessibilityLabel,
  colorOverride,
}: {
  label: string;
  value: number;
  accessibilityLabel: string;
  colorOverride?: string;
}) {
  const score = Math.max(0, Math.min(100, Math.round(value)));
  const scoreColor = colorOverride ?? getScoreColor(score);

  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: MUTED }}>
        {label}:{' '}
        <Text style={{ color: scoreColor, fontWeight: '800' }}>{score}</Text>/100
      </Text>

      <View
        style={{
          height: 8,
          borderRadius: 999,
          backgroundColor: '#272a2a',
          overflow: 'hidden',
        }}
        accessibilityLabel={accessibilityLabel}
      >
        <View
          style={{
            width: `${score}%`,
            height: '100%',
            backgroundColor: scoreColor,
          }}
        />
      </View>
    </View>
  );
}

export default function PlayerCard({
  player,
  onAddFavorite,
  addFavoriteDisabled = false,
  onGenerateReport,
  reportState = 'idle',
  reportDisabled = false,
  titleAlign = 'left',
  hideNationalityLeague = false,
  visualTheme,
}: Props) {
  const { t } = useTranslation();
  const { name, meta } = player;
  const roleDistribution = buildRoleDistribution(meta);
  const potential = meta?.potential;
  const form = meta?.form;

  const [isAdding, setIsAdding] = React.useState(false);
  const [isAdded, setIsAdded] = React.useState(false);
  const [showAddedMessage, setShowAddedMessage] = React.useState(false);

  React.useEffect(() => {
    setIsAdding(false);
    setIsAdded(false);
    setShowAddedMessage(false);
  }, [player.name, meta?.team, meta?.nationality]);

  const handleAdd = async () => {
    if (!onAddFavorite || isAdding || isAdded) return;
    try {
      setIsAdding(true);
      const maybePromise = onAddFavorite(player);
      let ok = true;
      if (maybePromise && typeof (maybePromise as Promise<boolean>)?.then === 'function') {
        ok = await (maybePromise as Promise<boolean>);
      }
      if (ok !== false) {
        setIsAdded(true);
        setShowAddedMessage(true);
      }
      else setIsAdding(false); // handled failure => re-enable
    } catch {
      setIsAdding(false);
    }
  };

  const disabled = !onAddFavorite || addFavoriteDisabled || isAdding || isAdded;
  const reportLoading = reportState === 'loading';
  const reportButtonDisabled = !onGenerateReport || reportDisabled || reportLoading;
  const potentialInt = Math.round(isValidPotential(potential) ? potential : 0);
  const formInt = Math.round(isValidPotential(form) ? form : 0);

  // gender label (localized if 'male'/'female')
  const genderLabel = React.useMemo(() => {
    const g = meta?.gender;
    if (!g || typeof g !== 'string') return undefined;
    const lower = g.toLowerCase();
    if (lower === 'male') return t('genderMale', 'Male');
    if (lower === 'female') return t('genderFemale', 'Female');
    return g;
  }, [meta?.gender, t]);

  const cardAccent = visualTheme?.accent ?? ACCENT;

  return (
    <View style={{ backgroundColor: visualTheme?.cardBackground ?? CARD, borderRadius: 16, padding: 14, gap: 8 }}>
      {showAddedMessage && (
        <View
          style={{
            alignSelf: 'center',
            backgroundColor: cardAccent,
            borderRadius: 999,
            paddingHorizontal: 12,
            paddingVertical: 6,
          }}
        >
          <Text style={{ color: 'white', fontSize: 12, fontWeight: '800' }}>
            {t('playerAddedToPortfolio', 'Player is added to your portfolio')}
          </Text>
        </View>
      )}

      {/* header row: name + add button */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text
          style={{
            color: TEXT,
            fontSize: 18,
            fontWeight: '800',
            flex: 1,
            textAlign: titleAlign,
          }}
        >
          {name}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {onGenerateReport && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={
                reportLoading
                  ? t('generatingReport', 'Generating report')
                  : reportState === 'ready'
                    ? t('openReport', 'Open report')
                    : t('generateReport', 'Generate report')
              }
              onPress={() => onGenerateReport?.(player)}
              disabled={reportButtonDisabled}
              style={{
                width: 38,
                height: 28,
                borderWidth: 1,
                borderColor: reportButtonDisabled ? LINE : cardAccent,
                borderRadius: 999,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: reportButtonDisabled ? 0.5 : 1,
              }}
            >
              {reportLoading ? (
                <FileClock size={15} color={cardAccent} strokeWidth={2.2} />
              ) : (
                <FileText size={15} color={reportButtonDisabled ? MUTED : cardAccent} strokeWidth={2.2} />
              )}
            </TouchableOpacity>
          )}

          {onAddFavorite && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={
                isAdded
                  ? t('addedToFavorites', 'Added to favorites')
                  : t('addToFavorites', 'Add to favorites')
              }
              onPress={handleAdd}
              disabled={disabled}
              style={{
                width: 38,
                height: 28,
                borderWidth: 1,
                borderColor: isAdded ? cardAccent : (!onAddFavorite ? LINE : cardAccent),
                borderRadius: 999,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: (addFavoriteDisabled || isAdding || !onAddFavorite) ? 0.5 : 1,
              }}
            >
              <Text
                style={{
                  color: isAdded ? cardAccent : (!onAddFavorite ? MUTED : cardAccent),
                  fontWeight: '800',
                  fontSize: 18,
                  lineHeight: 20,
                  textAlign: 'center',
                  includeFontPadding: false,
                }}
              >
                {isAdded ? '✓' : isAdding ? '…' : '＋'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* meta block: 
          row 1 -> gender, age
          row 2 -> nationality, league
          row 3 -> team
          row 4 -> height, weight
      */}
      <View style={{ gap: 4, marginTop: 4 }}>
        {/* Row 1: Gender, Age */}
        {(genderLabel || typeof meta?.age === 'number') && (
          <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
            {genderLabel && (
              <Text style={{ color: MUTED }}>
                {t('gender', 'Gender')}: <Text style={{ color: TEXT }}>{genderLabel}</Text>
              </Text>
            )}
            {typeof meta?.age === 'number' && (
              <Text style={{ color: MUTED }}>
                {t('age', 'Age')}: <Text style={{ color: TEXT }}>{meta.age}</Text>
              </Text>
            )}
          </View>
        )}

        {/* Row 2: Nationality, League */}
        {!hideNationalityLeague && (meta?.nationality || meta?.league) && (
          <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
            {meta?.nationality && (
              <Text style={{ color: MUTED }}>
                {t('nationality', 'Nationality')}:{' '}
                <Text style={{ color: TEXT }}>{meta.nationality}</Text>
              </Text>
            )}
            {meta?.league && (
              <Text style={{ color: MUTED }}>
                {t('league', 'League')}: <Text style={{ color: TEXT }}>{meta.league}</Text>
              </Text>
            )}
          </View>
        )}

        {/* Row 3: Team */}
        {meta?.team && (
          <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
            <Text style={{ color: MUTED }}>
              {t('team', 'Team')}: <Text style={{ color: TEXT }}>{meta.team}</Text>
            </Text>
          </View>
        )}

        {/* Row 4: Height, Weight */}
        {(typeof meta?.height === 'number' || typeof meta?.weight === 'number') && (
          <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
            {typeof meta?.height === 'number' && (
              <Text style={{ color: MUTED }}>
                {t('height', 'Height')}: <Text style={{ color: TEXT }}>{meta.height}</Text>
              </Text>
            )}
            {typeof meta?.weight === 'number' && (
              <Text style={{ color: MUTED }}>
                {t('weight', 'Weight')}: <Text style={{ color: TEXT }}>{meta.weight}</Text>
              </Text>
            )}
          </View>
        )}
      </View>

      {(isValidPotential(potential) || isValidPotential(form)) && (
        <View style={{ marginTop: 4, gap: 8 }}>
          {isValidPotential(potential) && (
            <ScoreBar
              label={t('potential', 'Potential')}
              value={potentialInt}
              colorOverride={visualTheme?.accent}
              accessibilityLabel={t('potentialA11y', 'Potential {{val}} out of 100', {
                val: potentialInt,
              })}
            />
          )}
          {isValidPotential(form) && (
            <ScoreBar
              label={t('form', 'Form')}
              value={formInt}
              colorOverride={visualTheme?.accent}
              accessibilityLabel={t('formA11y', 'Form {{val}} out of 100', {
                val: formInt,
              })}
            />
          )}
        </View>
      )}

      {roleDistribution.length > 0 && (
        <View style={{ marginTop: 8, gap: 6 }}>
          <Text style={{ color: MUTED }}>
            {t('roleDistribution', 'Role Distribution')}
          </Text>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            {roleDistribution.map((item) => (
              <View
                key={`${item.role}-${item.pct ?? 'role'}`}
                style={{
                  backgroundColor: 'rgba(22, 163, 74, 0.13)',
                  borderColor: cardAccent,
                  borderWidth: 1,
                  paddingVertical: 4,
                  paddingHorizontal: 8,
                  borderRadius: 999,
                }}
              >
                <Text style={{ color: cardAccent, fontWeight: '800', fontSize: 12 }}>
                  {item.role}
                  {item.pct !== null ? <Text style={{ color: MUTED }}> {item.pct}%</Text> : null}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}
