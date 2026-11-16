import assert from "node:assert/strict";
import {test} from "node:test";
import {randomUUID} from "node:crypto";
import {adminServerLoader} from "./helpers/admin-server-loader.mjs";
const load=adminServerLoader(),contracts=load("apps/admin/src/features/distribution/contracts.ts"),{createDistributionService}=load("apps/admin/src/features/distribution/server/service.ts");
const id="eeeeeeee-eeee-4eee-8eee-000000000001",claims={sub:id,session_id:id,role:"authenticated",exp:Date.now()/1000+1000};
function harness({data={items:[],hasMore:false},error=null,user=claims}={}){const calls=[],audits=[];return{calls,audits,service:createDistributionService({async client(){calls.push("client");return{auth:{async getClaims(){return{data:user?{claims:user}:null,error:null};}},async rpc(name,args){calls.push({name,args});return{data,error};}};},async failure(...args){audits.push(args);}})};}
test("distribution URLs, channel identities, message links and explicit confirmation normalize safely",()=>{
 const q=contracts.parseQuery({view:"publications",channel:id,state:"published",from:"2026-11-01",to:"2026-11-16",offset:30});
 assert.deepEqual(contracts.parseUrl(new URL(contracts.distributionHref(q),"http://localhost").searchParams),{valid:true,query:q});
 for(const query of ["view=bad","offset=1","offset=03","state=bad","channel=bad","channel="+id+"&channel="+id,"from=2026-02-30","from=2026-11-16&to=2026-11-15","unknown=1"])assert.equal(contracts.parseUrl(new URLSearchParams(query)).valid,false,query);
 const channel={url:"https://www.whatsapp.com/channel/MyChannel123"};
 assert.equal(contracts.channelKey(channel.url),"MyChannel123");
 for(const url of ["https://www.whatsapp.com.evil.test/channel/Channel123","https://wa.me/1234","javascript:alert(1)","https://user@whatsapp.com/channel/MyChannel123","https://whatsapp.com/channel/MyChannel123?x=1"])assert.equal(contracts.channelKey(url),null);
 assert.equal(contracts.messageLinkError("https://whatsapp.com/channel/MyChannel123/1",channel),null);
 assert.ok(contracts.messageLinkError("https://whatsapp.com/channel/OtherChannel/1",channel));
 const input={requestId:randomUUID(),announcementId:id,channelId:id,text:"Messaggio",url:"https://old.invalid",manual:true,templateVersion:"2026-11-v1",sourceHash:"a".repeat(64),version:0,repost:false,revoke:false};
 assert.equal(contracts.parseSave(input).url,"");assert.throws(()=>contracts.parseSave({...input,text:""}));
});
test("invalid requests never obtain a session; missing sessions deny; schema failures stay bounded",async()=>{
 const h=harness();assert.equal((await h.service.list({unknown:true})).status,"invalid");assert.equal((await h.service.detail({announcementId:"bad"})).status,"invalid");assert.equal((await h.service.write("save",{})).status,"invalid");assert.equal(h.calls.length,0);
 assert.equal((await harness({user:null}).service.list({})).status,"denied");
 assert.equal((await harness({error:{code:"42501",message:"ADMIN_SESSION_POLICY_UNVERIFIED"}}).service.list({})).status,"unavailable");
 assert.equal((await harness({error:{code:"42501"}}).service.list({})).status,"denied");
 assert.equal((await harness({error:{code:"22P02"}}).service.list({})).status,"invalid");
 assert.equal((await h.service.list({})).status,"ok");assert.equal(h.calls[1].name,"admin_distribution_read_v1");
});
test("write uses normalized DTO and projects receipts; conflicts audit independently",async()=>{
 const input={requestId:randomUUID(),name:" Canale ",url:"https://whatsapp.com/channel/Channel123/",region:null,active:true,version:0};
 const h=harness({data:{status:"ok",id,secret:"ignored"}}),result=await h.service.write("channel_save",input);
 assert.deepEqual(result,{status:"ok",data:{id}});assert.equal(h.calls[1].args.p_input.name,"Canale");assert.equal(h.calls[1].args.p_input.url,"https://www.whatsapp.com/channel/Channel123");
 const conflict=harness({data:{status:"conflict"}});assert.equal((await conflict.service.write("channel_save",input)).status,"conflict");assert.equal(conflict.audits[0][0],"distribution.channel_save");
 assert.equal((await harness({data:{status:"ok",id:"bad"}}).service.write("channel_save",input)).status,"unavailable");
});
