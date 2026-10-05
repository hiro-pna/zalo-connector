import { ZaloPersonalToolSchema } from "../tool.js";

const ALL_ACTIONS: string[] = (ZaloPersonalToolSchema as any).properties.action.enum;

const READ_ONLY_EXTRA = new Set(["me", "friends", "groups", "status", "last-online", "parse-link"]);

/** Actions that only read data. Everything else changes state or is visible to others. */
export function isReadAction(action: string): boolean {
  return /^(get|list|search|check|find)-/.test(action) || READ_ONLY_EXTRA.has(action);
}

export const READ_ACTIONS = ALL_ACTIONS.filter(isReadAction);
export const WRITE_ACTIONS = ALL_ACTIONS.filter((a) => !isReadAction(a));

/** Copy of the shared input schema with `action` limited to the given list. */
export function schemaFor(actions: string[]): Record<string, unknown> {
  const base = JSON.parse(JSON.stringify(ZaloPersonalToolSchema));
  base.properties.action = {
    type: "string",
    enum: actions,
    description: `Action to perform: ${actions.join(", ")}`,
  };
  return base;
}
