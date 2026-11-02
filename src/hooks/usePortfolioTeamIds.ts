import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import {getFavoriteTeams,subscribeTeamPortfolioChanges} from '@/services/teamPortfolio';

// Keep IDs in this mounted screen only. The auth session guards every response
// so a late request cannot apply another account's portfolio preferences.
export function usePortfolioTeamIds(active:boolean,refresh:number){
 const [ids,setIds]=React.useState<Set<number>>(()=>new Set());
 const owner=React.useRef<string|null>(null);
 React.useEffect(()=>{
  if(!active)return;
  let live=true,revision=0;
  async function load(){
   const version=++revision;
   try{
    const token=await AsyncStorage.getItem('auth_token');
    if(!live||version!==revision)return;
    if(owner.current!==token){owner.current=token;setIds(new Set());}
    if(!token)return;
    const rows=await getFavoriteTeams();
    const currentToken=await AsyncStorage.getItem('auth_token');
    if(!live||version!==revision)return;
    if(currentToken!==token){owner.current=currentToken;setIds(new Set());if(currentToken)void load();return;}
    const next=new Set(rows.map(row=>Number(row.team.id)).filter(id=>Number.isSafeInteger(id)&&id>0));
    setIds(current=>current.size===next.size&&[...next].every(id=>current.has(id))?current:next);
   }catch{
    // Also discard a previous account's IDs when a failed request spans logout.
    try{const token=await AsyncStorage.getItem('auth_token');if(live&&version===revision&&owner.current!==token){owner.current=token;setIds(new Set());}}catch{}
   }
  }
  const unsubscribe=subscribeTeamPortfolioChanges(()=>{void load();});
  void load();
  return()=>{live=false;revision++;unsubscribe();};
 },[active,refresh]);
 return ids;
}
