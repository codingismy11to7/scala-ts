export const errorAny = (e: any) => (e instanceof Error ? e : new Error(e));
