import type { Plan } from '@/services/api';

export function matchupUpgrade(count:number,plan:Plan):'three'|'four'|null {
  if(count>=4 && plan!=='Pro Monthly' && plan!=='Pro Yearly')return 'four';
  if(count===3 && plan==='Free')return 'three';
  return null;
}
