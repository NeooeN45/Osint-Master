import React, { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Terminal, Search, X, ChevronDown, XCircle, AlertTriangle, Play, Square, ZoomIn, Minimize2 } from "lucide-react";
import { DebugEntry, LogLevel, LC, LI, fmtTs } from "./constants";

interface LogLineProps { entry: DebugEntry; }

function LogLine({ entry }: LogLineProps) {
  const [open, setOpen] = useState(false);
  const Icon = LI[entry.level];
  const has = !!(entry.payload && Object.keys(entry.payload).length > 0);
  const dark = entry.level === "debug";
  return (
    <div style={{
      borderBottom:"1px solid rgba(255,255,255,.015)",
      borderLeft:`2px solid ${entry.level==="error"?"rgba(248,113,113,.4)":entry.level==="warn"?"rgba(251,191,36,.35)":entry.level==="entity"?"rgba(103,232,249,.35)":entry.level==="phase"?"rgba(167,139,250,.35)":entry.level==="success"?"rgba(52,211,153,.3)":"transparent"}`,
      background:dark?"transparent":`${LC[entry.level]}04`,
    }}>
      <div
        onClick={()=>has&&setOpen(v=>!v)}
        style={{display:"flex",alignItems:"flex-start",gap:5,padding:"2px 8px",cursor:has?"pointer":"default",opacity:dark?.45:1}}
        onMouseOver={e=>{if(has)(e.currentTarget as HTMLDivElement).style.background="rgba(255,255,255,.015)";}}
        onMouseOut={e=>{(e.currentTarget as HTMLDivElement).style.background="transparent";}}>
        <span style={{color:"#1f2937",flexShrink:0,fontSize:8.5,width:76,marginTop:1,fontFamily:"monospace"}}>{fmtTs(entry.ts)}</span>
        <Icon style={{width:8,height:8,marginTop:2,flexShrink:0,color:LC[entry.level]}}/>
        <span style={{color:"#27272a",flexShrink:0,fontSize:8.5,width:62,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginTop:1}}>[{entry.module}]</span>
        <span style={{flex:1,color:LC[entry.level],wordBreak:"break-all",fontSize:8.5,lineHeight:1.5}}>{entry.message}</span>
        {has&&<ChevronDown style={{width:8,height:8,color:"#3f3f46",flexShrink:0,transform:open?"rotate(180deg)":"none",transition:"transform .15s",marginTop:2}}/>}
      </div>
      {open&&has&&(
        <div style={{paddingLeft:140,paddingRight:8,paddingBottom:4}}>
          <pre style={{fontSize:8,color:"#52525b",background:"rgba(0,0,0,.4)",border:"1px solid rgba(255,255,255,.04)",borderRadius:5,padding:"4px 7px",overflowX:"auto",maxHeight:120,margin:0,fontFamily:"monospace"}}>
            {JSON.stringify(entry.payload,null,2)}
          </pre>
        </div>
      )}
    </div>
  );
}

interface Props {
  log: DebugEntry[];
  onClear: () => void;
  height: number;
  onHeightChange: (h:number) => void;
  onClose: () => void;
}

export default function DebugConsole({ log, onClear, height, onHeightChange, onClose }: Props) {
  const [filter, setFilter] = useState<LogLevel|"all">("all");
  const [search, setSearch] = useState("");
  const [paused, setPaused] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    let l = log;
    if (filter !== "all") l = l.filter(e => e.level === filter);
    if (search) l = l.filter(e => e.message.toLowerCase().includes(search.toLowerCase()) || e.module.toLowerCase().includes(search.toLowerCase()));
    return l;
  }, [log, filter, search]);

  useEffect(() => {
    if (!paused && endRef.current) endRef.current.scrollIntoView({ behavior: "smooth" });
  }, [log.length, paused]);

  const errCount = log.filter(e=>e.level==="error").length;
  const warnCount = log.filter(e=>e.level==="warn").length;

  return (
    <div style={{borderTop:"1px solid rgba(255,255,255,.06)",display:"flex",flexDirection:"column",background:"rgba(4,5,9,.97)",backdropFilter:"blur(12px)",flexShrink:0,overflow:"hidden",height}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",gap:6,padding:"4px 10px",borderBottom:"1px solid rgba(255,255,255,.05)",flexShrink:0}}>
        <Terminal style={{width:10,height:10,color:"#22d3ee"}}/>
        <span style={{fontSize:9,fontWeight:700,color:"#22d3ee",textTransform:"uppercase",letterSpacing:1}}>Debug Console</span>
        <span style={{fontSize:8,color:"#3f3f46"}}>({filtered.length}/{log.length})</span>
        <div style={{flex:1}}/>
        {/* Level filters */}
        <div style={{display:"flex",gap:2}}>
          {(["all","error","warn","info","success","entity","phase","debug"] as const).map(lvl=>(
            <button key={lvl} onClick={()=>setFilter(lvl)}
              style={{fontSize:7.5,fontWeight:700,padding:"1px 5px",borderRadius:3,cursor:"pointer",
                background:filter===lvl?(lvl==="all"?"rgba(255,255,255,.14)":`${LC[lvl as LogLevel]}18`):"transparent",
                border:filter===lvl?`1px solid ${lvl==="all"?"rgba(255,255,255,.2)":`${LC[lvl as LogLevel]}35`}`:"1px solid transparent",
                color:filter===lvl?(lvl==="all"?"#f4f4f5":LC[lvl as LogLevel]):"#3f3f46"}}>
              {lvl}{lvl==="error"&&errCount>0?` (${errCount})`:""}{lvl==="warn"&&warnCount>0?` (${warnCount})`:""}</button>
          ))}
        </div>
        {/* Search */}
        <div style={{position:"relative",marginLeft:4}}>
          <Search style={{position:"absolute",left:5,top:"50%",transform:"translateY(-50%)",width:7,height:7,color:"#3f3f46"}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Filtrer..."
            style={{width:76,paddingLeft:16,paddingRight:5,paddingTop:2,paddingBottom:2,background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.07)",borderRadius:4,fontSize:8,color:"#d4d4d8",outline:"none"}}/>
          {search&&<button onClick={()=>setSearch("")} style={{position:"absolute",right:3,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:"#52525b",cursor:"pointer",padding:0}}><X style={{width:7,height:7}}/></button>}
        </div>
        <button onClick={()=>setPaused(v=>!v)} title={paused?"Reprendre":"Pause"} style={{padding:3,borderRadius:3,background:paused?"rgba(245,158,11,.12)":"transparent",border:"none",color:paused?"#fbbf24":"#3f3f46",cursor:"pointer"}}>
          {paused?<Play style={{width:9,height:9}}/>:<Square style={{width:9,height:9}}/>}
        </button>
        <button onClick={onClear} title="Effacer" style={{padding:3,border:"none",background:"transparent",color:"#3f3f46",cursor:"pointer"}}><X style={{width:9,height:9}}/></button>
        <button onClick={()=>onHeightChange(height===200?360:height===360?520:200)} style={{padding:3,border:"none",background:"transparent",color:"#3f3f46",cursor:"pointer"}}><ZoomIn style={{width:9,height:9}}/></button>
        <button onClick={onClose} style={{padding:3,border:"none",background:"transparent",color:"#3f3f46",cursor:"pointer"}}><Minimize2 style={{width:9,height:9}}/></button>
      </div>
      {/* Log list */}
      <div className="s" style={{flex:1,overflowY:"auto",fontFamily:"'JetBrains Mono','Fira Code','Consolas',monospace"}}>
        {filtered.length===0&&(
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",color:"#27272a",gap:7,fontSize:10}}>
            <Terminal style={{width:12,height:12}}/>{log.length===0?"En attente de logs...":"Aucun log dans ce filtre"}
          </div>
        )}
        {filtered.map(entry=><LogLine key={entry.id} entry={entry}/>)}
        <div ref={endRef}/>
      </div>
    </div>
  );
}
