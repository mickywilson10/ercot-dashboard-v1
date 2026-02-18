export const ZONES   = ["WEST","PANHANDLE","NORTH","SOUTH","HOUSTON","EAST","COAST"];
export const TECHS   = ["Solar","Wind","Battery","Hybrid","Gas","Other"];
export const PHASES  = [
  { label:"Screening Started",  short:"SCR",  value:0 },
  { label:"Screening Complete", short:"SS",   value:1 },
  { label:"FIS In Progress",    short:"FIS",  value:2 },
  { label:"FIS Complete",       short:"FISC", value:3 },
  { label:"IA Signed",          short:"IA",   value:4 },
];
export const COUNTIES = [
  "Glasscock","Pecos","Reagan","Upton","Midland","Ector","Andrews","Winkler",
  "Ward","Reeves","Lubbock","Taylor","Nolan","Mitchell","Webb","Maverick",
  "Travis","Bexar","Harris","McLennan","Other"
];

export function simulatePrediction(f) {
  const phaseRisk = {0:0.55,1:0.40,2:0.25,3:0.15,4:0.05};
  const techAdj   = {Solar:0.02,Wind:-0.03,Battery:0.05,Hybrid:0.03,Gas:0.08,Other:0.04};
  const zoneAdj   = {WEST:0.06,PANHANDLE:0.04,NORTH:0.01,SOUTH:-0.02,HOUSTON:-0.03,EAST:-0.01,COAST:-0.02};

  let wd = (phaseRisk[f.phase] || 0.30)
    + (f.poiCount - 5) * 0.008
    + (techAdj[f.techType] || 0)
    + (zoneAdj[f.zone] || 0)
    + (f.capacity > 200 ? 0.04 : f.capacity < 50 ? -0.02 : 0)
    + (f.firmCapacity > 0.5 ? -0.03 : 0.02)
    + (f.energyCommunity ? -0.04 : 0)
    + (f.behindMeter ? -0.02 : 0);
  wd = Math.min(0.97, Math.max(0.03, wd));

  const phaseWd = [
    Math.min(0.97, wd * 0.6),
    Math.min(0.97, wd * 0.8),
    Math.min(0.97, wd * 0.95),
    wd,
  ];

  const timeline = Math.max(3, Math.min(48,
    30 - f.phase * 6 + f.poiCount * 0.3 + (f.daysInQueue > 365 ? -3 : 2)));
  const cost = Math.max(0.5, Math.min(30,
    2 + f.capacity * 0.045 + f.poiCount * 0.28 + (f.zone === "WEST" ? 1.2 : 0)));

  const irrHit        = -(cost * 0.22 + timeline * 0.06).toFixed(2);
  const revenueAtRisk = (f.capacity * timeline * 0.008).toFixed(1);
  const score         = Math.round(100 - wd*55 - (timeline/48)*22 - (cost/30)*18 - (f.poiCount>10?5:0));

  const mcSamples = Array.from({length:12}, (_,i) => ({
    month: `M${(i+1)*3}`,
    low:   +Math.max(0,   wd - 0.08 - i*0.003).toFixed(3),
    mid:   +(wd + Math.sin(i)*0.02).toFixed(3),
    high:  +Math.min(1, wd + 0.09 + i*0.003).toFixed(3),
  }));

  const phaseData = PHASES.map((p,i) => ({
    name: p.short,
    risk: +(phaseWd[Math.min(i,3)] * 100).toFixed(1),
    active: i <= f.phase,
  }));

  const radarData = [
    { subject:"Location",  A: Math.round((1 - Math.abs(31.5 - 31) / 5) * 100) },
    { subject:"Capacity",  A: Math.round(Math.max(0, 100 - f.capacity * 0.3)) },
    { subject:"Phase",     A: Math.round(f.phase / 4 * 100) },
    { subject:"POI Avail", A: Math.round(Math.max(0, 100 - f.poiCount * 6)) },
    { subject:"Zone",      A: f.zone==="WEST"?45:f.zone==="PANHANDLE"?55:f.zone==="SOUTH"?75:70 },
    { subject:"IRA Bonus", A: f.energyCommunity ? 90 : 40 },
  ];

  const comps = [
    { name:"Harper Solar I",  mw:Math.round(f.capacity*0.92), zone:f.zone, wd:+(wd*0.88).toFixed(2), tl:+(timeline-1.2).toFixed(1), cost:+(cost*0.91).toFixed(1), status:"Active" },
    { name:"Lone Star BESS",  mw:Math.round(f.capacity*1.14), zone:f.zone, wd:+(wd*1.07).toFixed(2), tl:+(timeline+2.1).toFixed(1), cost:+(cost*1.12).toFixed(1), status:"Active" },
    { name:"Prairie Wind II", mw:Math.round(f.capacity*0.78), zone:"NORTH", wd:+(wd*0.72).toFixed(2), tl:+(timeline-3.0).toFixed(1), cost:+(cost*0.80).toFixed(1), status:"IA Signed" },
  ];

  const scenarios = [
    { label:`Reduce capacity to ${Math.round(f.capacity*0.85)} MW`, wdDelta:-0.08, costDelta:-(cost*0.12), tlDelta:-0.5 },
    { label:"Move to alternate POI (<5 projects)",                   wdDelta:-0.12, costDelta:-(cost*0.08), tlDelta:1.0 },
    { label:"Add energy community eligibility",                      wdDelta:-0.04, costDelta:0,            tlDelta:0 },
    { label:`Add ${Math.round(f.capacity*0.5)} MWh battery storage`, wdDelta:-0.06, costDelta:cost*0.18,   tlDelta:2.0 },
  ];

  return {
    wd,
    timeline: +timeline.toFixed(1),
    cost:     +cost.toFixed(1),
    costLow:  (cost * 0.82).toFixed(1),
    costHigh: (cost * 1.21).toFixed(1),
    tlLow:    Math.max(2, timeline - 3.5).toFixed(1),
    tlHigh:   (timeline + 4.2).toFixed(1),
    irrHit,
    revenueAtRisk,
    score,
    mcSamples,
    phaseData,
    radarData,
    comps,
    scenarios,
  };
}
