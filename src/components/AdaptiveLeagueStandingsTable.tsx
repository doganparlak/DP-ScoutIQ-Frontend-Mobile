import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { CARD, LINE, MUTED, PANEL, TEXT } from '@/theme';
import { matchMetricLabel } from '@/utils/matchReportMetrics';
import type { LeagueBestPlayer, LeagueMetric, LeagueStanding, TeamSeasonMetrics } from '@/services/leaguePerformance';
import { Badge, standingRuleMeta, styles as shared } from './LeaguePerformanceControls';

type Props = {
  rows: LeagueStanding[]; teams: Record<string, TeamSeasonMetrics>; metric?: LeagueMetric;
  playerView: boolean; perMatch: boolean; tr: boolean; showSeason: boolean; showBiweekly: boolean;
  seasonPlayers: Record<string, LeagueBestPlayer>; biweeklyPlayers: Record<string, LeagueBestPlayer>;
  seasonPending: boolean; biweeklyPending: boolean; unavailable: boolean;
  onPlayer: (player: LeagueBestPlayer) => void;
};
export default function AdaptiveLeagueStandingsTable(props: Props) {
  const {width: windowWidth, fontScale} = useWindowDimensions();
  const [measuredWidth, setMeasuredWidth] = React.useState(0);
  const width = Math.max(1, (measuredWidth || Math.max(220, windowWidth - 58)) - 2);
  const scale = Math.max(1, fontScale);
  const wide = width >= 620 * scale;
  const pinnedWidth = Math.min(width * (wide ? .24 : .32), 190 * scale);
  const rankWidth = Math.min(26 * scale, pinnedWidth * .24);
  const teamCell = {flex: 1, paddingRight: 6};
  const teamTextAlign = wide ? 'left' as const : 'center' as const;
  const availableWidth = width - pinnedWidth;
  const statWidth = props.metric ? Math.max(48 * scale, availableWidth * .3) : Math.max(30 * scale, availableWidth / 6);
  const metricWidth = Math.max(100 * scale, availableWidth - statWidth);
  const playerWidth = Math.max(96 * scale, (width - pinnedWidth) / (Number(props.showBiweekly) + Number(props.showSeason) || 1));
  const headerHeight = (props.playerView ? 56 : 44) * scale;
  const rowHeight = (props.showSeason || props.showBiweekly ? 132 : 80) * scale;
  const scrollRef = React.useRef<ScrollView>(null);
  React.useEffect(() => {scrollRef.current?.scrollTo({x: 0, animated: false});}, [wide, props.metric?.key, props.playerView]);
  const columns: Array<{key: 'played' | 'won' | 'drawn' | 'lost' | 'goalDifference' | 'points'; label: string}> = [
    {key: 'played', label: props.tr ? 'O' : 'P'},
    {key: 'won', label: props.tr ? 'G' : 'W'},
    {key: 'drawn', label: props.tr ? 'B' : 'D'},
    {key: 'lost', label: props.tr ? 'M' : 'L'},
    {key: 'goalDifference', label: props.tr ? 'AV' : 'GD'},
    {key: 'points', label: props.tr ? 'PUAN' : 'PTS'},
  ];
  const visibleColumns = props.playerView ? [] : props.metric ? columns.filter(column => column.key === 'points') : columns;
  const number = (n: number | null | undefined) => n == null ? '—' : n.toLocaleString(props.tr ? 'tr-TR' : 'en-GB', {maximumFractionDigits: 2});
  const extraWidth = (props.metric ? metricWidth : 0) + (props.showBiweekly ? playerWidth : 0) + (props.showSeason ? playerWidth : 0);
  const scrolls = statWidth * visibleColumns.length + extraWidth > width - pinnedWidth + 1;
  const cell = {width: statWidth};
  return <View style={{gap: 8}}>
    {scrolls && <Text style={shared.hint}>{props.tr ? 'Takım ve resmî sıra sabit kalır. Diğer sütunlar için yatay kaydırın →' : 'Team and official position stay fixed. Swipe for more columns →'}</Text>}
    <View onLayout={event => setMeasuredWidth(event.nativeEvent.layout.width)} style={styles.table}>
      <View style={{width: pinnedWidth, backgroundColor: PANEL, borderRightWidth: 1, borderRightColor: LINE}}>
        <View style={[styles.row, styles.header, {height: headerHeight}]}><Text style={[styles.heading, {width: rankWidth, paddingHorizontal: 2}]} accessibilityLabel={props.tr ? 'Resmî sıra' : 'Official position'}>#</Text><View style={teamCell}><Text style={[styles.heading, {textAlign: teamTextAlign, paddingHorizontal: 0}]}>{props.tr ? 'TAKIM' : 'TEAM'}</Text></View></View>
        {props.rows.map(row => {
          const rule = standingRuleMeta(row.standingRule, props.tr);
          return <View key={`${row.position}:${row.teamId}`} style={[styles.row, {height: rowHeight}]}>
            {rule && <View style={[styles.ruleStripe, {backgroundColor: rule.color}]} />}
            <Text style={[styles.value, {width: rankWidth, color: rule?.color || TEXT}]}>{row.position ?? '—'}</Text>
            <View style={[teamCell, {paddingVertical: 10, gap: 6}]}><View style={{gap: 5, alignItems: wide ? 'flex-start' : 'center'}}><Badge url={row.teamImageUrl} size={wide ? 24 : 20} /><Text numberOfLines={2} style={[shared.text, {fontSize: wide ? 12 : 10, lineHeight: wide ? 16 : 14, textAlign: teamTextAlign}]}>{row.teamName}</Text></View>{rule && wide && <Text numberOfLines={2} style={{color: rule.color, fontSize: 9, lineHeight: 12, paddingLeft: 2}}>{rule.label}</Text>}</View>
          </View>;
        })}
      </View>
      <ScrollView ref={scrollRef} horizontal style={{flex: 1}} showsHorizontalScrollIndicator={scrolls} nestedScrollEnabled bounces={false}>
        <View>
          <View style={[styles.row, styles.header, {height: headerHeight}]}>
            {visibleColumns.map(column => <Text key={column.key} style={[styles.heading, cell, column.key === 'points' && styles.points]}>{column.label}</Text>)}
            {props.metric && <Text numberOfLines={3} style={[styles.heading, {width: metricWidth, color: '#7DD3FC'}]}>{matchMetricLabel(props.metric.label, props.tr ? 'tr' : 'en').toLocaleUpperCase(props.tr ? 'tr-TR' : 'en-GB')}</Text>}
            {props.showBiweekly && <Text style={[styles.heading, {width: playerWidth}]}>{props.tr ? 'İKİ HAFTANIN OYUNCUSU' : 'TWO-WEEK TOP PLAYER'}</Text>}
            {props.showSeason && <Text style={[styles.heading, {width: playerWidth}]}>{props.tr ? 'SEZONUN OYUNCUSU' : 'PLAYER OF THE SEASON'}</Text>}
          </View>
          {props.rows.map(row => {
            const team = props.teams[String(row.teamId)];
            const item = props.metric && team?.metrics[props.metric.key];
            return <View key={`${row.position}:${row.teamId}`} style={[styles.row, {height: rowHeight}]}>
              {visibleColumns.map(column => <Text key={column.key} style={[styles.value, cell, column.key === 'points' && styles.points]}>{row[column.key] ?? '—'}</Text>)}
              {props.metric && <View style={[styles.extra, {width: metricWidth}]}><Text style={{color: '#7DD3FC', fontWeight: '800'}}>{number(item?.[props.perMatch ? 'perMatch' : 'value'])}{item && props.metric.unit}</Text>{item && <Text style={shared.hint}>{item.matchesCovered}/{team.matches} {props.tr ? 'maç' : 'matches'}</Text>}</View>}
              {props.showBiweekly && <View style={[styles.extra, {width: playerWidth}]}><TeamPlayer player={props.biweeklyPlayers[String(row.teamId)]} pending={props.biweeklyPending} unavailable={props.unavailable} tr={props.tr} onPlayer={props.onPlayer} /></View>}
              {props.showSeason && <View style={[styles.extra, {width: playerWidth}]}><TeamPlayer player={props.seasonPlayers[String(row.teamId)]} pending={props.seasonPending} unavailable={props.unavailable} tr={props.tr} onPlayer={props.onPlayer} /></View>}
            </View>;
          })}
        </View>
      </ScrollView>
    </View>
    {!props.playerView && !props.metric && <Text style={shared.hint}>{props.tr ? 'O: Oynanan · G: Galibiyet · B: Beraberlik · M: Mağlubiyet · AV: Averaj' : 'P: Played · W: Won · D: Drawn · L: Lost · GD: Goal difference'}</Text>}
  </View>;
}
function TeamPlayer({player, pending, unavailable, tr, onPlayer}: {player?: LeagueBestPlayer; pending: boolean; unavailable: boolean; tr: boolean; onPlayer: (player: LeagueBestPlayer) => void}) {
  if (!player) return <Text style={[shared.hint, {fontSize: 10, textAlign: 'center'}]}>{pending ? (tr ? 'Hesaplanıyor…' : 'Calculating…') : unavailable ? (tr ? 'Yüklenemedi' : 'Unavailable') : (tr ? 'Puanlı oyuncu yok' : 'No rated player')}</Text>;
  return <View style={{alignItems: 'center', gap: 4, width: '100%'}}>
    <Badge url={player.imageUrl} size={28} player />
    <Text numberOfLines={2} style={{color: TEXT, fontSize: 10, lineHeight: 14, fontWeight: '700', textAlign: 'center'}}>{player.name}</Text>
    <Text style={{color: '#4ADE80', fontSize: 11, fontWeight: '800'}}>{player.averageRating.toFixed(2)}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={`${player.name}, ${tr ? 'Oyuncu Kartı' : 'Player Card'}`} onPress={() => onPlayer(player)} style={{minHeight: 32, justifyContent: 'center', paddingHorizontal: 3}}><Text style={{color: '#4ADE80', fontSize: 10, fontWeight: '700', textAlign: 'center'}}>{tr ? 'Oyuncu Kartı' : 'Player Card'}</Text></Pressable>
  </View>;
}
const styles = StyleSheet.create({
  table: {flexDirection: 'row', borderWidth: 1, borderColor: LINE, borderRadius: 12, overflow: 'hidden'},
  row: {flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: LINE},
  header: {backgroundColor: CARD},
  heading: {color: MUTED, fontSize: 10, fontWeight: '800', textAlign: 'center', paddingHorizontal: 3},
  value: {color: TEXT, fontSize: 12, fontWeight: '800', textAlign: 'center', paddingHorizontal: 2},
  points: {color: '#7DD3FC'}, extra: {alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, gap: 5},
  ruleStripe: {position: 'absolute', top: 0, bottom: 0, left: 0, width: 3},
});
