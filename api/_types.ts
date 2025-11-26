import { Context } from "grammy";
import { PoolClient } from "pg";

export interface SessionData {
  current_step?: string;
  flow_data?: {
    [key: string]: any;
  };
}

export type MyContext = Context & {
  session: SessionData;
  db: PoolClient;
};