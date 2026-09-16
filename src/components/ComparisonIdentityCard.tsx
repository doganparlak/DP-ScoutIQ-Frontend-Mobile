import { comparisonSourceLabels } from "@/utils/comparisonSourceLabel";
import React from "react";
import { Image, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Shield, Trophy } from "lucide-react-native";
import { ACCENT, MUTED } from "@/theme";
import { finite } from "@/utils/comparisonGroups";
import { sportmonksLeagueImage, sportmonksTeamImage } from "@/utils/sportmonksImages";
import type { PlayerData } from "@/types";
import {
  comparisonStyles as styles,
  roleDistribution,
  compactPlayerName,
  uppercaseLabel,
  scoreColor,
  type ComparisonTheme,
} from "./comparisonAppearance";

function IdentityValue({
  value,
  imageUrl,
  kind,
  color,
}: {
  value: string;
  imageUrl?: string;
  kind: "team" | "league";
  color: string;
}) {
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => setFailed(false), [imageUrl]);
  const Icon = kind === "team" ? Shield : Trophy;
  return (
    <View style={styles.identityPillValueRow}>
      {imageUrl && !failed ? (
        <Image
          source={{ uri: imageUrl }}
          resizeMode="contain"
          onError={() => setFailed(true)}
          style={styles.identityPillLogo}
        />
      ) : (
        <Icon size={16} color={color} />
      )}
      <Text numberOfLines={1} style={[styles.identityPillValue, { flex: 1 }]}>
        {value}
      </Text>
    </View>
  );
}

export default function ComparisonIdentityCard({
  player: data,
  label,
  theme,
  worldCupMode = false,
  testID,
  slotColor,
  scoreVisibility = { potential: true, form: true },
}: {
  player: PlayerData;
  label: string;
  theme?: ComparisonTheme;
  worldCupMode?: boolean;
  testID?: string;
  slotColor?: string;
  scoreVisibility?: { potential: boolean; form: boolean };
}) {
  const { t, i18n } = useTranslation();
  const player = data;
  const accent = slotColor ?? theme?.accent ?? ACCENT;
  const teamLogoUrl = player.meta?.teamLogoUrl || sportmonksTeamImage(player.meta?.teamId);
  const leagueLogoUrl = player.meta?.leagueLogoUrl || sportmonksLeagueImage(player.meta?.leagueId);
  const portraitUrl = player.entityType === "league"
    ? player.meta?.imageUrl?.trim() || leagueLogoUrl
    : player.meta?.imageUrl?.trim();
  const [portraitFailed, setPortraitFailed] = React.useState(false);
  React.useEffect(() => setPortraitFailed(false), [portraitUrl]);
  const initials = player.name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toLocaleUpperCase(i18n.language.startsWith('tr') ? 'tr-TR' : 'en-GB');
  const roles = roleDistribution(player);
  const scores =
    player.entityType === "league"
      ? [
          {
            label: i18n.language.startsWith("tr") ? "Oyuncular" : "Players",
            value: player.meta?.playerCount,
          },
          {
            label: i18n.language.startsWith("tr") ? "Takımlar" : "Teams",
            value: player.meta?.teamCount,
          },
        ]
      : [
          {
            key: "potential" as const,
            label: "POT",
            value: finite(player.meta?.potential),
          },
          {
            key: "form" as const,
            label: "FORM",
            value: finite(player.meta?.form),
          },
        ].filter((score) => player.entityType !== "season" && scoreVisibility[score.key]);
  const height = player?.meta?.height;
  const weight = player?.meta?.weight;
  const hasHeight = typeof height === "number" && Number.isFinite(height);
  const hasWeight = typeof weight === "number" && Number.isFinite(weight);
  const physicalValue = [
    hasHeight ? `${Math.round(height)} cm` : null,
    hasWeight ? `${Math.round(weight)} kg` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const upper = (value: string) => uppercaseLabel(value, i18n.language);
  return (
    <View
      testID={testID}
      style={[
        styles.playerHeader,
        theme && { backgroundColor: theme.card },
        { borderColor: slotColor ?? theme?.accent ?? ACCENT, borderWidth: 1.5 },
      ]}
    >
      <View style={styles.playerIntroRow}>
        <View style={styles.playerIdentityLead}>
          <View style={[styles.playerPortraitFrame, {borderColor:accent}]}>
            {portraitUrl && !portraitFailed
              ? <Image source={{uri:portraitUrl}} resizeMode="contain" onError={()=>setPortraitFailed(true)} style={styles.playerPortrait}/>
              : player.entityType === "league"
                ? <Trophy size={24} color={accent}/>
                : <Text style={[styles.playerPortraitInitials,{color:accent}]}>{initials}</Text>}
          </View>
          <View style={styles.playerIntroText}>
            <Text
              style={[
                styles.playerSlotLabel,
                slotColor ? { color: slotColor } : undefined,
              ]}
            >
              {label}
            </Text>
            <Text numberOfLines={1} style={styles.playerName}>
              {player
                ? player.entityType === "league"
                  ? player.name
                  : compactPlayerName(player.name)
                : "-"}
            </Text>
          </View>
        </View>
        {player.entityType !== "league" && scores.length > 0 && (
          <View
            testID="comparison-header-scores"
            style={{ flexDirection: "row", gap: 6 }}
          >
            {scores.map((score) => (
              <View
                key={score.label}
                style={[
                  styles.headerScorePill,
                  { flex: 0, minWidth: 46, alignItems: "center" },
                ]}
                accessibilityLabel={
                  score.label === "POT"
                    ? t("potential", "Potential")
                    : t("form", "Form")
                }
              >
                <Text style={styles.headerScoreLabel}>{score.label}</Text>
                <Text
                  style={[
                    styles.headerScoreValue,
                    {
                      color:
                        score.value === undefined
                          ? MUTED
                          : scoreColor(score.value),
                    },
                  ]}
                >
                  {score.value === undefined ? "-" : Math.round(score.value)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
      {player.entityType === "league" && scores.length > 0 && (
        <View style={styles.headerScoreRow}>
          {scores.map((score) => (
            <View key={score.label} style={styles.headerScorePill}>
              <Text numberOfLines={1} style={styles.headerScoreLabel}>
                {upper(score.label)}
              </Text>
              <Text
                style={[
                  styles.headerScoreValue,
                  score.value !== undefined
                    ? {
                        color:
                          player.entityType === "league"
                            ? ACCENT
                            : scoreColor(score.value),
                      }
                    : styles.headerScoreValueMissing,
                ]}
              >
                {score.value !== undefined ? Math.round(score.value) : "-"}
              </Text>
            </View>
          ))}
        </View>
      )}
      <View style={styles.identityGrid}>
        {worldCupMode ? (
          <View style={styles.identityPillRow}>
            <View style={styles.identityPill}>
              <Text numberOfLines={1} style={styles.identityPillLabel}>
                {upper(
                  player.entityType === "league"
                    ? t("physical", "Physical")
                    : t("team", "Team"),
                )}
              </Text>
              {player.entityType === "league" ? (
                <Text numberOfLines={1} style={styles.identityPillValue}>{physicalValue || "-"}</Text>
              ) : (
                <IdentityValue value={player.meta?.team ?? "-"} imageUrl={teamLogoUrl} kind="team" color={accent}/>
              )}
            </View>
            <View style={styles.identityPill}>
              <Text numberOfLines={1} style={styles.identityPillLabel}>
                {upper(t("age", "Age"))}
              </Text>
              <Text numberOfLines={1} style={styles.identityPillValue}>
                {player?.meta?.age ? `${player.meta.age}` : "-"}
              </Text>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.identityPillRow}>
              <View style={styles.identityPill}>
                <Text numberOfLines={1} style={styles.identityPillLabel}>
                  {upper(
                    player.entityType === "league"
                      ? t("physical", "Physical")
                      : t("team", "Team"),
                  )}
                </Text>
                {player.entityType === "league" ? (
                  <Text numberOfLines={1} style={styles.identityPillValue}>{physicalValue || "-"}</Text>
                ) : (
                  <IdentityValue value={player.meta?.team ?? "-"} imageUrl={teamLogoUrl} kind="team" color={accent}/>
                )}
              </View>
              <View style={styles.identityPill}>
                <Text numberOfLines={1} style={styles.identityPillLabel}>
                  {upper(t("league", "League"))}
                </Text>
                <IdentityValue value={player?.meta?.league ?? "-"} imageUrl={leagueLogoUrl} kind="league" color={accent}/>
              </View>
            </View>
            <View style={styles.identityPillRow}>
              <View style={styles.identityPill}>
                <Text numberOfLines={1} style={styles.identityPillLabel}>
                  {upper(t("age", "Age"))}
                </Text>
                <Text numberOfLines={1} style={styles.identityPillValue}>
                  {player?.meta?.age ? `${player.meta.age}` : "-"}
                </Text>
              </View>
              <View style={styles.identityPill}>
                <Text numberOfLines={1} style={styles.identityPillLabel}>
                  {upper(t("country", "Country"))}
                </Text>
                <Text numberOfLines={1} style={styles.identityPillValue}>
                  {player?.meta?.nationality ?? "-"}
                </Text>
              </View>
            </View>
          </>
        )}
        {player.entityType !== "league" && (
          <View
            testID="comparison-data-physical-row"
            style={styles.identityPillRow}
          >
            <View style={styles.identityPill}>
              <Text style={styles.identityPillLabel}>
                {upper(i18n.language.startsWith("tr") ? "Veriler" : "Data")}
              </Text>
              {comparisonSourceLabels(
                player,
                i18n.language.startsWith("tr"),
                worldCupMode,
              ).map((source) => (
                <Text key={source} style={styles.identityPillValue}>
                  {source}
                </Text>
              ))}
            </View>
            <View style={styles.identityPill}>
              <Text style={styles.identityPillLabel}>
                {upper(t("physical", "Physical"))}
              </Text>
              <Text style={styles.identityPillValue}>
                {physicalValue || "-"}
              </Text>
            </View>
          </View>
        )}
      </View>
      <View style={styles.headerRolesArea}>
        <Text style={styles.headerRolesLabel}>
          {upper(t("roleDistribution", "Role Distribution"))}
        </Text>
        {roles.length ? (
          <View style={styles.headerRolesRow}>
            {roles.map((item) => (
              <View
                key={`${item.role}-${item.pct ?? "role"}`}
                style={styles.headerRolePill}
              >
                <Text numberOfLines={1} style={styles.headerRoleText}>
                  {item.role}
                  {item.pct !== null ? (
                    <Text style={styles.headerRolePctText}> {item.pct}%</Text>
                  ) : null}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.headerRoleMissing}>-</Text>
        )}
      </View>
    </View>
  );
}
