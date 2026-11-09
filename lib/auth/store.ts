import {
  deleteSession,
  getSession as getSessionRecord,
  putSession,
  touchSession,
} from "@/lib/db/sessions";
import type { SessionStore } from "./session-core";

export const dynamoSessionStore: SessionStore = {
  put: putSession,
  get: getSessionRecord,
  touch: touchSession,
  delete: deleteSession,
};
