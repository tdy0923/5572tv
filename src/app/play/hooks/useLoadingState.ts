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
  | { type: 'SET_ERROR'; error: string }
  | { type: 'READY' }
  | { type: 'RESET' };

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
      return { ...state, loading: false, error: action.error };
    case 'READY':
      return { ...state, loading: false, stage: 'ready', error: null };
    case 'RESET':
      return initialState;
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
    setError: (error: string) => dispatch({ type: 'SET_ERROR', error }),
    setReady: () => dispatch({ type: 'READY' }),
    reset: () => dispatch({ type: 'RESET' }),
  };
}
