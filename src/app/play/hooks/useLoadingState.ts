import { useReducer } from 'react';

type LoadingStage = 'searching' | 'preferring' | 'fetching' | 'ready';

interface LoadingState {
  loading: boolean;
  stage: LoadingStage;
  message: string;
  error: string | null;
}

type LoadingAction =
  | { type: 'SET_STAGE'; stage: LoadingStage; message?: string }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'READY' }
  | { type: 'RESET' }
  | { type: 'CLEAR_ERROR' };

const initialState: LoadingState = {
  loading: true,
  stage: 'searching',
  message: '正在搜索播放源...',
  error: null,
};

function loadingReducer(
  state: LoadingState,
  action: LoadingAction,
): LoadingState {
  switch (action.type) {
    case 'SET_STAGE':
      return {
        ...state,
        loading: action.stage !== 'ready',
        stage: action.stage,
        message: action.message ?? state.message,
        error: null,
      };
    case 'SET_ERROR':
      // null clears error and keeps current stage; string sets error and stops loading
      if (action.error === null) {
        return { ...state, error: null };
      }
      return { ...state, loading: false, error: action.error };
    case 'READY':
      return { ...state, loading: false, stage: 'ready', error: null };
    case 'RESET':
      return initialState;
    case 'CLEAR_ERROR':
      return { ...state, error: null, loading: true, stage: 'searching', message: '正在搜索播放源...' };
  }
}

export function useLoadingState() {
  const [state, dispatch] = useReducer(loadingReducer, initialState);

  return {
    loading: state.loading,
    loadingStage: state.stage,
    loadingMessage: state.message,
    error: state.error,
    setStage: (stage: LoadingStage, message?: string) =>
      dispatch({ type: 'SET_STAGE', stage, message }),
    setError: (error: string | null) => dispatch({ type: 'SET_ERROR', error }),
    clearError: () => dispatch({ type: 'CLEAR_ERROR' }),
    setReady: () => dispatch({ type: 'READY' }),
    reset: () => dispatch({ type: 'RESET' }),
  };
}
