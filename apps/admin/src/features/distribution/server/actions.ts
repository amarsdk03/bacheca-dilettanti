"use server";
import {revalidatePath} from "next/cache";
import {distributionService} from "./index";

export async function readDistributionDetail(input:unknown){return distributionService(true).detail(input);}
export async function readDistributionChannels(announcementId?:string){return distributionService(true).choices(announcementId);}
export async function saveDistribution(input:unknown){const result=await distributionService(true).write("save",input);if(result.status==="ok")for(const p of ["/distribuzione","/annunci","/registro-attivita"])revalidatePath(p);return result;}
export async function saveDistributionChannel(input:unknown){const result=await distributionService(true).write("channel_save",input);if(result.status==="ok"){revalidatePath("/distribuzione");revalidatePath("/registro-attivita");}return result;}
