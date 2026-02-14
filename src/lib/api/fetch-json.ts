type MaybeApiError = {
  error?: string;
  code?: string;
};

export async function fetchJsonNoStore<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-store' });

  if (!response.ok) {
    let message = `${response.status}`;

    try {
      const payload = (await response.json()) as MaybeApiError;
      if (payload.error) {
        message = payload.code ? `${payload.error} (${payload.code})` : payload.error;
      }
    } catch {
      // fallback to status code only
    }

    throw new Error(message);
  }

  return response.json() as Promise<T>;
}
