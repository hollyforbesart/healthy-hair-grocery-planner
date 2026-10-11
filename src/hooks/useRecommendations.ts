import { useEffect, useState } from 'react';
import type { MealRecommendation, RecommendationProvider, RecommendationRequest } from '../services/recommendations';

export type RecommendationState =
  | { status: 'loading'; data: MealRecommendation[] }
  | { status: 'ready'; data: MealRecommendation[] }
  | { status: 'error'; data: MealRecommendation[]; error: string };

/**
 * Runs the active provider whenever the request changes. Works the same for
 * the instant local provider and a future network-backed one.
 * `request` should be memoized by the caller.
 */
export function useRecommendations(provider: RecommendationProvider, request: RecommendationRequest): RecommendationState {
  const [state, setState] = useState<RecommendationState>({ status: 'loading', data: [] });

  useEffect(() => {
    const controller = new AbortController();
    setState((prev) => ({ status: 'loading', data: prev.data }));
    provider
      .recommend(request, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setState({ status: 'ready', data });
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setState((prev) => ({ status: 'error', data: prev.data, error: 'We couldn’t load meal ideas. Please try again.' }));
        }
      });
    return () => controller.abort();
  }, [provider, request]);

  return state;
}
