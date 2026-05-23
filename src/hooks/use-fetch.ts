import { useState, useEffect, useCallback } from 'react';

interface UseFetchOptions {
  immediate?: boolean;
}

interface UseFetchReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useFetch<T>(url: string, options: UseFetchOptions = {}): UseFetchReturn<T> {
  const { immediate = true } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(url);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Erro ao carregar dados');
      }

      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    if (immediate) {
      fetchData();
    }
  }, [fetchData, immediate]);

  return { data, loading, error, refetch: fetchData };
}

interface UseMutationOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: string) => void;
}

interface UseMutationReturn<T, V> {
  mutate: (variables: V) => Promise<T | null>;
  loading: boolean;
  error: string | null;
}

export function useMutation<T, V = unknown>(
  url: string,
  method: 'POST' | 'PATCH' | 'DELETE' = 'POST',
  options: UseMutationOptions<T> = {}
): UseMutationReturn<T, V> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = async (variables: V): Promise<T | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: method !== 'DELETE' ? JSON.stringify(variables) : undefined,
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Erro ao processar requisição');
      }

      options.onSuccess?.(result.data);
      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      options.onError?.(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { mutate, loading, error };
}
