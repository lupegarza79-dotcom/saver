import { useRef, useCallback, useEffect, useState } from 'react';
import { Dimensions, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface TouchPoint {
  x: number;
  y: number;
  timestamp: number;
  element?: string;
  zone: 'top' | 'center' | 'bottom';
}

export interface ScrollData {
  depth: number;
  maxDepth: number;
  direction: 'up' | 'down' | 'none';
  velocity: number;
}

export interface EngagementMetrics {
  timeToFirstInteraction: number | null;
  totalDwellTime: number;
  scrollDepthPercent: number;
  touchCount: number;
  bounceRisk: 'low' | 'medium' | 'high';
  engagementScore: number;
  hotZone: 'top' | 'center' | 'bottom';
  primaryCTAClicked: boolean;
  secondsBeforeScroll: number | null;
}

export interface HeatmapData {
  zones: {
    top: number;
    center: number;
    bottom: number;
  };
  hotspots: { x: number; y: number; intensity: number }[];
}

export interface SessionAnalytics {
  sessionId: string;
  screenName: string;
  startTime: number;
  endTime?: number;
  touches: TouchPoint[];
  scrollData: ScrollData;
  metrics: EngagementMetrics;
  heatmap: HeatmapData;
  deviceInfo: {
    platform: string;
    screenWidth: number;
    screenHeight: number;
  };
  abVariant?: string;
}

const STORAGE_KEY = 'saver_analytics_sessions';
const BOUNCE_THRESHOLD_MS = 3000;
const ENGAGEMENT_THRESHOLD_MS = 10000;

export function useAnalytics(screenName: string, abVariant?: string) {
  const sessionRef = useRef<SessionAnalytics>({
    sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    screenName,
    startTime: Date.now(),
    touches: [],
    scrollData: { depth: 0, maxDepth: 0, direction: 'none', velocity: 0 },
    metrics: {
      timeToFirstInteraction: null,
      totalDwellTime: 0,
      scrollDepthPercent: 0,
      touchCount: 0,
      bounceRisk: 'high',
      engagementScore: 0,
      hotZone: 'center',
      primaryCTAClicked: false,
      secondsBeforeScroll: null,
    },
    heatmap: {
      zones: { top: 0, center: 0, bottom: 0 },
      hotspots: [],
    },
    deviceInfo: {
      platform: Platform.OS,
      screenWidth: SCREEN_WIDTH,
      screenHeight: SCREEN_HEIGHT,
    },
    abVariant,
  });

  const [metrics, setMetrics] = useState<EngagementMetrics>(sessionRef.current.metrics);
  const [heatmap, setHeatmap] = useState<HeatmapData>(sessionRef.current.heatmap);
  const startTimeRef = useRef(Date.now());
  const lastScrollTimeRef = useRef<number | null>(null);
  const firstScrollTimeRef = useRef<number | null>(null);

  const getZone = useCallback((y: number): 'top' | 'center' | 'bottom' => {
    const thirdHeight = SCREEN_HEIGHT / 3;
    if (y < thirdHeight) return 'top';
    if (y < thirdHeight * 2) return 'center';
    return 'bottom';
  }, []);

  const calculateEngagementScore = useCallback((): number => {
    const session = sessionRef.current;
    let score = 0;

    const dwellTime = Date.now() - startTimeRef.current;
    if (dwellTime > 1000) score += Math.min(20, dwellTime / 1000);
    if (dwellTime > 5000) score += 10;
    if (dwellTime > 10000) score += 15;

    score += Math.min(20, session.touches.length * 2);

    score += Math.min(20, session.scrollData.maxDepth * 20);

    if (session.metrics.primaryCTAClicked) score += 25;

    if (session.metrics.timeToFirstInteraction && session.metrics.timeToFirstInteraction < 3000) {
      score += 10;
    }

    return Math.min(100, Math.round(score));
  }, []);

  const calculateBounceRisk = useCallback((): 'low' | 'medium' | 'high' => {
    const dwellTime = Date.now() - startTimeRef.current;
    const session = sessionRef.current;

    if (dwellTime < BOUNCE_THRESHOLD_MS && session.touches.length < 2) {
      return 'high';
    }
    if (dwellTime < ENGAGEMENT_THRESHOLD_MS && session.scrollData.maxDepth < 0.3) {
      return 'medium';
    }
    return 'low';
  }, []);

  const getHotZone = useCallback((): 'top' | 'center' | 'bottom' => {
    const zones = sessionRef.current.heatmap.zones;
    if (zones.bottom >= zones.center && zones.bottom >= zones.top) return 'bottom';
    if (zones.center >= zones.top) return 'center';
    return 'top';
  }, []);

  const updateMetrics = useCallback(() => {
    const session = sessionRef.current;
    const newMetrics: EngagementMetrics = {
      ...session.metrics,
      totalDwellTime: Date.now() - startTimeRef.current,
      engagementScore: calculateEngagementScore(),
      bounceRisk: calculateBounceRisk(),
      hotZone: getHotZone(),
      scrollDepthPercent: Math.round(session.scrollData.maxDepth * 100),
    };
    session.metrics = newMetrics;
    setMetrics(newMetrics);
  }, [calculateEngagementScore, calculateBounceRisk, getHotZone]);

  const trackTouch = useCallback((x: number, y: number, element?: string) => {
    const session = sessionRef.current;
    const now = Date.now();
    const zone = getZone(y);

    const touch: TouchPoint = {
      x: x / SCREEN_WIDTH,
      y: y / SCREEN_HEIGHT,
      timestamp: now,
      element,
      zone,
    };

    session.touches.push(touch);

    if (session.metrics.timeToFirstInteraction === null) {
      session.metrics.timeToFirstInteraction = now - startTimeRef.current;
      console.log(`[Analytics] First interaction: ${session.metrics.timeToFirstInteraction}ms`);
    }

    session.metrics.touchCount++;

    session.heatmap.zones[zone]++;

    const existingHotspot = session.heatmap.hotspots.find(
      h => Math.abs(h.x - touch.x) < 0.1 && Math.abs(h.y - touch.y) < 0.1
    );
    if (existingHotspot) {
      existingHotspot.intensity++;
    } else {
      session.heatmap.hotspots.push({ x: touch.x, y: touch.y, intensity: 1 });
    }

    setHeatmap({ ...session.heatmap });
    updateMetrics();

    console.log(`[Analytics] Touch at zone: ${zone}, element: ${element || 'unknown'}`);
  }, [getZone, updateMetrics]);

  const trackScroll = useCallback((scrollY: number, contentHeight: number, viewportHeight: number) => {
    const session = sessionRef.current;
    const now = Date.now();

    const maxScrollable = Math.max(1, contentHeight - viewportHeight);
    const scrollDepth = Math.min(1, scrollY / maxScrollable);

    if (firstScrollTimeRef.current === null && scrollY > 10) {
      firstScrollTimeRef.current = now;
      session.metrics.secondsBeforeScroll = (now - startTimeRef.current) / 1000;
      console.log(`[Analytics] First scroll after ${session.metrics.secondsBeforeScroll}s`);
    }

    const lastScrollTime = lastScrollTimeRef.current || now;
    const timeDelta = now - lastScrollTime;
    const scrollDelta = scrollDepth - session.scrollData.depth;
    const velocity = timeDelta > 0 ? Math.abs(scrollDelta) / timeDelta * 1000 : 0;

    session.scrollData = {
      depth: scrollDepth,
      maxDepth: Math.max(session.scrollData.maxDepth, scrollDepth),
      direction: scrollDelta > 0 ? 'down' : scrollDelta < 0 ? 'up' : 'none',
      velocity,
    };

    lastScrollTimeRef.current = now;
    updateMetrics();
  }, [updateMetrics]);

  const trackCTAClick = useCallback((ctaName: string) => {
    const session = sessionRef.current;
    session.metrics.primaryCTAClicked = true;
    trackTouch(SCREEN_WIDTH / 2, SCREEN_HEIGHT * 0.7, ctaName);
    console.log(`[Analytics] CTA clicked: ${ctaName}`);
  }, [trackTouch]);

  const trackElementView = useCallback((elementName: string, isVisible: boolean) => {
    if (isVisible) {
      console.log(`[Analytics] Element visible: ${elementName}`);
    }
  }, []);

  const saveSession = useCallback(async () => {
    try {
      const session = sessionRef.current;
      session.endTime = Date.now();
      updateMetrics();

      const existingSessions = await AsyncStorage.getItem(STORAGE_KEY);
      const sessions: SessionAnalytics[] = existingSessions ? JSON.parse(existingSessions) : [];
      
      sessions.push(session);
      
      const recentSessions = sessions.slice(-50);
      
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(recentSessions));
      console.log(`[Analytics] Session saved: ${session.sessionId}`);
      console.log(`[Analytics] Final metrics:`, session.metrics);
    } catch (error) {
      console.error('[Analytics] Error saving session:', error);
    }
  }, [updateMetrics]);

  const getAggregatedInsights = useCallback(async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (!data) return null;

      const sessions: SessionAnalytics[] = JSON.parse(data);
      const screenSessions = sessions.filter(s => s.screenName === screenName);

      if (screenSessions.length === 0) return null;

      const avgTimeToFirstInteraction = screenSessions
        .filter(s => s.metrics.timeToFirstInteraction !== null)
        .reduce((sum, s) => sum + (s.metrics.timeToFirstInteraction || 0), 0) / screenSessions.length;

      const avgEngagementScore = screenSessions
        .reduce((sum, s) => sum + s.metrics.engagementScore, 0) / screenSessions.length;

      const avgScrollDepth = screenSessions
        .reduce((sum, s) => sum + s.metrics.scrollDepthPercent, 0) / screenSessions.length;

      const zoneBreakdown = { top: 0, center: 0, bottom: 0 };
      screenSessions.forEach(s => {
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

      const bounceRate = screenSessions.filter(s => s.metrics.bounceRisk === 'high').length / screenSessions.length;

      const ctaConversionRate = screenSessions.filter(s => s.metrics.primaryCTAClicked).length / screenSessions.length;

      const abVariantPerformance: Record<string, { sessions: number; avgScore: number; ctaRate: number }> = {};
      screenSessions.forEach(s => {
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

      return {
        totalSessions: screenSessions.length,
        avgTimeToFirstInteraction: Math.round(avgTimeToFirstInteraction),
        avgEngagementScore: Math.round(avgEngagementScore),
        avgScrollDepth: Math.round(avgScrollDepth),
        zonePercentages,
        bounceRate: Math.round(bounceRate * 100),
        ctaConversionRate: Math.round(ctaConversionRate * 100),
        abVariantPerformance,
        recommendation: getRecommendation(zonePercentages, avgEngagementScore, bounceRate),
      };
    } catch (error) {
      console.error('[Analytics] Error getting insights:', error);
      return null;
    }
  }, [screenName]);

  const getRecommendation = (
    zones: { top: number; center: number; bottom: number },
    avgScore: number,
    bounceRate: number
  ): string => {
    const recommendations: string[] = [];

    if (zones.bottom > zones.top + zones.center) {
      recommendations.push('Users engage most with bottom content - consider bottom-anchored CTAs');
    } else if (zones.top > zones.center + zones.bottom) {
      recommendations.push('Users focus on top area - ensure key value prop is above fold');
    }

    if (bounceRate > 0.5) {
      recommendations.push('High bounce rate detected - simplify initial view and make CTA more prominent');
    }

    if (avgScore < 40) {
      recommendations.push('Low engagement - consider adding micro-interactions or visual hierarchy');
    }

    return recommendations.join('. ') || 'Engagement looks healthy - continue monitoring';
  };

  useEffect(() => {
    const interval = setInterval(updateMetrics, 1000);
    return () => {
      clearInterval(interval);
      saveSession();
    };
  }, [updateMetrics, saveSession]);

  return {
    metrics,
    heatmap,
    trackTouch,
    trackScroll,
    trackCTAClick,
    trackElementView,
    getAggregatedInsights,
    sessionId: sessionRef.current.sessionId,
  };
}

export async function clearAnalyticsData() {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
    console.log('[Analytics] Data cleared');
  } catch (error) {
    console.error('[Analytics] Error clearing data:', error);
  }
}
