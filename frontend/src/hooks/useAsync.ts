import { useState, useEffect, useCallback } from 'react';

type Status = 'idle' | 'loading' | 'success' | 'error';

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const result = await fn();
      setData(result);
      setStatus('success');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
      setStatus('error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { execute(); }, [execute]);

  return { data, status, error, refetch: execute };
}
