"use server";
import {communityService} from "./index";
export async function updateReportAction(input: unknown) {return communityService().update("reports", input);}
export async function considerInvitationAction(input: unknown) {return communityService().update("invitations", input);}
