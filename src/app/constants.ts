import React from "react";
import {
  User, Mail, Phone, Globe, Wifi, MapPin, Image as ImageIcon, Shield, Database,
  Eye, Cpu, Zap, Hash, Link2, Info, AlertTriangle, XCircle, CheckCircle2,
  Bug, Crosshair, Layers, Network, Fingerprint,
} from "lucide-react";

export const API = "http://localhost:3002/api";

export type LogLevel = "info"|"warn"|"error"|"success"|"debug"|"entity"|"phase";
export type MainTab = "entities"|"map"|"graph"|"timeline"|"dashboard"|"gallery"|"persons";
export type LeftTab = "config"|"modules"|"history";

export interface LiveModule { id:string; name:string; category:string; targetTypes:string[]; priority:number; available:boolean; }
export interface CatalogMod { id:string; name:string; description:string; category:string; subcategory:string; enabled:boolean; installed:boolean; risk:string; apiKeys?:string[]; github?:string; isLive?:boolean; targetTypes?:string[]; }
export interface DebugEntry { id:string; ts:number; level:LogLevel; module:string; message:string; payload?:any; }
export interface Entity { id:string; type:string; value:string; source:string; confidence:number; metadata:Record<string,any>; verified:boolean; depth:number; }
export interface Correlation { id:string; from:string; to:string; type:string; strength:number; evidence:string; }
export interface ToolState { id:string; name:string; status:"pending"|"running"|"done"|"error"|"skipped"; duration?:number; found?:number; startTs?:number; }
export interface Cfg { maxDepth:number; maxEntities:number; timeoutMs:number; enableAI:boolean; enableWebSearch:boolean; enableRecursive:boolean; recursiveThreshold:number; selectedModules:string[]; }
export interface ChatMsg { id:string; role:"user"|"assistant"; content:string; ts:number; }

export const ETYPE_ICONS: Record<string, React.FC<any>> = {
  username:User, email:Mail, phone:Phone, domain:Globe, ip:Wifi, url:Link2,
  image:ImageIcon, person:User, organization:Database, location:MapPin,
  social_profile:Eye, technology:Cpu, service:Zap, breach:Shield,
  vulnerability:AlertTriangle, network:Network, fingerprint:Fingerprint,
  dns_record:Database, subdomain:Globe, unknown:Hash,
};
export const EC: Record<string,string> = {
  username:"#8b5cf6", email:"#3b82f6", phone:"#22c55e", domain:"#06b6d4",
  ip:"#f97316", url:"#64748b", person:"#ec4899", organization:"#f59e0b",
  location:"#10b981", social_profile:"#6366f1", technology:"#14b8a6",
  service:"#0ea5e9", breach:"#ef4444", vulnerability:"#ef4444",
  dns_record:"#06b6d4", subdomain:"#22d3ee",
};
export const CC: Record<string,string> = {
  person:"#8b5cf6", domain:"#06b6d4", network:"#f97316", web:"#0ea5e9",
  social:"#ec4899", email:"#3b82f6", username:"#a78bfa", ip:"#f97316",
  image:"#10b981", breach:"#ef4444", phone:"#22c55e", geolocation:"#10b981",
};
export const LC: Record<LogLevel,string> = {
  info:"#38bdf8", warn:"#fbbf24", error:"#f87171", success:"#34d399",
  debug:"#3f3f46", entity:"#67e8f9", phase:"#a78bfa",
};
export const LI: Record<LogLevel,React.FC<any>> = {
  info:Info, warn:AlertTriangle, error:XCircle, success:CheckCircle2,
  debug:Bug, entity:Crosshair, phase:Layers,
};
export const ec = (t:string) => EC[t]??"#71717a";
export const cc = (t:string) => CC[t]??"#71717a";
export const DFLT: Cfg = { maxDepth:2, maxEntities:500, timeoutMs:300000, enableAI:true, enableWebSearch:true, enableRecursive:true, recursiveThreshold:70, selectedModules:[] };

export function detectType(v:string) {
  if (/^[\w.+-]+@[\w-]+\.[\w.]+$/.test(v)) return "email";
  if (/^\+?[\d\s()\-]{7,}$/.test(v)) return "phone";
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(v)) return "ip";
  if (/^https?:\/\//.test(v)) return "url";
  if (/^[\w-]+\.[\w.]{2,}$/.test(v)) return "domain";
  return "username";
}
export function fmtTs(n:number) {
  const d=new Date(n);
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")}.${String(d.getMilliseconds()).padStart(3,"0")}`;
}
