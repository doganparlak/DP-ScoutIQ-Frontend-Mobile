import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SimilarReference } from './similarPlayers';
const key=(userId:number)=>`similar-players:last-reference:v1:${userId}`;
let writes:Promise<void>=Promise.resolve();
export async function readSimilarReference(userId:number):Promise<SimilarReference|null>{
  try{
    await writes;
    const raw=await AsyncStorage.getItem(key(userId));const value=raw?JSON.parse(raw):null;
    return value && typeof value.id==='string' && /^[1-9]\d*$/.test(value.id) && typeof value.player?.name==='string' && Array.isArray(value.player.stats)?value:null;
  }catch{return null;}
}
export function writeSimilarReference(userId:number,value:SimilarReference):Promise<void>{
  writes=writes.catch(()=>{}).then(()=>AsyncStorage.setItem(key(userId),JSON.stringify(value))).catch(()=>{});return writes;
}
