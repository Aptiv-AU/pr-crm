import { revalidatePath, revalidateTag } from "next/cache";

export type ActionResult<T = Record<string, unknown>> =
  | ({ success: true } & T)
  | { error: string };

export function action<A extends unknown[], R extends Record<string, unknown> | void = void>(
  name: string,
  fn: (...args: A) => Promise<{ data?: R; revalidate?: string[]; revalidateTags?: string[] }>
) {
  return async (...args: A): Promise<ActionResult<R extends void ? {} : R>> => {
    try {
      const { data, revalidate, revalidateTags } = await fn(...args);
      revalidate?.forEach((path) => revalidatePath(path));
      // W6: tag-scoped revalidation. Next.js 16 requires the 2-arg form;
      // `'max'` uses stale-while-revalidate semantics so reads stay fast
      // while the refresh happens in the background.
      revalidateTags?.forEach((tag) => revalidateTag(tag, "max"));
      return { success: true, ...(data ?? {}) } as ActionResult<R extends void ? {} : R>;
    } catch (err) {
      console.error(`${name} error:`, err);
      return {
        error: err instanceof Error ? err.message : `Failed: ${name}`,
      };
    }
  };
}
