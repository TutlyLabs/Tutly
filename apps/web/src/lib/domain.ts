import "server-only";
import { cache } from "react";

export type DomainStatus = { status: "system" };

export const getOrgFromHost = cache(async (): Promise<DomainStatus> => {
  return { status: "system" };
});
