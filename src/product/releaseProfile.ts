/** RELEASE-01: explicit playtest product availability, independent of laboratory UI. */
export function productProfile(mode:string){
  const candidate=mode==='release-candidate';
  const win=mode==='win-rv-lab',league=mode==='league-lab'||win,lab=mode==='content-lab'||league;
  return {candidate,lab,leagueLab:league,winBonusCandidate:win,
    issuance: candidate||mode==='issuance-pilot'||lab?'d4-v2' as const:'legacy' as const,
    additionalBank:candidate,league:candidate||league};
}
export const product=productProfile(import.meta.env?.MODE??'development');
