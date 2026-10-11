import { localRecommendationProvider } from './localProvider';
import type { RecommendationProvider } from './types';

export type { MealRecommendation, RecommendationProvider, RecommendationRequest } from './types';

/**
 * The provider the app uses. To add an AI-based service later, implement
 * RecommendationProvider (e.g. calling a Cloudflare Pages Function) and
 * return it here — optionally falling back to the local provider on error.
 */
export const recommendationProvider: RecommendationProvider = localRecommendationProvider;
