import { revalidatePath } from "next/cache";

export type ActionResult<T = Record<string, unknown>> =
  | ({ success: true } & T)
  | { error: string };

export function action<A extends unknown[], R extends Record<string, unknown> | void = void>(
  name: string,
  fn: (...args: A) => Promise<{ data?: R; revalidate?: string[] }>
) {
  return async (...args: A): Promise<ActionResult<R extends void ? {} : R>> => {
    try {
      const { data, revalidate } = await fn(...args);
      revalidate?.forEach((path) => revalidatePath(path));
      return { success: true, ...(data ?? {}) } as ActionResult<R extends void ? {} : R>;
    } catch (err) {
      console.error(`${name} error:`, err);
      return {
        error: err instanceof Error ? err.message : `Failed: ${name}`,
      };
    }
  };
}
