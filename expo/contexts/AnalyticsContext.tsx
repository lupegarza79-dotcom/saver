import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SessionAnalytics } from '@/hooks/useAnalytics';

const STORAGE_KEY = 'saver_analytics_sessions';
const AB_VARIANT_KEY = 'saver_ab_variant';

export type ABVariant = 'control' | 'bottom_cta' | 'compact_hero' | 'video_hero';

interface AnalyticsInsights {
  totalSessions: number;
  avgTimeToFirstInteraction: number;
  avgEngagementScore: number;
  avgScrollDepth: number;
  zonePercentages: { top: number; center: number; bottom: number };
  bounceRate: number;
  ctaConversionRate: number;
  abVariantPerformance: Record<string, { sessions: number; avgScore: number; ctaRate: number }>;
  recommendation: string;
  bestPerformingVariant: string | null;
}

interface AnalyticsState {
  currentVariant: ABVariant;
  insights: AnalyticsInsights | null;
  isLoadingInsights: boolean;
  realtimeEngagement: {
    activeUsers: number;
    avgSessionDuration: number;
    topInteractedElements: string[];
  };
}

interface AnalyticsActions {
  setABVariant: (variant: ABVariant) => Promise<void>;
  refreshInsights: () => Promise<void>;
  getScreenInsights: (screenName: string) => Promise<AnalyticsInsights | null>;
  exportAnalyticsData: () => Promise<SessionAnalytics[]>;
  clearAllData: () => Promise<void>;
  getABTestWinner: () => ABVariant | null;
}

const AB_VARIANTS: ABVariant[] = ['control', 'bottom_cta', 'compact_hero', 'video_hero'];

export const [AnalyticsProvider, useAnalyticsContext] = createContextHook((): AnalyticsState & AnalyticsActions => {
  const [currentVariant, setCurrentVariantState] = useState<ABVariant>('control');
  const [insights, setInsights] = useState<AnalyticsInsights | null>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);

  const loadABVariant = async () => {
    try {
      const stored = await AsyncStorage.getItem(AB_VARIANT_KEY);
      if (stored && AB_VARIANTS.includes(stored as ABVariant)) {
        setCurrentVariantState(stored as ABVariant);
      } else {
        const randomVariant = AB_VARIANTS[Math.floor(Math.random() * AB_VARIANTS.length)];
        setCurrentVariantState(randomVariant);
        await AsyncStorage.setItem(AB_VARIANT_KEY, randomVariant);
        console.log(`[Analytics] Assigned A/B variant: ${randomVariant}`);
      }
    } catch (error) {
      console.error('[Analytics] Error loading A/B variant:', error);
    }
  };

  const setABVariant = useCallback(async (variant: ABVariant) => {
    setCurrentVariantState(variant);
    await AsyncStorage.setItem(AB_VARIANT_KEY, variant);
    console.log(`[Analytics] Set A/B variant: ${variant}`);
  }, []);

  const calculateInsights = useCallback((sessions: SessionAnalytics[]): AnalyticsInsights => {
    if (sessions.length === 0) {
      return {
        totalSessions: 0,
        avgTimeToFirstInteraction: 0,
        avgEngagementScore: 0,
        avgScrollDepth: 0,
        zonePercentages: { top: 33, center: 34, bottom: 33 },
        bounceRate: 0,
        ctaConversionRate: 0,
        abVariantPerformance: {},
        recommendation: 'No data yet - start collecting sessions',
        bestPerformingVariant: null,
      };
    }

    const validInteractions = sessions.filter(s => s.metrics.timeToFirstInteraction !== null);
    const avgTimeToFirstInteraction = validInteractions.length > 0
      ? validInteractions.reduce((sum, s) => sum + (s.metrics.timeToFirstInteraction || 0), 0) / validInteractions.length
      : 0;

    const avgEngagementScore = sessions.reduce((sum, s) => sum + s.metrics.engagementScore, 0) / sessions.length;
    const avgScrollDepth = sessions.reduce((sum, s) => sum + s.metrics.scrollDepthPercent, 0) / sessions.length;

    const zoneBreakdown = { top: 0, center: 0, bottom: 0 };
    sessions.forEach(s => {
      zoneBreakdown.top += s.heatmap.zones.top;
      zoneBreakdown.center += s.heatmap.zones.center;
      zoneBreakdown.bottom += s.heatmap.zones.bottom;
    });

    const totalTouches = zoneBreakdown.top + zoneBreakdown.center + zoneBreakdown.bottom;
    const zonePercentages = {
      top: totalTouches > 0 ? Math.round((zoneBreakdown.top / totalTouches) * 100) : 33,
      center: totalTouches > 0 ? Math.round((zoneBreakdown.center / totalTouches) * 100) : 34,
      bottom: totalTouches > 0 ? Math.round((zoneBreakdown.bottom / totalTouches) * 100) : 33,
    };

    const bounceRate = Math.round((sessions.filter(s => s.metrics.bounceRisk === 'high').length / sessions.length) * 100);
    const ctaConversionRate = Math.round((sessions.filter(s => s.metrics.primaryCTAClicked).length / sessions.length) * 100);

    const abVariantPerformance: Record<string, { sessions: number; avgScore: number; ctaRate: number }> = {};
    sessions.forEach(s => {
      const variant = s.abVariant || 'control';
      if (!abVariantPerformance[variant]) {
        abVariantPerformance[variant] = { sessions: 0, avgScore: 0, ctaRate: 0 };
      }
      abVariantPerformance[variant].sessions++;
      abVariantPerformance[variant].avgScore += s.metrics.engagementScore;
      if (s.metrics.primaryCTAClicked) abVariantPerformance[variant].ctaRate++;
    });

    Object.keys(abVariantPerformance).forEach(variant => {
      const data = abVariantPerformance[variant];
      data.avgScore = Math.round(data.avgScore / data.sessions);
      data.ctaRate = Math.round((data.ctaRate / data.sessions) * 100);
    });

    let bestPerformingVariant: string | null = null;
    let bestScore = 0;
    Object.entries(abVariantPerformance).forEach(([variant, data]) => {
      if (data.sessions >= 5) {
        const compositeScore = data.avgScore * 0.6 + data.ctaRate * 0.4;
        if (compositeScore > bestScore) {
          bestScore = compositeScore;
          bestPerformingVariant = variant;
        }
      }
    });

    const recommendations: string[] = [];
    
    if (avgTimeToFirstInteraction > 3000) {
      recommendations.push('Users take >3s to interact - make primary CTA more prominent');
    }
    
    if (zonePercentages.bottom > 50) {
      recommendations.push('High bottom-zone engagement - bottom-anchored CTAs recommended');
    } else if (zonePercentages.top > 50) {
      recommendations.push('Users focus on top area - ensure hero delivers value immediately');
    }
    
    if (bounceRate > 40) {
      recommendations.push('High bounce rate - simplify above-fold content');
    }
    
    if (ctaConversionRate < 20) {
      recommendations.push('Low CTA conversion - test different CTA copy/position');
    }

    if (bestPerformingVariant && bestPerformingVariant !== 'control') {
      recommendations.push(`A/B test suggests "${bestPerformingVariant}" variant performs best`);
    }

    return {
      totalSessions: sessions.length,
      avgTimeToFirstInteraction: Math.round(avgTimeToFirstInteraction),
      avgEngagementScore: Math.round(avgEngagementScore),
      avgScrollDepth: Math.round(avgScrollDepth),
      zonePercentages,
      bounceRate,
      ctaConversionRate,
      abVariantPerformance,
      recommendation: recommendations.join('. ') || 'Engagement metrics look healthy',
      bestPerformingVariant,
    };
  }, []);

  const refreshInsights = useCallback(async () => {
    setIsLoadingInsights(true);
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        const sessions: SessionAnalytics[] = JSON.parse(data);
        const newInsights = calculateInsights(sessions);
        setInsights(newInsights);
        console.log('[Analytics] Insights refreshed:', newInsights);
      }
    } catch (error) {
      console.error('[Analytics] Error refreshing insights:', error);
    } finally {
      setIsLoadingInsights(false);
    }
  }, [calculateInsights]);

  const getScreenInsights = useCallback(async (screenName: string): Promise<AnalyticsInsights | null> => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (!data) return null;

      const sessions: SessionAnalytics[] = JSON.parse(data);
      const screenSessions = sessions.filter(s => s.screenName === screenName);
      
      if (screenSessions.length === 0) return null;
      
      return calculateInsights(screenSessions);
    } catch (error) {
      console.error('[Analytics] Error getting screen insights:', error);
      return null;
    }
  }, [calculateInsights]);

  const exportAnalyticsData = useCallback(async (): Promise<SessionAnalytics[]> => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('[Analytics] Error exporting data:', error);
      return [];
    }
  }, []);

  const clearAllData = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      setInsights(null);
      console.log('[Analytics] All data cleared');
    } catch (error) {
      console.error('[Analytics] Error clearing data:', error);
    }
  }, []);

  const getABTestWinner = useCallback((): ABVariant | null => {
    if (!insights || !insights.bestPerformingVariant) return null;
    return insights.bestPerformingVariant as ABVariant;
  }, [insights]);

  useEffect(() => {
    loadABVariant();
  }, []);

  useEffect(() => {
    refreshInsights();
  }, [refreshInsights]);

  return {
    currentVariant,
    insights,
    isLoadingInsights,
    realtimeEngagement: {
      activeUsers: 1,
      avgSessionDuration: insights?.avgEngagementScore ? insights.avgEngagementScore * 100 : 0,
      topInteractedElements: [],
    },
    setABVariant,
    refreshInsights,
    getScreenInsights,
    exportAnalyticsData,
    clearAllData,
    getABTestWinner,
  };
});
