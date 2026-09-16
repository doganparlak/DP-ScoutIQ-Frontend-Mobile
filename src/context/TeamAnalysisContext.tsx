import React, {createContext, useContext, useMemo, useState} from 'react';
import type {Team} from '@/services/teamPool';

type TeamAnalysisSession = {
  team: Team | undefined;
  setTeam: React.Dispatch<React.SetStateAction<Team | undefined>>;
};
const TeamAnalysisContext = createContext<TeamAnalysisSession | null>(null);

// Lives with the signed-in navigator, rather than an individual page or its params.
export function TeamAnalysisProvider({children}:{children:React.ReactNode}) {
  const [team,setTeam]=useState<Team>();
  const value=useMemo(()=>({team,setTeam}),[team]);
  return <TeamAnalysisContext.Provider value={value}>{children}</TeamAnalysisContext.Provider>;
}
export function useTeamAnalysisSession() {
  const session=useContext(TeamAnalysisContext);
  if(!session)throw new Error('TeamAnalysisProvider is required');
  return session;
}
