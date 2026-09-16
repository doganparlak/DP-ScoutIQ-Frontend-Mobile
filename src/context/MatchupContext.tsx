import React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getMe } from "@/services/api";
import type { SearchResultRow } from "@/components/CandidatePlayers";

type Slot = SearchResultRow | null;
type Mode = 2 | 3 | 4;
type State = { mode: Mode; rows: Slot[] };
const empty: State = { mode: 2, rows: [null, null, null, null] };
function useMatchupState() {
  const [state, setState] = React.useState<State>(empty);
  const [storageKey, setStorageKey] = React.useState<string | null>(null);
  const edited = React.useRef(false);
  const writes = React.useRef(Promise.resolve());
  React.useEffect(() => {
    let active = true;
    (async () => {
      const me = await getMe();
      const key = `mobile.matchup.v1:${me.id}`;
      const raw = await AsyncStorage.getItem(key);
      if (!active) return;
      if (raw && !edited.current) {
        try {
          const saved = JSON.parse(raw);
          const paid =
            me.plan === "No Ads Monthly" ||
            me.plan === "Pro Monthly" ||
            me.plan === "Pro Yearly";
          const mode: Mode = !paid
            ? 2
            : saved.mode === 4
              ? 4
              : saved.mode === 3
                ? 3
                : 2;
          const seen = new Set<string>();
          const rows = (Array.isArray(saved.rows) ? saved.rows : [])
            .filter((row: Slot) => {
              if (
                !row ||
                typeof row.id !== "string" ||
                !row.player?.name ||
                !Array.isArray(row.player.stats) ||
                seen.has(row.id)
              )
                return false;
              seen.add(row.id);
              return true;
            })
            .slice(0, mode);
          setState({
            mode,
            rows: [...rows, ...Array(4 - rows.length).fill(null)],
          });
        } catch {
          /* Invalid saved state starts empty. */
        }
      }
      setStorageKey(key);
    })().catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  React.useEffect(() => {
    if (!storageKey) return;
    const json = JSON.stringify(state);
    writes.current = writes.current
      .catch(() => {})
      .then(() => AsyncStorage.setItem(storageKey, json))
      .catch(() => {});
  }, [state, storageKey]);
  const setMode = React.useCallback((mode: Mode) => {
    setState((previous) => {
      if (mode === previous.mode) return previous;
      edited.current = true;
      const retained = previous.rows.filter(Boolean).slice(0, mode);
      return {
        mode,
        rows: [...retained, ...Array(4 - retained.length).fill(null)],
      };
    });
  }, []);
  const setRow = React.useCallback(
    (index: number, value: React.SetStateAction<Slot>) => {
      edited.current = true;
      setState((previous) => {
        const next =
          typeof value === "function" ? value(previous.rows[index]) : value;
        if (next && index >= previous.mode) return previous;
        const rows = [...previous.rows];
        rows[index] = next;
        return { ...previous, rows };
      });
    },
    [],
  );
  const setRow1 = React.useCallback(
    (value: React.SetStateAction<Slot>) => setRow(0, value),
    [setRow],
  );
  const setRow2 = React.useCallback(
    (value: React.SetStateAction<Slot>) => setRow(1, value),
    [setRow],
  );
  const setRow3 = React.useCallback(
    (value: React.SetStateAction<Slot>) => setRow(2, value),
    [setRow],
  );
  const setRow4 = React.useCallback(
    (value: React.SetStateAction<Slot>) => setRow(3, value),
    [setRow],
  );
  const add = React.useCallback((row: SearchResultRow) => {
    edited.current = true;
    setState((previous) => {
      if (previous.rows.some((item) => item?.id === row.id)) return previous;
      const index = previous.rows
        .slice(0, previous.mode)
        .findIndex((item) => !item);
      if (index < 0) return previous;
      const rows = [...previous.rows];
      rows[index] = row;
      return { ...previous, rows };
    });
  }, []);
  const removeAt = React.useCallback((index: number) => {
    edited.current = true;
    setState(previous => {
      const retained = previous.rows.filter((row, slot) => slot !== index && row !== null);
      return { ...previous, rows: [...retained, ...Array(4 - retained.length).fill(null)] };
    });
  }, []);
  const refresh = React.useCallback((rows: SearchResultRow[]) => {
    setState((previous) => {
      const next = previous.rows.map(
        (row) => rows.find((item) => item.id === row?.id) ?? row,
      );
      return next.every((row, index) => row === previous.rows[index])
        ? previous
        : { ...previous, rows: next };
    });
  }, []);
  return {
    ...state,
    setMode,
    setRow1,
    setRow2,
    setRow3,
    setRow4,
    add,
    removeAt,
    refresh,
  };
}
const Context = React.createContext<ReturnType<typeof useMatchupState> | null>(
  null,
);
export function MatchupProvider({ children }: { children: React.ReactNode }) {
  return (
    <Context.Provider value={useMatchupState()}>{children}</Context.Provider>
  );
}
export function useMatchup() {
  const value = React.useContext(Context);
  if (!value) throw new Error("MatchupProvider is missing");
  return value;
}

export function useOptionalMatchup() { return React.useContext(Context); }
