import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE } from '../App';
import { apiErrorMessage } from './api';

type ApiState<T> = { data: T | null; error: string; loading: boolean };

// GET a resource and keep its loading and error state; reload() fetches again without dropping the data on screen
export const useApi = <T = any>(path: string) => {
  const [state, setState] = useState<ApiState<T>>({ data: null, error: '', loading: true });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let live = true;
    setState((s) => ({ ...s, loading: true, error: '' }));
    axios.get(`${API_BASE}${path}`)
      .then((res) => live && setState({ data: res.data, error: '', loading: false }))
      .catch((err) => live && setState((s) => ({ data: s.data, error: apiErrorMessage(err, 'Could not reach the server. Check that the backend is running.'), loading: false })));
    return () => { live = false; };
  }, [path, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
};
