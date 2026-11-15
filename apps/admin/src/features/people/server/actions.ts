"use server";
import {peopleService} from "./index";
export async function moderateProfileAction(input: unknown) {return peopleService().moderate(input);}
