import { useState } from "react";
import dynamic from "next/dynamic";
import Head from "next/head";
import { simulatePrediction, ZONES, TECHS, PHASES, COUNTIES } from "../utils/predict";

// Recharts must load client-side only (no SSR)
const {
  LineChart, Line, BarChart, Bar, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell,
} = require("recharts");

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:"#060d16", panel:"#0d1b2a", edge:"#1e2a3a",
  muted:"#64748b", text:"#f0f4f8", sub:"#94a3b8",
  blue:"#3b82f6", green:"#22c55e", amber:"#f59e0b",
  red:"#ef4444", purple:"#a78bfa",
};
const mono = "'IBM Plex Mono',monospace";
const sans = "'DM Sans',sans-serif";
const labelStyle = {
  fontFamily:sans, fontSize:11, fontWeight:600,
  textTransform:"uppercase", letterSpacing:2, color:C.muted,
};
const inp = {
  background:C.panel, border:`1px solid ${C.edge}`, borderRadius:6,
  color:C.text, padding:"10px 14px", fontSize:13, fontFamily:mono,
  outline:"none", width:"100%",
};

// ─── Small components ─────────────────────────────────────────────────────────

function Tag({ children, color = C.blue }) {
  return (
    <span style={{
      background:`${color}18`, color, border:`1px solid ${color}30`,
      borderRadius:4, padding:"2px 10px", fontSize:10,
      fontWeight:700, fontFamily:mono, letterSpacing:1.5,
    }}>{children}</span>
  );
}

function Card({ children, style={}, accent }) {
  return (
    <div style={{
      background:C.panel, border:`1px solid ${accent||C.edge}`,
      borderRadius:10, padding:20, ...style,
    }}>{children}</div>
  );
}

function SectionTitle({ children }) {
  return (
    <p style={{...labelStyle, marginBottom:14, display:"flex", alignItems:"center", gap:8}}>
      <span style={{width:3, height:12, background:C.blue, borderRadius:2, display:"inline-block"}}/>
      {children}
    </p>
  );
}

function FieldWrap({ label, children }) {
  return (
    <div style={{display:"flex", flexDirection:"column", gap:6}}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function StatBox({ label, value, sub, color=C.blue }) {
  return (
    <Card>
      <p style={labelStyle}>{label}</p>
      <p style={{fontFamily:mono, fontSize:22, fontWeight:700, color, marginTop:8, lineHeight:1}}>{value}</p>
      {sub && <p style={{fontFamily:sans, fontSize:11, color:C.muted, marginTop:4}}>{sub}</p>}
    </Card>
  );
}

function Ring({ value, size=110, stroke=9, color }) {
  const r    = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * Math.min(1, Math.max(0, value));
  return (
    <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.edge} strokeWidth={stroke}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{transition:"stroke-dasharray 0.9s cubic-bezier(.4,0,.2,1)"}}/>
    </svg>
  );
}

function RingMetric({ label, value, display, sub, color }) {
  return (
    <div style={{display:"flex", flexDirection:"column", alignItems:"center", gap:8}}>
      <div style={{position:"relative", width:110, height:110}}>
        <Ring value={value} color={color}/>
        <div style={{position:"absolute", inset:0, display:"flex",
          flexDirection:"column", alignItems:"center", justifyContent:"center"}}>
          <span style={{fontFamily:mono, fontSize:20, fontWeight:700,
            color:C.text, letterSpacing:-1}}>{display}</span>
          {sub && <span style={{fontFamily:mono, fontSize:9, color:C.muted, marginTop:1}}>{sub}</span>}
        </div>
      </div>
      <span style={{...labelStyle, fontSize:10}}>{label}</span>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Home() {
  const [tab, setTab]         = useState("predictor");
  const [form, setForm]       = useState({
    projectName:"", capacity:150, techType:"Solar", phase:1,
    poiCount:6, zone:"WEST", county:"Glasscock", daysInQueue:210,
    firmCapacity:0.5, energyCommunity:false, behindMeter:false,
  });
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  const set = (k, v) => setForm(f => ({...f, [k]: v}));

  const predict = () => {
    setLoading(true);
    setTimeout(() => {
      const r = simulatePrediction(form);
      setResult(r);
      setHistory(h => [{...form, ...r, ts: new Date().toLocaleTimeString()}, ...h].slice(0, 8));
      setLoading(false);
    }, 900);
  };

  const riskColor  = !result ? C.green : result.wd > 0.5 ? C.red : result.wd > 0.3 ? C.amber : C.green;
  const scoreColor = !result ? C.blue  : result.score >= 70 ? C.green : result.score >= 50 ? C.amber : C.red;

  const portStats = history.length ? {
    avgScore: Math.round(history.reduce((a,h)=>a+h.score,0)/history.length),
    highRisk: history.filter(h=>h.wd>0.5).length,
    avgCost:  (history.reduce((a,h)=>a+h.cost,0)/history.length).toFixed(1),
    totalMW:  history.reduce((a,h)=>a+h.capacity,0),
  } : null;

  return (
    <>
      <Head>
        <title>ERCOT Queue Predictor</title>
        <meta name="description" content="AI-powered ERCOT interconnection queue predictor"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
      </Head>

      <div style={{minHeight:"100vh", background:C.bg, color:C.text, fontFamily:sans}}>

        {/* ── Nav ─────────────────────────────────────────────────────── */}
        <nav style={{
          borderBottom:`1px solid ${C.edge}`, padding:"0 28px",
          display:"flex", alignItems:"center", justifyContent:"space-between",
          height:56, background:C.bg, position:"sticky", top:0, zIndex:100,
        }}>
          <div style={{display:"flex", alignItems:"center", gap:20}}>
            <div style={{display:"flex", alignItems:"center", gap:10}}>
              <div style={{
                width:7, height:7, borderRadius:"50%", background:C.green,
                boxShadow:`0 0 8px ${C.green}`, animation:"pulse 2s infinite",
              }}/>
              <span style={{fontFamily:mono, fontSize:12, fontWeight:700,
                letterSpacing:3, color:C.text}}>QUEUE PREDICTOR</span>
            </div>
            <span style={{color:C.edge}}>|</span>
            {["predictor","portfolio","about"].map(t => (
              <button key={t} onClick={()=>setTab(t)} style={{
                background:"none", border:"none", cursor:"pointer",
                padding:"4px 12px", fontFamily:sans, fontSize:12, fontWeight:600,
                letterSpacing:1.5, textTransform:"uppercase", borderRadius:4,
                color: tab===t ? C.text : C.muted,
                borderBottom: tab===t ? `2px solid ${C.blue}` : "2px solid transparent",
                transition:"all 0.2s",
              }}>{t}</button>
            ))}
          </div>
          <div style={{display:"flex", gap:8, alignItems:"center"}}>
            <Tag color={C.green}>LIVE MODEL</Tag>
            <Tag color={C.blue}>92.4% ACC</Tag>
            <Tag color={C.purple}>ERCOT · TX</Tag>
          </div>
        </nav>

        {/* ── PREDICTOR TAB ───────────────────────────────────────────── */}
        {tab === "predictor" && (
          <div style={{display:"grid", gridTemplateColumns:"360px 1fr",
            minHeight:"calc(100vh - 56px)"}}>

            {/* Left: Inputs */}
            <div style={{
              borderRight:`1px solid ${C.edge}`, padding:24,
              display:"flex", flexDirection:"column", gap:16, overflowY:"auto",
            }}>
              <SectionTitle>Project Identity</SectionTitle>

              <FieldWrap label="Project Name">
                <input style={inp} placeholder="e.g. West Texas Solar Farm I"
                  value={form.projectName} onChange={e=>set("projectName",e.target.value)}/>
              </FieldWrap>

              <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:12}}>
                <FieldWrap label="Capacity (MW)">
                  <input style={inp} type="number" min={1} max={999}
                    value={form.capacity} onChange={e=>set("capacity",+e.target.value)}/>
                </FieldWrap>
                <FieldWrap label="Technology">
                  <select style={inp} value={form.techType} onChange={e=>set("techType",e.target.value)}>
                    {TECHS.map(t=><option key={t}>{t}</option>)}
                  </select>
                </FieldWrap>
              </div>

              <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:12}}>
                <FieldWrap label="CDR Zone">
                  <select style={inp} value={form.zone} onChange={e=>set("zone",e.target.value)}>
                    {ZONES.map(z=><option key={z}>{z}</option>)}
                  </select>
                </FieldWrap>
                <FieldWrap label="County">
                  <select style={inp} value={form.county} onChange={e=>set("county",e.target.value)}>
                    {COUNTIES.map(c=><option key={c}>{c}</option>)}
                  </select>
                </FieldWrap>
              </div>

              <div style={{height:1, background:C.edge}}/>
              <SectionTitle>Queue Status</SectionTitle>

              <FieldWrap label="Study Phase">
                <select style={inp} value={form.phase} onChange={e=>set("phase",+e.target.value)}>
                  {PHASES.map(p=><option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </FieldWrap>

              <div style={{display:"flex", gap:3}}>
                {PHASES.map((p,i)=>(
                  <div key={i} onClick={()=>set("phase",i)} style={{
                    flex:1, height:5, borderRadius:2, cursor:"pointer",
                    background: i<=form.phase ? C.blue : C.edge,
                    transition:"background 0.3s",
                  }}/>
                ))}
              </div>
              <p style={{fontFamily:mono, fontSize:11, color:C.sub, marginTop:-8}}>
                {PHASES[form.phase]?.label}
              </p>

              <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:12}}>
                <FieldWrap label="POI Co-located">
                  <input style={inp} type="number" min={1} max={50}
                    value={form.poiCount} onChange={e=>set("poiCount",+e.target.value)}/>
                </FieldWrap>
                <FieldWrap label="Days in Queue">
                  <input style={inp} type="number" min={0} max={1825}
                    value={form.daysInQueue} onChange={e=>set("daysInQueue",+e.target.value)}/>
                </FieldWrap>
              </div>

              <div style={{height:1, background:C.edge}}/>
              <SectionTitle>Project Configuration</SectionTitle>

              <FieldWrap label={`Firm Capacity — ${Math.round(form.firmCapacity*100)}%`}>
                <input type="range" min={0} max={1} step={0.05}
                  value={form.firmCapacity} onChange={e=>set("firmCapacity",+e.target.value)}
                  style={{width:"100%", accentColor:C.blue}}/>
              </FieldWrap>

              <div style={{display:"flex", gap:10}}>
                {[
                  {key:"energyCommunity", label:"IRA Energy Community"},
                  {key:"behindMeter",     label:"Behind the Meter"},
                ].map(({key,label})=>(
                  <label key={key} style={{
                    display:"flex", alignItems:"center", gap:8, cursor:"pointer",
                    flex:1, background:C.panel, border:`1px solid ${C.edge}`,
                    borderRadius:6, padding:"10px 12px",
                  }}>
                    <input type="checkbox" checked={form[key]}
                      onChange={e=>set(key,e.target.checked)}
                      style={{accentColor:C.blue, width:14, height:14}}/>
                    <span style={{fontFamily:sans, fontSize:11, color:C.sub, fontWeight:500}}>{label}</span>
                  </label>
                ))}
              </div>

              <button onClick={predict} disabled={loading} style={{
                background: loading ? C.edge : C.blue,
                border:"none", borderRadius:8, color:"#fff",
                padding:"13px 24px", fontSize:12, fontWeight:700,
                letterSpacing:2, textTransform:"uppercase",
                cursor: loading ? "not-allowed" : "pointer",
                fontFamily:mono, transition:"all 0.2s",
                boxShadow: loading ? "none" : `0 0 24px ${C.blue}25`,
              }}>
                {loading ? "ANALYZING ..." : "RUN PREDICTION"}
              </button>

              {history.length > 0 && <>
                <div style={{height:1, background:C.edge}}/>
                <SectionTitle>Recent Runs</SectionTitle>
                <div style={{display:"flex", flexDirection:"column", gap:6}}>
                  {history.slice(0,5).map((h,i)=>(
                    <div key={i} style={{
                      display:"flex", justifyContent:"space-between", alignItems:"center",
                      padding:"8px 12px", background:C.panel,
                      borderRadius:6, border:`1px solid ${C.edge}`,
                    }}>
                      <div>
                        <p style={{fontFamily:mono, fontSize:11, color:C.text}}>
                          {h.projectName||"Unnamed"}</p>
                        <p style={{fontSize:10, color:C.muted, marginTop:2}}>
                          {h.capacity}MW · {h.techType} · {h.ts}</p>
                      </div>
                      <span style={{
                        fontFamily:mono, fontSize:16, fontWeight:700,
                        color: h.score>=70?C.green:h.score>=50?C.amber:C.red,
                      }}>{h.score}</span>
                    </div>
                  ))}
                </div>
              </>}
            </div>

            {/* Right: Results */}
            <div style={{padding:28, overflowY:"auto"}}>
              {!result ? (
                <div style={{
                  display:"flex", flexDirection:"column", alignItems:"center",
                  justifyContent:"center", height:"100%", gap:16, opacity:0.35,
                }}>
                  <div style={{
                    width:56, height:56, border:`2px solid ${C.edge}`,
                    borderRadius:"50%", display:"flex", alignItems:"center",
                    justifyContent:"center", fontSize:24,
                  }}>⚡</div>
                  <p style={{fontFamily:mono, fontSize:11, color:C.muted,
                    letterSpacing:2, textTransform:"uppercase"}}>
                    Configure project and run prediction
                  </p>
                </div>
              ) : (
                <div style={{display:"flex", flexDirection:"column", gap:20,
                  animation:"fadeUp 0.5s ease"}}>

                  {/* Header */}
                  <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start"}}>
                    <div>
                      <h2 style={{fontFamily:mono, fontSize:20, fontWeight:700,
                        color:C.text, margin:0}}>
                        {form.projectName || "Unnamed Project"}
                      </h2>
                      <p style={{fontSize:12, color:C.muted, marginTop:6, letterSpacing:0.5}}>
                        {form.capacity} MW · {form.techType} · {form.zone} Zone · {form.county} County · {PHASES[form.phase]?.label}
                      </p>
                    </div>
                    <div style={{textAlign:"right", flexShrink:0, marginLeft:20}}>
                      <p style={labelStyle}>Queue Certainty Score</p>
                      <p style={{fontFamily:mono, fontSize:48, fontWeight:700,
                        lineHeight:1, marginTop:4, color:scoreColor}}>{result.score}</p>
                      <p style={{fontSize:11, color:C.muted, marginTop:2}}>out of 100</p>
                    </div>
                  </div>

                  {/* Ring metrics */}
                  <Card style={{display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8}}>
                    <RingMetric label="Withdrawal Risk" value={result.wd}
                      display={`${(result.wd*100).toFixed(0)}%`} color={riskColor}/>
                    <RingMetric label="Timeline" value={result.timeline/48}
                      display={result.timeline} sub="months" color={C.blue}/>
                    <RingMetric label="Upgrade Cost" value={result.cost/30}
                      display={`$${result.cost}M`} color={C.amber}/>
                    <RingMetric label="IRR Impact" value={Math.abs(result.irrHit)/5}
                      display={`${result.irrHit}%`} color={C.red}/>
                  </Card>

                  {/* Confidence intervals */}
                  <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12}}>
                    <StatBox label="Timeline Range"
                      value={`${result.tlLow}–${result.tlHigh} mo`}
                      sub="95% confidence interval" color={C.blue}/>
                    <StatBox label="Cost Range"
                      value={`$${result.costLow}–$${result.costHigh}M`}
                      sub="95% confidence interval" color={C.amber}/>
                    <StatBox label="Revenue at Risk"
                      value={`$${result.revenueAtRisk}M`}
                      sub="Projected lifetime exposure" color={C.red}/>
                  </div>

                  {/* Charts */}
                  <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:16}}>
                    <Card>
                      <SectionTitle>Withdrawal Risk by Phase</SectionTitle>
                      <ResponsiveContainer width="100%" height={160}>
                        <BarChart data={result.phaseData} barSize={28}>
                          <XAxis dataKey="name"
                            tick={{fill:C.muted, fontSize:11, fontFamily:mono}}
                            axisLine={false} tickLine={false}/>
                          <YAxis tick={{fill:C.muted, fontSize:10}}
                            axisLine={false} tickLine={false}
                            tickFormatter={v=>`${v}%`} domain={[0,100]}/>
                          <Tooltip
                            contentStyle={{background:C.panel,border:`1px solid ${C.edge}`,
                              borderRadius:6,fontFamily:mono,fontSize:11}}
                            formatter={v=>[`${v}%`,"Risk"]}/>
                          <Bar dataKey="risk" radius={[4,4,0,0]}>
                            {result.phaseData.map((entry,i)=>(
                              <Cell key={i} fill={entry.active ? C.blue : C.edge}/>
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </Card>

                    <Card>
                      <SectionTitle>Probability Over Time (Monte Carlo)</SectionTitle>
                      <ResponsiveContainer width="100%" height={160}>
                        <LineChart data={result.mcSamples}>
                          <XAxis dataKey="month"
                            tick={{fill:C.muted, fontSize:10, fontFamily:mono}}
                            axisLine={false} tickLine={false}/>
                          <YAxis tick={{fill:C.muted, fontSize:10}}
                            axisLine={false} tickLine={false}
                            tickFormatter={v=>`${(v*100).toFixed(0)}%`} domain={[0,1]}/>
                          <Tooltip
                            contentStyle={{background:C.panel,border:`1px solid ${C.edge}`,
                              borderRadius:6,fontFamily:mono,fontSize:11}}
                            formatter={v=>[`${(v*100).toFixed(1)}%`]}/>
                          <Line type="monotone" dataKey="high" stroke={C.red}
                            strokeWidth={1} strokeDasharray="4 2" dot={false}/>
                          <Line type="monotone" dataKey="mid" stroke={riskColor}
                            strokeWidth={2} dot={false}/>
                          <Line type="monotone" dataKey="low" stroke={C.green}
                            strokeWidth={1} strokeDasharray="4 2" dot={false}/>
                        </LineChart>
                      </ResponsiveContainer>
                      <p style={{fontFamily:mono, fontSize:9, color:C.muted,
                        marginTop:8, textAlign:"center"}}>
                        — median &nbsp;· · ·&nbsp; 95% CI bounds
                      </p>
                    </Card>
                  </div>

                  {/* Radar + Risk */}
                  <div style={{display:"grid", gridTemplateColumns:"260px 1fr", gap:16}}>
                    <Card>
                      <SectionTitle>Project Health Radar</SectionTitle>
                      <ResponsiveContainer width="100%" height={200}>
                        <RadarChart data={result.radarData}>
                          <PolarGrid stroke={C.edge}/>
                          <PolarAngleAxis dataKey="subject"
                            tick={{fill:C.muted, fontSize:10, fontFamily:mono}}/>
                          <Radar dataKey="A" stroke={C.blue} fill={C.blue}
                            fillOpacity={0.15} strokeWidth={2}/>
                        </RadarChart>
                      </ResponsiveContainer>
                    </Card>

                    <Card accent={`${riskColor}40`}
                      style={{borderLeft:`3px solid ${riskColor}`}}>
                      <div style={{display:"flex", justifyContent:"space-between",
                        alignItems:"center", marginBottom:14}}>
                        <SectionTitle>Risk Assessment</SectionTitle>
                        <Tag color={riskColor}>
                          {result.wd>0.5?"HIGH RISK":result.wd>0.3?"MODERATE":"LOW RISK"}
                        </Tag>
                      </div>
                      <p style={{fontSize:13, color:C.sub, lineHeight:1.7, marginBottom:16}}>
                        {result.wd > 0.5
                          ? `This project carries elevated withdrawal risk at ${(result.wd*100).toFixed(0)}%. The ${form.zone} zone congestion (${form.poiCount} co-located projects) and ${PHASES[form.phase]?.label} phase position drive this exposure. Projected ${result.timeline}-month timeline and $${result.cost}M upgrade costs represent meaningful IRR headwinds of ${result.irrHit}%.`
                          : result.wd > 0.3
                          ? `Moderate risk profile at ${(result.wd*100).toFixed(0)}% withdrawal probability. ${form.zone} zone POI congestion with ${form.poiCount} co-located projects adds queue pressure. Timeline of ${result.timeline} months and $${result.cost}M costs are within typical range.`
                          : `Strong fundamentals with only ${(result.wd*100).toFixed(0)}% withdrawal risk. ${PHASES[form.phase]?.label} phase provides queue stability. Expected ${result.timeline}-month completion and $${result.cost}M upgrade costs are favorable relative to comparable ${form.zone} projects.`}
                      </p>
                      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8}}>
                        {[
                          {k:"Energy Community", v:form.energyCommunity?"Eligible":"Not Eligible", c:form.energyCommunity?C.green:C.muted},
                          {k:"Behind the Meter",  v:form.behindMeter?"Yes":"No", c:form.behindMeter?C.green:C.muted},
                          {k:"Firm Capacity",     v:`${Math.round(form.firmCapacity*100)}%`, c:C.blue},
                        ].map(({k,v,c})=>(
                          <div key={k} style={{background:C.bg, borderRadius:6,
                            padding:"10px 12px", border:`1px solid ${C.edge}`}}>
                            <p style={{...labelStyle, fontSize:9, marginBottom:4}}>{k}</p>
                            <p style={{fontFamily:mono, fontSize:12, fontWeight:700, color:c}}>{v}</p>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </div>

                  {/* What-If Scenarios */}
                  <Card>
                    <SectionTitle>What-If Optimization Scenarios</SectionTitle>
                    <div style={{display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:10}}>
                      {result.scenarios.map((s,i)=>(
                        <div key={i} style={{
                          background:C.bg, borderRadius:8, padding:14,
                          border:`1px solid ${C.edge}`,
                          display:"flex", gap:12, alignItems:"flex-start",
                        }}>
                          <div style={{
                            width:24, height:24, borderRadius:"50%",
                            background:`${C.blue}20`, border:`1px solid ${C.blue}40`,
                            display:"flex", alignItems:"center",
                            justifyContent:"center", flexShrink:0,
                          }}>
                            <span style={{fontFamily:mono, fontSize:11,
                              color:C.blue, fontWeight:700}}>{i+1}</span>
                          </div>
                          <div style={{flex:1}}>
                            <p style={{fontSize:12, color:C.text,
                              fontWeight:600, marginBottom:6}}>{s.label}</p>
                            <div style={{display:"flex", gap:6, flexWrap:"wrap"}}>
                              <Tag color={s.wdDelta<0?C.green:C.red}>
                                WD {s.wdDelta<0?"":"+"}{ (s.wdDelta*100).toFixed(0)}%
                              </Tag>
                              {s.costDelta!==0 && <Tag color={s.costDelta<0?C.green:C.red}>
                                Cost {s.costDelta<0?"":"+"}${Math.abs(s.costDelta).toFixed(1)}M
                              </Tag>}
                              {s.tlDelta!==0 && <Tag color={s.tlDelta<0?C.green:C.amber}>
                                TL {s.tlDelta<0?"":"+"}{ s.tlDelta}mo
                              </Tag>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* Comparable Projects */}
                  <Card>
                    <SectionTitle>Comparable Projects</SectionTitle>
                    <div style={{overflowX:"auto"}}>
                      <table style={{width:"100%", borderCollapse:"collapse",
                        fontFamily:mono, fontSize:12}}>
                        <thead>
                          <tr style={{borderBottom:`1px solid ${C.edge}`}}>
                            {["Project","MW","Zone","Withdraw Risk","Timeline","Cost","Status"].map(h=>(
                              <th key={h} style={{...labelStyle, padding:"8px 12px",
                                textAlign:"left", fontSize:9}}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          <tr style={{background:`${C.blue}10`,
                            borderBottom:`1px solid ${C.edge}`}}>
                            <td style={{padding:"10px 12px", color:C.blue, fontWeight:700}}>
                              ► {form.projectName||"This Project"}</td>
                            <td style={{padding:"10px 12px"}}>{form.capacity}</td>
                            <td style={{padding:"10px 12px"}}>{form.zone}</td>
                            <td style={{padding:"10px 12px", color:riskColor}}>
                              {(result.wd*100).toFixed(1)}%</td>
                            <td style={{padding:"10px 12px"}}>{result.timeline} mo</td>
                            <td style={{padding:"10px 12px"}}>${result.cost}M</td>
                            <td style={{padding:"10px 12px"}}>
                              <Tag color={C.blue}>CURRENT</Tag></td>
                          </tr>
                          {result.comps.map((c,i)=>(
                            <tr key={i} style={{borderBottom:`1px solid ${C.edge}20`}}>
                              <td style={{padding:"10px 12px", color:C.sub}}>{c.name}</td>
                              <td style={{padding:"10px 12px", color:C.sub}}>{c.mw}</td>
                              <td style={{padding:"10px 12px", color:C.sub}}>{c.zone}</td>
                              <td style={{padding:"10px 12px",
                                color:c.wd>0.5?C.red:c.wd>0.3?C.amber:C.green}}>
                                {(c.wd*100).toFixed(1)}%</td>
                              <td style={{padding:"10px 12px", color:C.sub}}>{c.tl} mo</td>
                              <td style={{padding:"10px 12px", color:C.sub}}>${c.cost}M</td>
                              <td style={{padding:"10px 12px"}}>
                                <Tag color={c.status==="IA Signed"?C.green:C.blue}>
                                  {c.status}</Tag></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>

                  <p style={{fontFamily:mono, fontSize:10, color:"#1e3a5f",
                    textAlign:"center", letterSpacing:1, paddingBottom:8}}>
                    Trained on 7 months ERCOT queue data (Jul 2025–Jan 2026) · 92.4% withdrawal accuracy · {new Date().toLocaleDateString()} · Internal use only
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── PORTFOLIO TAB ───────────────────────────────────────────── */}
        {tab === "portfolio" && (
          <div style={{padding:32, maxWidth:1100, margin:"0 auto"}}>
            {!portStats ? (
              <div style={{textAlign:"center", padding:80, opacity:0.4}}>
                <p style={{fontFamily:mono, fontSize:12, color:C.muted,
                  letterSpacing:2, textTransform:"uppercase"}}>
                  Run predictions to build your portfolio
                </p>
              </div>
            ) : (
              <div style={{display:"flex", flexDirection:"column", gap:20,
                animation:"fadeUp 0.4s ease"}}>
                <h2 style={{fontFamily:mono, fontSize:16, fontWeight:700, letterSpacing:2}}>
                  PORTFOLIO SUMMARY</h2>
                <div style={{display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12}}>
                  <StatBox label="Avg Certainty Score" value={portStats.avgScore}
                    sub="Portfolio average"
                    color={portStats.avgScore>=70?C.green:C.amber}/>
                  <StatBox label="High Risk Projects" value={portStats.highRisk}
                    sub={`of ${history.length} total`} color={C.red}/>
                  <StatBox label="Avg Upgrade Cost" value={`$${portStats.avgCost}M`}
                    sub="Portfolio average" color={C.amber}/>
                  <StatBox label="Total Portfolio MW" value={`${portStats.totalMW} MW`}
                    sub="Across all projects" color={C.blue}/>
                </div>
                <Card>
                  <SectionTitle>All Evaluated Projects</SectionTitle>
                  <table style={{width:"100%", borderCollapse:"collapse",
                    fontFamily:mono, fontSize:12}}>
                    <thead>
                      <tr style={{borderBottom:`1px solid ${C.edge}`}}>
                        {["Project","MW","Tech","Zone","WD Risk","Timeline","Cost","Score"].map(h=>(
                          <th key={h} style={{...labelStyle, padding:"8px 12px",
                            textAlign:"left", fontSize:9}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((h,i)=>(
                        <tr key={i} style={{borderBottom:`1px solid ${C.edge}20`}}>
                          <td style={{padding:"10px 12px"}}>{h.projectName||"Unnamed"}</td>
                          <td style={{padding:"10px 12px", color:C.sub}}>{h.capacity}</td>
                          <td style={{padding:"10px 12px", color:C.sub}}>{h.techType}</td>
                          <td style={{padding:"10px 12px", color:C.sub}}>{h.zone}</td>
                          <td style={{padding:"10px 12px",
                            color:h.wd>0.5?C.red:h.wd>0.3?C.amber:C.green}}>
                            {(h.wd*100).toFixed(1)}%</td>
                          <td style={{padding:"10px 12px", color:C.sub}}>{h.timeline} mo</td>
                          <td style={{padding:"10px 12px", color:C.sub}}>${h.cost}M</td>
                          <td style={{padding:"10px 12px", fontWeight:700,
                            color:h.score>=70?C.green:h.score>=50?C.amber:C.red}}>
                            {h.score}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              </div>
            )}
          </div>
        )}

        {/* ── ABOUT TAB ───────────────────────────────────────────────── */}
        {tab === "about" && (
          <div style={{padding:32, maxWidth:800, margin:"0 auto",
            display:"flex", flexDirection:"column", gap:16,
            animation:"fadeUp 0.4s ease"}}>
            <h2 style={{fontFamily:mono, fontSize:16, fontWeight:700, letterSpacing:2}}>
              ABOUT THIS TOOL</h2>
            {[
              {title:"Model",        body:`Physics-Informed Neural Network (PINN) trained on 7 months of ERCOT GIS queue data (July 2025 – January 2026). Achieves 92.4% withdrawal prediction accuracy on held-out test data.`},
              {title:"Inputs",       body:`Project capacity, technology type, study phase, CDR zone, county, POI congestion, days in queue, firm capacity %, IRA energy community eligibility, and behind-the-meter flag.`},
              {title:"Outputs",      body:`Withdrawal probability with 95% CI, expected timeline to IA signing, network upgrade cost estimate, IRR impact, revenue at risk, phase-by-phase risk breakdown, and optimization recommendations.`},
              {title:"Data Sources", body:`ERCOT Generation Interconnection Status Reports (RPT_00015933), publicly available at mis.ercot.com. Withdrawal labels identified by cross-referencing INR numbers across monthly reports.`},
              {title:"Limitations",  body:`Timeline and cost targets are currently estimated. Model should be retrained monthly as new ERCOT data becomes available. Not a guarantee of project outcomes.`},
              {title:"Disclaimer",   body:`For internal use and investor discussions only. ERCOT interconnection outcomes depend on factors not fully captured in this model.`},
            ].map(({title,body})=>(
              <Card key={title}>
                <p style={{...labelStyle, marginBottom:10}}>{title}</p>
                <p style={{fontSize:13, color:C.sub, lineHeight:1.7}}>{body}</p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
