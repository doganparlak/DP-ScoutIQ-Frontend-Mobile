import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import {
  BarChart3,
  BookmarkPlus,
  Check,
  FileText,
  Building2,
  Globe2,
  MapPin,
  ShieldCheck,
  Trophy,
  UserCog,
  UsersRound,
} from "lucide-react-native";
import { Team } from "@/services/teamPool";
import { ACCENT, CARD, LINE, MUTED, TEXT } from "@/theme";
export default function TeamProfileCard({
  team,
  tr,
  onAnalyze,
  onSave,
  onOpenReport,
  saved = false,
  saving = false,
  reportBusy = false,
}: {
  team: Team;
  tr: boolean;
  onAnalyze?: () => void;
  onSave?: () => void;
  onOpenReport?: () => void;
  saved?: boolean; saving?: boolean; reportBusy?: boolean;
}) {
  return (
    <>
      {(onAnalyze || onSave || onOpenReport) && <View style={s.actions}>
        {onSave && <Pressable accessibilityRole="button" disabled={saved || saving} accessibilityState={{disabled: saved || saving, busy: saving}} onPress={onSave} style={[s.button, (saved || saving) && {opacity: .65}]}>{saved ? <Check size={18} color={ACCENT} /> : <BookmarkPlus size={18} color={ACCENT} />}<Text style={s.actionText}>{saved ? (tr ? 'Kaydedildi' : 'Saved') : saving ? (tr ? 'Kaydediliyor…' : 'Saving…') : (tr ? 'Kaydet' : 'Save')}</Text></Pressable>}
        {onOpenReport && <Pressable accessibilityRole="button" disabled={reportBusy} onPress={onOpenReport} style={[s.button, reportBusy && {opacity: .5}]}><FileText size={18} color={ACCENT} /><Text style={s.actionText}>{reportBusy ? (tr ? 'Rapor yükleniyor…' : 'Loading report…') : (tr ? 'Raporu Aç' : 'Open Report')}</Text></Pressable>}
        {onAnalyze && <Pressable accessibilityRole="button" onPress={onAnalyze} style={s.button}><BarChart3 size={18} color={ACCENT} /><Text style={s.actionText}>{tr ? 'Takımı Analiz Et' : 'Analyze Team'}</Text></Pressable>}
      </View>}
    <View style={s.card}>
      <View style={s.identity}>
        <View style={s.logo}>
          {team.logoUrl ? (
            <Image
              source={{ uri: team.logoUrl }}
              style={{ width: 60, height: 60 }}
              resizeMode="contain"
            />
          ) : (
            <ShieldCheck size={44} color={ACCENT} />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.eyebrow}>{tr ? "TAKIM PROFİLİ" : "TEAM PROFILE"}</Text>
          <Text style={s.name}>{team.name}</Text>
          <Text style={s.label}>
            {team.country}
            {team.city ? ` · ${team.city}` : ""}
          </Text>
        </View>
      </View>
      <View style={s.tiles}>
        {[
          [Globe2, tr ? "Ülke" : "Country", team.country],
          [Building2, tr ? "Şehir" : "City", team.city],
          [Trophy, tr ? "Lig" : "League", team.league],
          [UsersRound, tr ? "Oyuncu Adedi" : "Player Count", team.playerCount],
          [UserCog, tr ? "Teknik Direktör" : "Head Coach", team.coachName],
          [MapPin, tr ? "Stadyum" : "Stadium", team.stadiumName],
        ].map(([Icon, label, value]: any) => (
          <View key={label} style={s.tile}>
            <View style={s.identity}>
              <Icon size={16} color={ACCENT} />
              <Text style={[s.label, { flex: 1 }]}>{label}</Text>
            </View>
            <Text style={s.value}>{value || "—"}</Text>
          </View>
        ))}
      </View>
    </View>
    </>
  );
}
const s = StyleSheet.create({
  card: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 18,
    padding: 12,
    gap: 16,
  },
  identity: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: {
    width: 76,
    height: 76,
    borderWidth: 1,
    borderColor: ACCENT,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  eyebrow: { color: '#91A99B', fontSize: 9, fontWeight: '800', letterSpacing: 1.5, marginBottom: 6 },
  label: { fontSize: 12, color: MUTED, fontWeight: "700", marginBottom: 6 },
  name: { fontSize: 23, fontWeight: "900", color: TEXT, marginBottom: 6 },
  actions: {flexDirection: 'row', gap: 6, marginBottom: 14},
  actionText: {color: ACCENT, fontWeight: '800', fontSize: 13, flexShrink: 1, textAlign: 'center'},
  button: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    borderWidth: 1,
    borderColor: ACCENT,
    borderRadius: 12,
    backgroundColor: "rgba(22,163,74,0.06)",
    paddingHorizontal: 6,
    paddingVertical: 9,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  tiles: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "space-between",
  },
  tile: {
    width: "48%",
    padding: 10,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,.025)",
  },
  value: { fontSize: 14, color: TEXT, fontWeight: "800", marginTop: 8 },
});
