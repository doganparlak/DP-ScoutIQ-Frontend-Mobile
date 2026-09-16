import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import {
  BarChart3,
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
}: {
  team: Team;
  tr: boolean;
  onAnalyze?: () => void;
}) {
  return (
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
          <Text style={s.label}>{tr ? "TAKIM PROFİLİ" : "TEAM PROFILE"}</Text>
          <Text style={s.name}>{team.name}</Text>
          <Text style={s.label}>
            {team.country}
            {team.city ? ` · ${team.city}` : ""}
          </Text>
        </View>
      </View>
      {onAnalyze && (
        <Pressable onPress={onAnalyze} style={s.button}>
          <BarChart3 size={18} color={ACCENT} />
          <Text style={{ color: ACCENT, fontWeight: "800" }}>
            {tr ? "Takımı Analiz Et" : "Analyze Team"}
          </Text>
        </Pressable>
      )}
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
  label: { fontSize: 12, color: MUTED, fontWeight: "700", marginBottom: 6 },
  name: { fontSize: 23, fontWeight: "900", color: TEXT, marginBottom: 6 },
  button: {
    borderWidth: 1,
    borderColor: ACCENT,
    borderRadius: 14,
    padding: 12,
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
