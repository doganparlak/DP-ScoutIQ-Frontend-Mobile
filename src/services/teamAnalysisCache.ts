import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Team } from './teamPool';
const key=(userId:number)=>`team-analysis:last-team:v1:${userId}`;
let writes:Promise<void>=Promise.resolve();
export async function readAnalysisTeam(userId:number):Promise<Team|null>{
  try{
    await writes;
    const raw=await AsyncStorage.getItem(key(userId));const team=raw?JSON.parse(raw):null;
    return team && typeof team.id==='string' && /^\d+$/.test(team.id) && Number(team.id)>0 &&
      ['name','country','league','city','coachName','stadiumName'].every(field=>typeof team[field]==='string') && typeof team.playerCount==='number'?team:null;
  }catch{return null;}
}
export function writeAnalysisTeam(userId:number,team:Team):Promise<void>{
  writes=writes.catch(()=>{}).then(()=>AsyncStorage.setItem(key(userId),JSON.stringify(team))).catch(()=>{});return writes;
}
