import { reportScopeMatches } from '@/services/reportAccess';
import { toSpiderPoints as comparisonPoints, type EnterpriseMetricUnit } from '@/utils/comparisonRanges';
import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  FlatList,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Line, LinearGradient, Polygon, Rect, Stop, Text as SvgText } from 'react-native-svg';
import {
  toSpiderPoints,
  GK_METRICS,
  SHOOTING_METRICS,
  PASSING_METRICS,
  CONTRIBUTION_IMPACT_METRICS,
  ERRORS_DISCIPLINE_METRICS,
  DEFENDING_METRICS,
} from '../components/spiderRanges';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { Clock3, Timer, Radar, ListOrdered, BrickWall, ChevronLeft, ChevronRight, DraftingCompass, LockKeyhole, LogIn, Map as MapIcon, ShieldAlert, ShieldCheck, Star, X } from 'lucide-react-native';

import PlayerCard from '../components/PlayerCard';
import SpiderChart, { type SpiderPoint } from '../components/SpiderChart';
import type { PlayerData } from '../types';
import { rolePickerCode, type Plan, type ScoutingReportResponse } from '../services/api';
import ErrorsDisciplineTiles from '../components/ErrorsDisciplineTiles';
import ReportPhaseDistributions from './ReportPhaseDistributions';
import ActionSpinner from './ActionSpinner';

import {
  CARD,
  TEXT,
  MUTED,
  ACCENT,
  LINE,
  DANGER,
  shadows,
} from '../theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  player: PlayerData;
  report: ScoutingReportResponse;
  plan?: Plan;
  reloadReport?: () => Promise<ScoutingReportResponse>;
  loadReportSection?: (section: 'strengths' | 'weaknesses' | 'role_usage') => Promise<ScoutingReportResponse>;
  onReportUpdate?: (report: ScoutingReportResponse) => void;
};

type ParsedReport = {
  strengths: string[];
  weaknesses: string[];
  conclusion: string[];
};

type ReportIcon = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
type PageItem = { key: string; title: string; node: React.ReactNode; Icon?: ReportIcon };

type NarrativeSection = 'strengths' | 'weaknesses' | 'conclusion';
type NarrativeBullet = { title: string; body: string };

type PitchRoleZoneCode = 'GK' | 'LB' | 'RB' | 'CB' | 'LM' | 'RM' | 'CDM' | 'CM' | 'CAM' | 'LW' | 'RW' | 'CF';

type PitchZone = {
  code: PitchRoleZoneCode;
  x: number;
  y: number;
  w: number;
  h: number;
};

const PITCH_ROLE_ZONES: PitchZone[] = [
  { code: 'GK', x: 2, y: 82, w: 52, h: 16 },
  { code: 'LB', x: 2, y: 60.667, w: 13, h: 21.333 },
  { code: 'LM', x: 2, y: 39.333, w: 13, h: 21.334 },
  { code: 'LW', x: 2, y: 18, w: 13, h: 21.333 },
  { code: 'CB', x: 15, y: 66, w: 26, h: 16 },
  { code: 'CDM', x: 15, y: 50, w: 26, h: 16 },
  { code: 'CM', x: 15, y: 34, w: 26, h: 16 },
  { code: 'CAM', x: 15, y: 18, w: 26, h: 16 },
  { code: 'RB', x: 41, y: 60.667, w: 13, h: 21.333 },
  { code: 'RM', x: 41, y: 39.333, w: 13, h: 21.334 },
  { code: 'RW', x: 41, y: 18, w: 13, h: 21.333 },
  { code: 'CF', x: 2, y: 2, w: 52, h: 16 },
];

function roleShortLabel(value?: string) {
  return rolePickerCode(value);
}

function normalizePositionCounts(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.entries(value as Record<string, unknown>).reduce<Record<string, number>>((acc, [rawRole, rawCount]) => {
    const role = roleShortLabel(rawRole).toUpperCase();
    const count = Number(rawCount);
    if (role && Number.isFinite(count) && count > 0) acc[role] = (acc[role] || 0) + count;
    return acc;
  }, {});
}

function normalizePositionNames(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map((item) => roleShortLabel(String(item)).toUpperCase()).filter(Boolean)));
}

function toPitchZone(value: string): PitchRoleZoneCode | '' {
  const code = roleShortLabel(value).toUpperCase();
  if (['GK', 'LB', 'RB', 'CB', 'LM', 'RM', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'CF'].includes(code)) {
    return code as PitchRoleZoneCode;
  }
  return '';
}

function normalizePitchZoneCounts(counts: Record<string, number>) {
  return Object.entries(counts).reduce<Partial<Record<PitchRoleZoneCode, number>>>((acc, [role, count]) => {
    const zone = toPitchZone(role);
    if (zone) acc[zone] = (acc[zone] || 0) + count;
    return acc;
  }, {});
}

function buildPitchZoneColorValues(zoneCounts: Partial<Record<PitchRoleZoneCode, number>>) {
  const leftWide = (zoneCounts.LM || 0) + (zoneCounts.LW || 0);
  const rightWide = (zoneCounts.RM || 0) + (zoneCounts.RW || 0);
  return PITCH_ROLE_ZONES.reduce<Partial<Record<PitchRoleZoneCode, number>>>((acc, zone) => {
    if (zone.code === 'LM' || zone.code === 'LW') acc[zone.code] = leftWide;
    else if (zone.code === 'RM' || zone.code === 'RW') acc[zone.code] = rightWide;
    else acc[zone.code] = zoneCounts[zone.code] || 0;
    return acc;
  }, {});
}

function firstDefined<T>(...values: T[]): T | undefined {
  return values.find((value) => value !== undefined && value !== null && value !== '') as T | undefined;
}

function toNumberOrUndefined(value: unknown): number | undefined {
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

function buildReportDisplayPlayer(player: PlayerData, report: ScoutingReportResponse): PlayerData {
  const card = report.content_json?.player_card || {};
  const metaDoc = report.content_json?.metrics_docs?.[0]?.metadata || {};

  if (!card || typeof card !== 'object') return player;

  const positionCounts = normalizePositionCounts(card.position_counts || card.positionCounts || metaDoc.position_counts || player.meta?.positionCounts);
  const positionNamesSeen = normalizePositionNames(card.position_names_seen || card.positionNamesSeen || metaDoc.position_names_seen || player.meta?.positionNamesSeen);
  const positionCountTotal =
    toNumberOrUndefined(card.position_count_total || card.positionCountTotal || metaDoc.position_count_total) ||
    Object.values(positionCounts).reduce((sum, count) => sum + count, 0) ||
    player.meta?.positionCountTotal;

  const rolesFromCard = Array.isArray(card.roles) ? card.roles : undefined;
  const roles = positionNamesSeen.length ? positionNamesSeen : rolesFromCard || player.meta?.roles;

  return {
    ...player,
    name: String(firstDefined(card.name, card.player_name, card.playerName, metaDoc.player_name, player.name) || player.name),
    meta: {
      ...player.meta,
      gender: firstDefined(card.gender, metaDoc.gender, player.meta?.gender) as string | undefined,
      nationality: firstDefined(card.nationality, card.nationality_name, card.nationalityName, metaDoc.nationality_name, player.meta?.nationality) as string | undefined,
      team: firstDefined(card.team, card.team_name, card.teamName, metaDoc.team_name, player.meta?.team) as string | undefined,
      league: firstDefined(card.league, card.league_name, card.leagueName, metaDoc.league_name, player.meta?.league) as string | undefined,
      age: toNumberOrUndefined(firstDefined(card.age, metaDoc.age, player.meta?.age)),
      height: toNumberOrUndefined(firstDefined(card.height, metaDoc.height, player.meta?.height)),
      weight: toNumberOrUndefined(firstDefined(card.weight, metaDoc.weight, player.meta?.weight)),
      potential: toNumberOrUndefined(firstDefined(card.potential, player.meta?.potential)),
      form: toNumberOrUndefined(firstDefined(card.form, player.meta?.form)),
      roles,
      ...(Object.keys(positionCounts).length ? { positionCounts } : {}),
      ...(positionNamesSeen.length ? { positionNamesSeen } : {}),
      ...(positionCountTotal ? { positionCountTotal } : {}),
      primaryPositionCode: firstDefined(card.primary_position_code, card.primaryPositionCode, player.meta?.primaryPositionCode) as string | undefined,
    },
  };
}

function getReportPositionSource(player: PlayerData, report: ScoutingReportResponse) {
  const card = report.content_json?.player_card || {};
  const counts = normalizePositionCounts(card.position_counts || card.positionCounts || player.meta?.positionCounts);
  const namesSeen = normalizePositionNames(card.position_names_seen || card.positionNamesSeen || player.meta?.positionNamesSeen);
  const total =
    Object.values(counts).reduce((sum, count) => sum + count, 0) ||
    Number(card.position_count_total || card.positionCountTotal || player.meta?.positionCountTotal || 0);
  return { counts, namesSeen, total };
}

function RoleDistributionPitchMap({ player, report }: { player: PlayerData; report: ScoutingReportResponse }) {
  const [pitchSpace, setPitchSpace] = useState({ width: 0, height: 0 });
  const pitchWidth = Math.max(0, Math.min(pitchSpace.width - 32, pitchSpace.height * 0.56));
  const { counts, namesSeen, total } = getReportPositionSource(player, report);
  const zoneCounts = normalizePitchZoneCounts(counts);
  const activeZones = new Set<string>([
    ...Object.keys(zoneCounts),
    ...(Object.keys(zoneCounts).length ? [] : namesSeen.map(toPitchZone).filter(Boolean)),
  ]);

  if (!activeZones.size) return null;

  const colorValues = buildPitchZoneColorValues(zoneCounts);
  const max = Math.max(...Object.values(colorValues), ...Object.values(zoneCounts), 0);
  const roleEntries = Object.entries(counts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([role, count]) => ({
      role,
      pct: total ? Math.round((count / total) * 100) : null,
    }));

  return (
    <View style={styles.pitchMapStage}>
      <View style={styles.pitchRoleList}>
        {roleEntries.map((entry) => (
          <View key={entry.role} style={styles.pitchRolePill}>
            <Text style={styles.pitchRoleCode}>{entry.role}</Text>
            {entry.pct !== null ? <Text style={styles.pitchRolePct}>{entry.pct}%</Text> : null}
          </View>
        ))}
      </View>
      <View style={styles.pitchCanvas} onLayout={({nativeEvent: {layout}}) => setPitchSpace({width: layout.width, height: layout.height})}>
      <View style={styles.pitchFieldRow}>
      <View style={[styles.pitchMapWrap, {width: pitchWidth, height: pitchWidth / 0.56}]}>
        <Svg viewBox="0 0 56 100" width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="mobileReportPitchShade" x1="0" x2="0" y1="0" y2="1">
            <Stop offset="0%" stopColor="#0A371E" />
            <Stop offset="50%" stopColor="#082616" />
            <Stop offset="100%" stopColor="#0A371E" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="56" height="100" fill="url(#mobileReportPitchShade)" />
        {PITCH_ROLE_ZONES.map((zone) => {
          const count = zoneCounts[zone.code] || 0;
          const colorValue = colorValues[zone.code] || 0;
          const active = activeZones.has(zone.code) || Boolean(colorValue);
          const intensity = colorValue && max ? colorValue / max : 0;
          const percent = count && total ? Math.round((count / total) * 100) : 0;
          const fill = active ? `rgba(32, 201, 151, ${0.06 + intensity * 0.62})` : 'rgba(6, 16, 11, 0.24)';
          const labelX = zone.x + zone.w / 2;
          const labelY = zone.y + zone.h / 2;
          const roleY = labelY - (percent ? 3.2 : 0);
          const percentY = labelY + 4.6;
          return (
            <React.Fragment key={zone.code}>
              <Rect
                x={zone.x}
                y={zone.y}
                width={zone.w}
                height={zone.h}
                fill={fill}
                stroke="rgba(215, 239, 219, 0.36)"
                strokeWidth={0.42}
              />
              <SvgText
                x={labelX}
                y={roleY}
                textAnchor="middle"
                alignmentBaseline="middle"
                fill="rgba(255,255,255,0.93)"
                fontSize="3.45"
                fontWeight="900"
              >
                {zone.code}
              </SvgText>
              {percent ? (
                <SvgText
                  x={labelX}
                  y={percentY}
                  textAnchor="middle"
                  alignmentBaseline="middle"
                  fill="#D1FAE5"
                  fontSize="2.75"
                  fontWeight="900"
                >
                  {percent} %
                </SvgText>
              ) : null}
            </React.Fragment>
          );
        })}
        </Svg>
      </View>
      <View style={styles.pitchDirectionSlot}>
        <View style={[styles.pitchDirectionRail, {height: Math.min(178, pitchWidth / 0.56)}]}>
          <Svg viewBox="0 0 10 48" width="100%" height="100%" preserveAspectRatio="none">
            <Line x1="5" y1="43" x2="5" y2="7" stroke="rgba(148, 163, 184, 0.74)" strokeWidth="0.7" strokeLinecap="round" />
            <Polygon points="5,4.4 3.45,8.6 6.55,8.6" fill="rgba(148, 163, 184, 0.74)" />
          </Svg>
        </View>
      </View>
      </View>
      </View>
    </View>
  );
}

const NARRATIVE_FALLBACK_KEYS: Record<NarrativeSection, string[]> = {
  strengths: [
    'narrative_strength_primary_edge',
    'narrative_strength_system_value',
    'narrative_strength_game_impact',
    'narrative_strength_development_signal',
    'narrative_strength_decision_value',
  ],
  weaknesses: [
    'narrative_weakness_risk_scenario',
    'narrative_weakness_pressure_point',
    'narrative_weakness_trade_off',
    'narrative_weakness_coaching_cue',
    'narrative_weakness_mitigation',
  ],
  conclusion: [
    'narrative_conclusion_role_system',
    'narrative_conclusion_development_focus',
    'narrative_conclusion_usage_recommendation',
    'narrative_conclusion_in_possession',
    'narrative_conclusion_out_of_possession',
  ],
};

function narrativeTitleFallback(
  section: NarrativeSection,
  index: number,
  translate: TFunction,
): string {
  const key = NARRATIVE_FALLBACK_KEYS[section][index];
  return key ? translate(key, { defaultValue: '' }) : '';
}

function parseNarrativeBullet(
  item: string,
  section: NarrativeSection,
  index: number,
  translate: TFunction,
): NarrativeBullet {
  const match = item.match(/^([^:：\n]{2,90})[:：]\s*(.+)$/);
  if (match) {
    return { title: match[1].trim(), body: match[2].trim() };
  }

  return {
    title: narrativeTitleFallback(section, index, translate),
    body: item,
  };
}

function NarrativeBulletRow({
  item,
  index,
  section,
  color,
  translate,
}: {
  item: string;
  index: number;
  section: NarrativeSection;
  color: string;
  translate: TFunction;
}) {
  const bullet = parseNarrativeBullet(item, section, index, translate);
  return (
    <View style={[styles.narrativeRow, {borderColor: `${color}55`, backgroundColor: `${color}08` }]}>
      {bullet.title ? <View style={styles.narrativeHeading}><View style={[styles.narrativeMarker, {backgroundColor:color}]} /><Text style={[styles.narrativeTitle, {color}]}>{bullet.title}</Text></View> : null}
      <Text style={styles.narrativeText}>{bullet.body}</Text>
    </View>
  );
}

function stripBullet(s: string) {
  return s.replace(/^\s*[-•]\s*/, '').trim();
}

function splitBullets(block: string): string[] {
  const lines = (block || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const bulletLines = lines.filter((l) => /^[-•]\s+/.test(l));
  const src = bulletLines.length ? bulletLines : lines;

  return src.map(stripBullet).filter(Boolean);
}

function parseReportText(text: string): ParsedReport {
  const t = text || '';

  const strengthsBlock =
    (t.match(/STRENGTHS(?:\s*\(\d+\))?\s*\n([\s\S]*?)(?:\n\s*(POTENTIAL\s+WEAKNESSES|WEAKNESSES|CONCLUSION)\b)/i)?.[1] ?? '').trim();

  const weaknessesBlock =
    (t.match(/(POTENTIAL\s+WEAKNESSES\s*\/\s*CONCERNS|WEAKNESSES(?:\s*\/\s*CONCERNS)?)\s*\n([\s\S]*?)(?:\n\s*CONCLUSION\b)/i)?.[2] ?? '').trim();

  const conclusionBlock =
    (t.match(/CONCLUSION\s*\n([\s\S]*)$/i)?.[1] ?? '').trim();

  return {
    strengths: strengthsBlock ? splitBullets(strengthsBlock) : [],
    weaknesses: weaknessesBlock ? splitBullets(weaknessesBlock) : [],
    conclusion: conclusionBlock ? splitBullets(conclusionBlock) : [],
  };
}

function buildSpiderGroupsFromReport(report: ScoutingReportResponse): Array<{
  titleKey: string;
  fallbackTitle: string;
  points: SpiderPoint[];
  Icon: ReportIcon;
}> {
  const cj = report?.content_json;
  const meta = cj?.metrics_docs?.[0]?.metadata;

  if (!meta || typeof meta !== 'object') return [];

  const SKIP = new Set([
    'player_name',
    'team_name',
    'nationality_name',
    'position_name',
    'player_key',
    'gender',
    'age',
    'height',
    'weight',
    'match_count',
  ]);

  const stats: Array<{ metric: string; value: number | string }> = Object.entries(meta)
    .filter(([k]) => !SKIP.has(k))
    .filter(([, v]) => typeof v === 'number' || typeof v === 'string')
    .map(([metric, value]) => ({ metric, value: value as number | string }));

  const roles: string[] =
    (cj?.player_card?.roles && Array.isArray(cj.player_card.roles))
      ? cj.player_card.roles
      : [];

  const isGK = roles.some((r) => String(r).toLowerCase().includes('goalkeeper') || String(r).toUpperCase() === 'GK');

  const groups: Array<{ titleKey: string; fallbackTitle: string; points: SpiderPoint[]; Icon: ReportIcon }> = [];

  if (isGK) {
    const pts = toSpiderPoints(stats, GK_METRICS);
    if (pts.length) groups.push({ titleKey: 'goalkeeping', fallbackTitle: 'Goalkeeping', points: pts, Icon: ShieldCheck });
  }
  const contrib = toSpiderPoints(stats, CONTRIBUTION_IMPACT_METRICS);
  if (contrib.length) groups.push({ titleKey: 'contribution_impact', fallbackTitle: 'Contribution & Impact', points: contrib, Icon: Star });

  const shooting = toSpiderPoints(stats, SHOOTING_METRICS);
  if (shooting.length) groups.push({ titleKey: 'shooting', fallbackTitle: 'Shooting & Finishing', points: shooting, Icon: LogIn });

  const passing = toSpiderPoints(stats, PASSING_METRICS);
  if (passing.length) groups.push({ titleKey: 'passing', fallbackTitle: 'Passing & Delivery', points: passing, Icon: DraftingCompass });

  const defending = toSpiderPoints(stats, DEFENDING_METRICS);
  if (defending.length) groups.push({ titleKey: 'defending', fallbackTitle: 'Defending', points: defending, Icon: BrickWall });

  const errors = toSpiderPoints(stats, ERRORS_DISCIPLINE_METRICS);
  if (errors.length) groups.push({ titleKey: 'errors_discipline', fallbackTitle: 'Errors & Discipline', points: errors, Icon: ShieldAlert });

  return groups;
}

function ReportPageHeading({name, imageUrl, title, Icon, accent = ACCENT}: {name: string; imageUrl?: string; title: string; Icon: ReportIcon; accent?: string}) {
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setImageFailed(false), [imageUrl]);
  const initials = name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  return <View style={[styles.reportHeading, {borderColor:`${accent}40`,backgroundColor:`${accent}0F`} ]}>
    <View style={styles.reportPlayer}>
      <View style={[styles.reportPortraitFrame, {borderColor:accent}]}>
        {imageUrl && !imageFailed
          ? <Image source={{uri:imageUrl}} resizeMode="contain" onError={()=>setImageFailed(true)} style={styles.reportPortrait}/>
          : <Text style={[styles.reportPortraitInitials,{color:accent}]}>{initials}</Text>}
      </View>
      <View style={styles.reportIdentity}><Text numberOfLines={1} style={styles.reportEyebrow}>SCOUTWISE</Text><Text style={[styles.reportName, accent === DANGER && {color:accent}]}>{name}</Text></View>
    </View>
    <View style={[styles.reportCategory,{backgroundColor:`${accent}20`}]}><Icon size={17} color={accent}/><Text style={[styles.reportCategoryText,{color:accent}]}>{title}</Text></View>
  </View>;
}
function ReportToggle({options, value, onChange, accent = ACCENT}: {accent?: string;options: {value:string; label:string; Icon:ReportIcon}[]; value:string; onChange:(value:any)=>void}) {
 return <View style={styles.metricSwitch}>{options.map(({value:v,label,Icon})=><Pressable key={v} accessibilityRole="button" accessibilityState={{selected:value===v}} onPress={()=>onChange(v)} style={({pressed})=>[styles.metricOption,value===v&&[styles.metricActive,{backgroundColor:`${accent}20`,borderColor:`${accent}70`}],pressed&&{opacity:.8}]}><Icon size={16} color={value===v?accent:MUTED}/><Text style={{color:value===v?TEXT:MUTED,fontSize:13,fontWeight:'700'}}>{label}</Text></Pressable>)}</View>;
}

function LockedInsightCard({ title, message, buttonLabel, onOpenPlans, accent = ACCENT }: { title: string; message: string; buttonLabel: string; onOpenPlans: () => void; accent?: string }) {
  return <View style={[styles.lockedInsight, {borderColor:`${accent}55`, backgroundColor:`${accent}0A`}]}>
    <View style={styles.lockedInsightHeading}>
      <View style={[styles.lockedInsightIcon, {borderColor:`${accent}66`, backgroundColor:`${accent}18`}]}>
        <LockKeyhole size={17} color={accent} strokeWidth={2.3}/>
      </View>
      <Text style={[styles.lockedInsightTitle,{color:accent}]}>{title}</Text>
    </View>
    <Text style={styles.lockedInsightText}>{message}</Text>
    <Pressable onPress={onOpenPlans} style={({pressed})=>[styles.lockedInsightButton,pressed&&{opacity:.82}]}>
      <Text style={styles.lockedInsightButtonText}>{buttonLabel}</Text>
    </Pressable>
  </View>;
}

function ReportAnalysisState({failed,onRetry}:{failed:boolean;onRetry:()=>void}){
 const {t}=useTranslation();
 return <View style={styles.analysisState}>{failed?<><Text style={styles.analysisStateText}>{t('reportFailedBody','Could not generate the report. Please try again later.')}</Text><Pressable accessibilityRole="button" onPress={onRetry} style={styles.analysisRetry}><Text style={styles.analysisRetryText}>{t('tryAgain','Try Again')}</Text></Pressable></>:<><ActionSpinner size={27} color={ACCENT}/><Text style={styles.analysisStateText}>{t('generatingReport','Generating report…')}</Text></>}</View>;
}

function ReportMetricPage({ group, name, imageUrl, report }: { group: ReturnType<typeof buildSpiderGroupsFromReport>[number]; name: string; imageUrl?: string; report: ScoutingReportResponse }) {
  const { t, i18n } = useTranslation();
  const [unit, setUnit] = useState<EnterpriseMetricUnit>('perMatch');
  const [view, setView] = useState<'radar' | 'tiles'>('radar');
  const [width, setWidth] = useState(320);
  const meta = report.content_json?.metrics_docs?.[0]?.metadata ?? {};
  const stats = Object.entries(meta).flatMap(([metric, value]) => typeof value === 'number' || typeof value === 'string' ? [{metric, value}] : []);
  const points = comparisonPoints(stats, group.points.map(p=>p.label), {unit});
  const isErrors = group.titleKey === 'errors_discipline';
  const accent = isErrors ? DANGER : ACCENT;
  return <View style={{gap:14, width:'100%'}} onLayout={e=>setWidth(e.nativeEvent.layout.width)}>
    <ReportPageHeading name={name} imageUrl={imageUrl} title={t(group.titleKey,group.fallbackTitle)} Icon={group.Icon} accent={accent}/>
    <View style={styles.reportControls}>
      <ReportToggle accent={accent} value={unit} onChange={setUnit} options={[{value:'perMatch',label:i18n.language.startsWith('tr')?'Maç Başı':'Per Match',Icon:Clock3},{value:'per90',label:i18n.language.startsWith('tr')?'90 Dakika':'Per 90',Icon:Timer}]}/>
      {!isErrors && <ReportToggle value={view} onChange={setView} options={[{value:'radar',label:'Radar',Icon:Radar},{value:'tiles',label:i18n.language.startsWith('tr')?'Sayılar':'Numbers',Icon:ListOrdered}]}/>}
    </View>
    {isErrors ? <ErrorsDisciplineTiles points={points} hideTitle expandable={false} accent={DANGER} framed /> : view==='radar' ? <View style={styles.radarFrame}>
      <View style={styles.radarAreaHeader}><View style={{flexDirection:'row',alignItems:'center',gap:7}}><Radar size={16} color={ACCENT}/><Text style={styles.radarAreaTitle}>{i18n.language.startsWith('tr')?'Performans Profili':'Performance Profile'}</Text></View><Text style={styles.radarUnit}>{unit==='per90'?'90′':i18n.language.startsWith('tr')?'Maç Başı':'Per Match'}</Text></View>
      <SpiderChart hideTitle title={t(group.titleKey,group.fallbackTitle)} points={points} Icon={group.Icon} chartSize={Math.max(0,width-26)} /></View> : points.map(p=><View key={p.label} style={styles.metricTile}><Text style={{color:TEXT,flex:1,fontWeight:'600'}}>{String(t(`metric.${p.label}`,{defaultValue:p.label}))}</Text><Text style={{color:ACCENT,fontWeight:'800',fontSize:17}}>{Number(p.value).toLocaleString(i18n.language,{maximumFractionDigits:2})}{p.label.includes('%')?'%':''}</Text></View>)}
  </View>;
}

export default function ScoutingReport({ visible, onClose, player, report: initialReport, plan = 'Free', reloadReport, loadReportSection, onReportUpdate }: Props) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [page, setPage] = useState(0);
  const { t, i18n } = useTranslation();
  const [report,setReport]=useState(initialReport);
  const [retryToken,setRetryToken]=useState(0);
  const reloadReportRef=useRef(reloadReport),loadReportSectionRef=useRef(loadReportSection),onReportUpdateRef=useRef(onReportUpdate);
  reloadReportRef.current=reloadReport;loadReportSectionRef.current=loadReportSection;onReportUpdateRef.current=onReportUpdate;
  useEffect(()=>setReport(initialReport),[initialReport]);
  useEffect(()=>{
    if(!visible||report.status!=='processing'||report.content_json?.generation_mode==='lazy_sections'||!reloadReportRef.current)return;
    let cancelled=false;let timer:ReturnType<typeof setTimeout>;
    const poll=()=>{timer=setTimeout(async()=>{try{const next=await reloadReportRef.current!();if(cancelled)return;setReport(next);onReportUpdateRef.current?.(next);if(next.status==='processing')poll();}catch{if(!cancelled)poll();}},2000);};
    poll();return()=>{cancelled=true;clearTimeout(timer);};
  },[visible,report.status,report.content_json?.generation_mode,retryToken]);
  const retryReport=useCallback(async()=>{if(!reloadReportRef.current)return;const next=await reloadReportRef.current();setReport(next);onReportUpdateRef.current?.(next);setRetryToken(value=>value+1);},[]);
  const analysisReady=report.status==='ready'&&!!report.content;
  const analysisFailed=report.status==='failed'||report.status==='error';
  const narrativeState=(section:'strengths'|'weaknesses'|'role_usage')=>report.content_json?.sections?.[section]?.status;
  const narrativeReady=(section:'strengths'|'weaknesses'|'role_usage')=>(narrativeState(section)==='ready'&&reportScopeMatches(report.content_json?.sections?.[section],plan!=='Free'))||(!report.content_json?.generation_mode&&analysisReady);
  const narrativeFailed=(section:'strengths'|'weaknesses'|'role_usage')=>narrativeState(section)==='failed'||(!report.content_json?.generation_mode&&analysisFailed);
  const applyReport=useCallback((next:ScoutingReportResponse)=>{setReport(next);onReportUpdateRef.current?.(next);},[]);
  const retrySection=useCallback(async(section:'strengths'|'weaknesses'|'role_usage')=>{
    if(!loadReportSectionRef.current)return retryReport();
    setRetryToken(value=>value+1);
  },[retryReport]);

  const [pagerWidth, setPagerWidth] = useState<number>(0);
  const listRef = useRef<FlatList<PageItem> | null>(null);

  const parsed = useMemo(() => parseReportText(report?.content || ''), [report?.content]);
  const reportDisplayPlayer = useMemo(() => buildReportDisplayPlayer(player, report), [player, report]);
  const spiderGroups = useMemo(() => buildSpiderGroupsFromReport(report), [report]);
  const narrativeLimit = plan === 'Free' ? 2 : 3;
  const openPlanManagement = useCallback(() => {
    onClose();
    requestAnimationFrame(() => navigation.navigate('ManagePlan'));
  }, [navigation, onClose]);

  useEffect(() => {
    if (visible) setPage(0);
  }, [visible, spiderGroups.length]);

  const pages = useMemo<PageItem[]>(() => {
    const playerPage: PageItem = {
      key: 'player',
      title: t('player', 'Player'),
      node: (
        <View style={styles.playerPage}>
          <PlayerCard player={reportDisplayPlayer} titleAlign="center" />

          <Text style={styles.createdByTitle}>
            {!!t('createdByPrefix', { defaultValue: '' }) && (
              <Text style={styles.createdByPrefix}>
                {t('createdByPrefix')}{' '}
              </Text>
            )}

            <Text style={styles.brandScout}>{t('brandScout', 'Scout')}</Text>
            <Text style={styles.brandWise}>{t('brandWise', 'Wise')}</Text>

            {!!t('createdBySuffix', { defaultValue: '' }) && (
              <Text style={styles.createdByPrefix}>
                {' '}{t('createdBySuffix')}
              </Text>
            )}
          </Text>

          <Text style={styles.reportHint}>
            {t('tapArrowsToNavigate', 'Tap arrows to navigate the report.')}
          </Text>
        </View>
      ),
    };

    const strengthsPage: PageItem = {
      key: 'strengths',
      title: t('strengths', 'Strengths'),
      node: (
        <View style={{ gap: 10 }}>
          <ReportPageHeading name={reportDisplayPlayer.name} imageUrl={reportDisplayPlayer.meta?.imageUrl} title={t('strengths', 'Strengths')} Icon={ShieldCheck}/>
          {!narrativeReady('strengths') ? <ReportAnalysisState failed={narrativeFailed('strengths')} onRetry={()=>retrySection('strengths')}/> : parsed.strengths.length === 0 ? (
            <Text style={{ color: MUTED }}>
              {t('noStrengthsFound', 'No strengths section found.')}
            </Text>
          ) : (
            parsed.strengths.slice(0, narrativeLimit).map((s, i) => (
              <NarrativeBulletRow
                key={`${i}-${s}`}
                item={s}
                index={i}
                section="strengths"
                color={ACCENT}
                translate={t}
              />
            ))
          )}
          {narrativeReady('strengths') && plan === 'Free' ? <LockedInsightCard
            title={t('lockedMoreStrengthsTitle', 'More Strengths')}
            message={t('lockedMoreStrengthsBody', 'Switch to Plus or Pro to reveal more strengths.')}
            buttonLabel={t('managePlan', 'Manage Plan')}
            onOpenPlans={openPlanManagement}
          /> : null}
        </View>
      ),
    };

    const weaknessesPage: PageItem = {
      key: 'weaknesses',
      title: t('weakness_concerns', 'Weakness & Concerns'),
      node: (
        <View style={{ gap: 10 }}>
          <ReportPageHeading name={reportDisplayPlayer.name} imageUrl={reportDisplayPlayer.meta?.imageUrl} title={t('weakness_concerns', 'Weaknesses')} Icon={ShieldAlert} accent={DANGER}/>
          {!narrativeReady('weaknesses') ? <ReportAnalysisState failed={narrativeFailed('weaknesses')} onRetry={()=>retrySection('weaknesses')}/> : parsed.weaknesses.length === 0 ? (
            <Text style={{ color: MUTED }}>
              {t('noConcernsFound', 'No concerns section found.')}
            </Text>
          ) : (
            parsed.weaknesses.slice(0, narrativeLimit).map((s, i) => (
              <NarrativeBulletRow
                key={`${i}-${s}`}
                item={s}
                index={i}
                section="weaknesses"
                color={DANGER}
                translate={t}
              />
            ))
          )}
          {narrativeReady('weaknesses') && plan === 'Free' ? <LockedInsightCard
            title={t('lockedMoreWeaknessesTitle', 'More Weaknesses')}
            message={t('lockedMoreWeaknessesBody', 'Switch to Plus or Pro to reveal more weaknesses.')}
            buttonLabel={t('managePlan', 'Manage Plan')}
            onOpenPlans={openPlanManagement}
            accent={DANGER}
          /> : null}
        </View>
      ),
    };

    const pitchSource = getReportPositionSource(reportDisplayPlayer, report);
    const hasPitchMap = Object.keys(pitchSource.counts).length > 0 || pitchSource.namesSeen.length > 0;
    const primaryPhaseRole = roleShortLabel(
      reportDisplayPlayer.meta?.primaryPositionCode ||
      Object.entries(pitchSource.counts).sort((a, b) => b[1] - a[1])[0]?.[0] ||
      pitchSource.namesSeen[0],
    );
    const pitchMapPage: PageItem | null = hasPitchMap
      ? {
          key: 'pitch-map',
          title: t('pitchMap', 'Pitch Map'),
          node: (
            <View style={styles.pitchMapPage}>
              <RoleDistributionPitchMap player={reportDisplayPlayer} report={report} />
            </View>
          ),
          Icon: MapIcon,
        }
      : null;

    const roleBullets = parsed.conclusion.map((item, index) => ({item, index})).filter(({item, index}) => {
      const title = parseNarrativeBullet(item, 'conclusion', index, t).title
        .toLocaleLowerCase('tr').replace(/ı/g, 'i').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[*_]/g, '').trim();
      if (/^(kullanim onerisi|usage recommendation|usage advice)$/.test(title)) return false;
      if (plan === 'Free' && /^(gelisim odagi|development focus)$/.test(title)) return false;
      return true;
    });
    const roleUsagePage: PageItem = {
      key: 'conclusion',
      title: t('role_usage', 'Role & Usage'),
      node: (
        <View style={{ gap: 10 }}>
          <ReportPageHeading name={reportDisplayPlayer.name} imageUrl={reportDisplayPlayer.meta?.imageUrl} title={t('role_usage', 'Role & Usage')} Icon={DraftingCompass}/>
          {!narrativeReady('role_usage') ? <ReportAnalysisState failed={narrativeFailed('role_usage')} onRetry={()=>retrySection('role_usage')}/> : roleBullets.length === 0 ? (
            <Text style={{ color: MUTED }}>
              {t('noConclusionFound', 'No conclusion found.')}
            </Text>
          ) : (
            roleBullets.map(({item: s, index: i}) => (
              <NarrativeBulletRow
                key={`${i}-${s}`}
                item={s}
                index={i}
                section="conclusion"
                color={ACCENT}
                translate={t}
              />
            ))
          )}
          {narrativeReady('role_usage') && plan === 'Free' ? <LockedInsightCard
            title={t('lockedDevelopmentFocusTitle', 'Development Focus')}
            message={t('lockedDevelopmentFocusBody', 'Switch to Plus or Pro to reveal Development Focus.')}
            buttonLabel={t('managePlan', 'Manage Plan')}
            onOpenPlans={openPlanManagement}
          /> : null}
        </View>
      ),
    };

    const phasePages: PageItem[] = [true, false].map(possession => {
      const title = i18n.language.startsWith('tr')
        ? possession ? 'Toplu Oyun' : 'Topsuz Oyun'
        : possession ? 'In Possession' : 'Out of Possession';
      const Icon = possession ? DraftingCompass : ShieldCheck;
      return {
        key: possession ? 'in-possession' : 'out-of-possession', title, Icon,
        node: <View style={{ gap: 12 }}>
          <ReportPageHeading name={reportDisplayPlayer.name} imageUrl={reportDisplayPlayer.meta?.imageUrl} title={title} Icon={Icon} accent={possession ? ACCENT : '#F59E0B'} />
          <ReportPhaseDistributions
            phases={report.content_json?.phase_distributions || []}
            possession={possession}
            free={plan === 'Free'}
            primaryRole={primaryPhaseRole}
            onOpenPlans={openPlanManagement}
          />
        </View>,
      };
    });
    const out: PageItem[] = [playerPage, ...(pitchMapPage ? [pitchMapPage] : []), roleUsagePage, ...phasePages, strengthsPage, weaknessesPage];

    spiderGroups.forEach((g, idx) => {
      const title = t(g.titleKey, g.fallbackTitle);
      const node = <ReportMetricPage group={g} name={reportDisplayPlayer.name} imageUrl={reportDisplayPlayer.meta?.imageUrl} report={report} />;

      out.push({ key: `metrics-${idx}`, title, node, Icon: g.Icon });
    });

    return out;
  }, [reportDisplayPlayer, report, parsed, spiderGroups, t, i18n.language, narrativeLimit, openPlanManagement, plan, analysisReady, analysisFailed, retryReport, retrySection]);

  const activeNarrativeSection = pages[page]?.key === 'strengths' ? 'strengths' : pages[page]?.key === 'weaknesses' ? 'weaknesses' : pages[page]?.key === 'conclusion' ? 'role_usage' : null;
  useEffect(()=>{
    if(!visible||!activeNarrativeSection||!loadReportSectionRef.current||report.content_json?.generation_mode!=='lazy_sections')return;
    const status=narrativeState(activeNarrativeSection);
    if(status==='ready'&&reportScopeMatches(report.content_json?.sections?.[activeNarrativeSection],plan!=='Free'))return;
    let cancelled=false;let timer:ReturnType<typeof setTimeout>;
    const poll=async()=>{try{const next=await reloadReportRef.current!();if(cancelled)return;applyReport(next);const nextStatus=next.content_json?.sections?.[activeNarrativeSection]?.status;if(nextStatus!=='failed'&&(nextStatus!=='ready'||!reportScopeMatches(next.content_json?.sections?.[activeNarrativeSection],plan!=='Free')))timer=setTimeout(poll,2000);}catch{if(!cancelled)timer=setTimeout(poll,5000);}};
    const request=async()=>{try{const next=await loadReportSectionRef.current!(activeNarrativeSection);if(cancelled)return;applyReport(next);const nextStatus=next.content_json?.sections?.[activeNarrativeSection]?.status;if(nextStatus!=='failed'&&(nextStatus!=='ready'||!reportScopeMatches(next.content_json?.sections?.[activeNarrativeSection],plan!=='Free')))timer=setTimeout(poll,2000);}catch{if(!cancelled)timer=setTimeout(request,5000);}};
    request();return()=>{cancelled=true;clearTimeout(timer);};
  },[visible,activeNarrativeSection,report.content_json?.generation_mode,report.content_json?.sections?.[activeNarrativeSection || '']?.status,applyReport,retryToken,plan]);

  const last = pages.length - 1;
  const canPrev = page > 0;
  const canNext = page < last;

  const scrollToPage = useCallback(
    (nextIndex: number, animated = true) => {
      const idx = Math.max(0, Math.min(last, nextIndex));
      setPage(idx);
      if (pagerWidth > 0) {
        listRef.current?.scrollToIndex({ index: idx, animated });
      }
    },
    [last, pagerWidth]
  );

  const goPrev = () => scrollToPage(page - 1);
  const goNext = () => scrollToPage(page + 1);

  useEffect(() => {
    if (visible) {
      scrollToPage(0, false);
    }
  }, [visible, scrollToPage]);

  const onPagerLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w > 0 && w !== pagerWidth) setPagerWidth(w);
  };

  const onSwipeEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (pagerWidth <= 0) return;
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.round(x / pagerWidth);
    if (idx !== page) setPage(idx);
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={[styles.backdrop, { paddingTop: Math.max(14, insets.top), paddingBottom: Math.max(14, insets.bottom) }]}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              {pages[page]?.Icon ? React.createElement(pages[page].Icon as ReportIcon, { size: 18, color: ACCENT, strokeWidth: 2.2 }) : null}
              <Text style={styles.headerTitle}>
                {t('scoutingReport', 'Scouting Report')} • {pages[page]?.title ?? ''}
              </Text>
            </View>

            <Pressable
              onPress={onClose}
              hitSlop={10}
              accessibilityLabel={t('closeScoutingReport', 'Close scouting report')}
              style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
            >
              <X size={22} color={DANGER} />
            </Pressable>
          </View>

          <View style={styles.headerDivider} />

          <View onLayout={onPagerLayout} style={{ flex: 1, paddingBottom: 65 }}>
            {pagerWidth > 0 ? (
              <FlatList
                ref={listRef}
                data={pages}
                keyExtractor={(item) => item.key}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={onSwipeEnd}
                getItemLayout={(_, index) => ({
                  length: pagerWidth,
                  offset: pagerWidth * index,
                  index,
                })}
                renderItem={({ item }) => (
                  <View style={{ width: pagerWidth, height: '100%' }}>
                    {item.key === 'pitch-map' ? item.node : <ScrollView
                      contentContainerStyle={{ paddingBottom: 0 }}
                      showsVerticalScrollIndicator
                    >
                      {item.node}
                    </ScrollView>}
                  </View>
                )}
              />
            ) : null}
          </View>

          <View style={styles.footer}>
            <Pressable
              onPress={goPrev}
              disabled={!canPrev}
              style={({ pressed }) => [
                styles.navBtn,
                !canPrev && { opacity: 0.35 },
                pressed && canPrev && { opacity: 0.85 },
              ]}
              accessibilityLabel={t('previousSection', 'Previous section')}
            >
              <ChevronLeft size={22} color={TEXT} />
            </Pressable>

            <View style={styles.dots}>
              {pages.map((p, i) => (
                <View
                  key={p.key}
                  style={[
                    styles.dot,
                    i === page ? styles.dotActive : styles.dotInactive,
                  ]}
                />
              ))}
            </View>

            <Pressable
              onPress={goNext}
              disabled={!canNext}
              style={({ pressed }) => [
                styles.navBtn,
                !canNext && { opacity: 0.35 },
                pressed && canNext && { opacity: 0.85 },
              ]}
              accessibilityLabel={t('nextSection', 'Next section')}
            >
              <ChevronRight size={22} color={TEXT} />
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  reportHeading: { flexDirection:'row', flexWrap:'wrap', alignItems:'center', justifyContent:'space-between', gap:12, padding:14, borderRadius:18, backgroundColor:'rgba(22,163,74,.06)', borderWidth:1, borderColor:'rgba(22,163,74,.25)' },
  reportPlayer: { flexDirection:'row', alignItems:'center', gap:10, flexGrow:1, flexShrink:1, minWidth:0 },
  reportPortraitFrame: { width:46, height:52, flexShrink:0, borderRadius:13, borderWidth:1, backgroundColor:'#122019', padding:2, alignItems:'center', justifyContent:'center', overflow:'hidden' },
  reportPortrait: { width:'100%', height:'100%', borderRadius:10 },
  reportPortraitInitials: { fontSize:15, fontWeight:'900' },
  reportIdentity: { flexGrow:1, flexShrink:1, minWidth:88, gap:5 },
  reportEyebrow: { color:MUTED, fontSize:9, fontWeight:'800', letterSpacing:1.5 },
  reportName: { color:TEXT, fontSize:20, fontWeight:'800' },
  reportCategory: { flexDirection:'row', alignItems:'center', gap:7, paddingHorizontal:10, paddingVertical:8, borderRadius:12, backgroundColor:'rgba(22,163,74,.13)', maxWidth:'100%' },
  reportCategoryText: { color:ACCENT, fontSize:12, fontWeight:'800', flexShrink:1 },
  reportControls: { gap:8, padding:8, borderRadius:18, borderWidth:1, borderColor:LINE, backgroundColor:'rgba(0,0,0,.12)' },
  metricSwitch: { flexDirection: 'row', borderRadius:12, padding:3, gap:6 },
  metricOption: { flex:1, flexDirection:'row', justifyContent:'center', gap:7, paddingVertical:10, alignItems:'center', borderRadius:10, borderWidth:1, borderColor:'transparent' },
  metricActive: { backgroundColor:'rgba(22,163,74,.13)', borderColor:'rgba(22,163,74,.45)' },
  radarFrame: { width: '100%', alignItems: 'center', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(22,163,74,.45)', backgroundColor: CARD, paddingTop: 14, paddingBottom: 8 },
  radarAreaHeader: { alignSelf:'stretch', flexDirection:'row', flexWrap:'wrap', gap:8, alignItems:'center', justifyContent:'space-between', marginHorizontal:14, paddingBottom:12, borderBottomWidth:1, borderBottomColor:'rgba(22,163,74,.2)' },
  radarAreaTitle: {color:TEXT,fontSize:12,fontWeight:'800'},
  radarUnit: {color:ACCENT,fontSize:11,fontWeight:'700',backgroundColor:'rgba(22,163,74,.12)',paddingHorizontal:9,paddingVertical:5,borderRadius:8},
  metricTile: { flexDirection: 'row', alignItems: 'center', gap: 16, borderRadius: 14, borderWidth: 1, borderColor: LINE, padding: 14, backgroundColor: 'rgba(22,163,74,.04)' },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
  },
  card: {
    width: '100%',
    maxWidth: 620,
    height: '88%',
    backgroundColor: CARD,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: LINE,
    padding: 14,
    ...shadows.card,
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitleRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: TEXT,
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
  },
  headerDivider: {
    height: 1,
    backgroundColor: LINE,
    marginVertical: 10,
  },
  footer: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 22,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: LINE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navBtn: {
    width: 44,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: LINE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 99,
  },
  dotActive: { backgroundColor: ACCENT },
  dotInactive: { backgroundColor: LINE },

  playerPage: {
    gap: 8,
  },
  createdByTitle: {
    textAlign: 'center',
    marginTop: Platform.OS === 'android' ? 8 : 12,
    letterSpacing: 0.3,
    fontSize: 22,
    lineHeight: 27,
  },
  reportHint: {
    color: MUTED,
    lineHeight: 18,
    textAlign: 'center',
  },
  createdByPrefix: {
    color: MUTED,
    fontWeight: '600',
  },
  brandScout: {
    color: TEXT,
    fontWeight: '900',
  },
  brandWise: {
    color: ACCENT,
    fontWeight: '900',
  },
  narrativeRow: { gap: 9, padding: 15, borderRadius: 16, borderWidth: 1 },
  narrativeHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  narrativeMarker: { width: 5, height: 18, borderRadius: 3 },
  narrativeText: { color: TEXT, fontSize: 14, lineHeight: 22 },
  narrativeTitle: { fontWeight: '800', fontSize: 14, flexShrink: 1 },
  lockedInsight: { gap: 10, padding: 14, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed' },
  lockedInsightHeading: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  lockedInsightIcon: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  lockedInsightTitle: { flex: 1, fontSize: 14, fontWeight: '900' },
  lockedInsightText: { color: MUTED, fontSize: 13, lineHeight: 19, fontWeight: '600' },
  lockedInsightButton: { minHeight: 42, borderRadius: 12, borderWidth: 1, borderColor: ACCENT, backgroundColor: 'rgba(22,163,74,0.14)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  lockedInsightButtonText: { color: ACCENT, fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  analysisState:{minHeight:180,alignItems:'center',justifyContent:'center',gap:13,padding:18,borderWidth:1,borderColor:LINE,borderRadius:16,backgroundColor:'rgba(255,255,255,.02)'},
  analysisStateText:{color:MUTED,fontSize:13,lineHeight:20,fontWeight:'600',textAlign:'center'},
  analysisRetry:{minHeight:42,borderWidth:1,borderColor:ACCENT,borderRadius:12,paddingHorizontal:20,alignItems:'center',justifyContent:'center'},
  analysisRetryText:{color:ACCENT,fontSize:12,fontWeight:'900'},
  pitchMapPage: { flex: 1, width: '100%', minHeight: 0 },
  pitchMapStage: { flex: 1, width: '100%', gap: 12 },
  pitchRoleList: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 7 },
  pitchCanvas: { flex: 1, minHeight: 0, alignItems: 'center', justifyContent: 'center' },
  pitchFieldRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pitchRolePill: {
    minHeight: 25,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: 'rgba(255,255,255,0.035)',
    paddingHorizontal: 7,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  pitchRoleCode: {
    color: ACCENT,
    fontSize: 11,
    fontWeight: '900',
  },
  pitchRolePct: {
    color: MUTED,
    fontSize: 10.5,
    fontWeight: '900',
  },
  pitchDirectionSlot: {
    width: 22,
    alignItems: 'center',
  },
  pitchDirectionRail: {
    width: 22,
    height: 178,
    marginTop: 0,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: 'rgba(255,255,255,0.052)',
    overflow: 'hidden',
  },
  pitchMapWrap: {
    overflow: 'hidden',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(167, 199, 172, 0.55)',
    backgroundColor: '#092E19',
  },
});
