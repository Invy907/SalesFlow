type PageResult<T> = { data: T[] | null; error: { message: string } | null };

/** Aggregate queries must page explicitly: the API caps even unbounded selects. */
export async function collectAllRows<T>(
  load: (from: number, to: number) => PromiseLike<PageResult<T>>,
  batchSize = 500,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += batchSize) {
    const { data, error } = await load(from, from + batchSize - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < batchSize) return rows;
  }
}
