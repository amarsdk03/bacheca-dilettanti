import "server-only";
import {randomUUID} from "node:crypto";
import type {Json} from "@bacheca/database";
import {type ClaimsClient, verifySessionClaims} from "../../auth/server/session-claims";
import {canonicalUuid, record} from "../../annunci/validation";
import {parseDetailResponse} from "../../annunci/server/detail-response";
import {generateWhatsAppMessage} from "../../annunci/whatsapp/templates";
import {
	type Channel,
	type Page,
	parseChannel,
	parseChannelInput,
	parseDetailInput,
	parsePage,
	parsePublication,
	parseQuery,
	parseQueueItem,
	parseSave,
	type Publication,
	type QueueItem,
	type Result
} from "../contracts";
import type {AnnouncementDetail} from "../../annunci/contracts";

export type DistributionDetail = {detail:AnnouncementDetail|null; sourceHash:string|null; record:Publication|null; sourceHere:boolean; generated:ReturnType<typeof generateWhatsAppMessage>|null; history:{version:number;createdAt:string;text:string;url:string|null;confirmed:boolean;manual:boolean}[]};
type Client=ClaimsClient&{rpc(name:"admin_distribution_read_v1"|"admin_distribution_write_v1",args:Record<string,Json>):PromiseLike<{data:unknown;error:unknown}>};
export function createDistributionService(deps:{client():Promise<Client>; failure?(action:"distribution.save"|"distribution.channel_save",id:string|null,code:string,correlationId:string):Promise<unknown>; log?(correlationId:string):void}) {
  async function call<T>(write:boolean,op:string,input:Record<string,unknown>,parse:(v:unknown)=>T):Promise<Result<T>> {
    const correlationId=randomUUID();
    try {
      const client=await deps.client(),claims=await verifySessionClaims(client); if(claims.status!=="verified") return {status:claims.status==="unavailable"?"unavailable":"denied",correlationId};
      const {data,error}=await client.rpc(write?"admin_distribution_write_v1":"admin_distribution_read_v1",write?{p_operation:op,p_input:input as Json}:{p_operation:op,p_query:input as Json});
      if(error){const e=error as {code?:string;message?:string}; if(e.code==="42501"&&e.message!=="ADMIN_SESSION_POLICY_UNVERIFIED")return{status:"denied",correlationId}; if(["22023","22P02","22007","22008"].includes(e.code??""))return{status:"invalid",correlationId};throw Error();}
      if(data===null)return{status:"not_found",correlationId};
      if(write){if(!record(data))throw Error(); if(data.status!=="ok"){if(["invalid","denied","not_found","not_allowed","conflict","source_exists","confirmation_required"].includes(String(data.status)))return{status:data.status as "invalid",correlationId};throw Error();}}
      return{status:"ok",data:parse(data)};
    } catch {deps.log?.(correlationId);return{status:"unavailable",correlationId};}
  }
  return {
    async list(raw:unknown):Promise<Result<Page<QueueItem|Publication|Channel>>>{let q;try{q=parseQuery(raw);}catch{return{status:"invalid"};}return call(false,q.view,q,v=>q.view==="queue"?parsePage(v,parseQueueItem):q.view==="channels"?parsePage(v,parseChannel):parsePage(v,parsePublication));},
    async choices(announcementId?:string):Promise<Result<Channel[]>> {if(announcementId!==undefined&&!canonicalUuid(announcementId))return{status:"invalid"};return call(false,"choices",announcementId?{announcementId}:{},v=>{if(!Array.isArray(v)||v.length>200)throw Error();return v.map(parseChannel);});},
    async detail(raw:unknown):Promise<Result<DistributionDetail>> {let q;try{q=parseDetailInput(raw);}catch{return{status:"invalid"};}return call(false,"detail",q,v=>{
      if(!record(v)||typeof v.sourceHere!=="boolean"||!(v.sourceHash===null||typeof v.sourceHash==="string"&&/^[a-f0-9]{64}$/.test(v.sourceHash))||!Array.isArray(v.history)||v.history.length>30)throw Error();
      const detail=v.detail===null?null:record(v.detail)&&record(v.detail.summary)&&typeof v.detail.summary.id==="string"?parseDetailResponse(v.detail,v.detail.summary.id):null;
      if(v.detail!==null&&!detail)throw Error();
      return{detail,sourceHash:v.sourceHash as string|null,record:v.record===null?null:parsePublication(v.record),sourceHere:v.sourceHere,generated:detail?generateWhatsAppMessage(detail,`https://www.bachecadilettanti.it/dettagli-annuncio?id=${detail.summary.id}`):null,history:v.history.map(h=>{if(!record(h)||typeof h.version!=="number"||!Number.isInteger(h.version)||typeof h.createdAt!=="string"||!Number.isFinite(Date.parse(h.createdAt))||typeof h.text!=="string"||h.text.length>50000||!(h.url===null||typeof h.url==="string")||typeof h.confirmed!=="boolean"||typeof h.manual!=="boolean")throw Error();return {version:h.version,createdAt:h.createdAt,text:h.text,url:h.url as string|null,confirmed:h.confirmed,manual:h.manual};})};
    });},
    async write(op:"save"|"channel_save",raw:unknown):Promise<Result<{id:string}>> {let input;try{input=op==="save"?parseSave(raw):parseChannelInput(raw);}catch{return{status:"invalid"};}
      const result=await call(true,op,input,v=>{if(!record(v)||typeof v.id!=="string"||!/^[a-f0-9-]{36}$/.test(v.id))throw Error();return{id:v.id};});
      if(result.status!=="ok"&&deps.failure){const codes={invalid:"VALIDATION_FAILED",denied:"ACCESS_DENIED",not_found:"RESOURCE_NOT_FOUND",conflict:"STATE_CONFLICT",unavailable:"OPERATION_FAILED",not_allowed:"VALIDATION_FAILED",source_exists:"STATE_CONFLICT",confirmation_required:"VALIDATION_FAILED"};try{await deps.failure(op==="save"?"distribution.save":"distribution.channel_save","recordId"in input?input.recordId??null:"id"in input?input.id??null:null,codes[result.status],result.correlationId??randomUUID());}catch{}}
      return result;
    },
  };
}
