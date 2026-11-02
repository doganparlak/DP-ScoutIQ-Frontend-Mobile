import type {MatchFixture} from '@/services/matchPool';

// Portfolio competitions sort first; this order breaks ties within both tiers.
const LEAGUE_PRIORITY = new Map([
  2, 5, 2286, 600, 603, 8, 564, 384, 301, 82, 72, 462, 944,
  208, 501, 181, 591, 9, 304, 387, 567, 85,
].map((id,index)=>[id,index]));

export type DailyFixtureSection = {
  key:string; title:string; imageUrl?:string|null; priority:number;
  prioritized:boolean; watchlist?:boolean; data:MatchFixture[];
};
export const dailyFixtureKickoff=(fixture:MatchFixture)=>new Date(fixture.startingAt.replace(' ','T')+(/Z$|[+-]\d\d:\d\d$/.test(fixture.startingAt)?'':'Z'));

export function orderDailyCompetitions(fixtures:MatchFixture[],portfolioTeamIds:ReadonlySet<number>,locale:string):DailyFixtureSection[]{
  const portfolioMatch=(fixture:MatchFixture)=>portfolioTeamIds.has(fixture.homeTeam.id)||portfolioTeamIds.has(fixture.awayTeam.id);
  const groups=new Map<string,DailyFixtureSection>();
  for(const fixture of fixtures){
    const key=String(fixture.league.id||`${fixture.country.name}:${fixture.league.name}`);
    if(!groups.has(key))groups.set(key,{key,title:`${fixture.country.name} | ${fixture.league.name}`,imageUrl:fixture.league.imageUrl,priority:LEAGUE_PRIORITY.get(fixture.league.id??0)??999,prioritized:false,data:[]});
    const group=groups.get(key)!;group.data.push(fixture);group.prioritized ||= portfolioMatch(fixture);
  }
  for(const group of groups.values())group.data.sort((a,b)=>Number(portfolioMatch(b))-Number(portfolioMatch(a))||dailyFixtureKickoff(a).getTime()-dailyFixtureKickoff(b).getTime()||a.fixtureId-b.fixtureId);
  return [...groups.values()].sort((a,b)=>Number(b.prioritized)-Number(a.prioritized)||a.priority-b.priority||a.title.localeCompare(b.title,locale));
}
