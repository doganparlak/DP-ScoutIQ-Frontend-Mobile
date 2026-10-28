import type { SearchResultRow } from '@/components/CandidatePlayers';
import type { PlayerData } from '@/types';
export function hasPlayerMatchupEntry(player:PlayerData,rows:readonly(SearchResultRow|null)[],playerId?:string):boolean{
  return rows.some(row=>{
    if(!row || (row.player.entityType && row.player.entityType!=='player'))return false;
    return (!!playerId && row.id===playerId) || row.player===player ||
      (typeof player.meta?.sportmonksId==='number' && player.meta.sportmonksId>0 && row.player.meta?.sportmonksId===player.meta.sportmonksId);
  });
}
