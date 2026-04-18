'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { GpsKalmanFilter, haversineMeters } from '@plogg/core';
import type { GpsFix, LngLat } from '@plogg/core';

const MAX_ACCEPTABLE_ACCURACY_M = 50;

interface RouteSessionState {
  isActive: boolean;
  routeId: string | null;
  distanceM: number;
  durationSeconds: number;
  itemCount: number;
  getWaypoints: () => LngLat[];
  startSession: (routeId: string) => void;
  endSession: () => void;
  addWaypoint: (fix: GpsFix) => LngLat | null;
  incrementItemCount: () => void;
}

const RouteSessionContext = createContext<RouteSessionState | null>(null);

export function RouteSessionProvider({ children }: { children: ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [routeId, setRouteId] = useState<string | null>(null);
  const [distanceM, setDistanceM] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [itemCount, setItemCount] = useState(0);

  const waypointsRef = useRef<LngLat[]>([]);
  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const kalmanRef = useRef<GpsKalmanFilter>(new GpsKalmanFilter());

  const startSession = useCallback((id: string) => {
    waypointsRef.current = [];
    kalmanRef.current.reset();
    startTimeRef.current = Date.now();
    setRouteId(id);
    setDistanceM(0);
    setDurationSeconds(0);
    setItemCount(0);
    setIsActive(true);

    timerRef.current = setInterval(() => {
      if (startTimeRef.current == null) return;
      setDurationSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
  }, []);

  const endSession = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    startTimeRef.current = null;
    waypointsRef.current = [];
    setIsActive(false);
    setRouteId(null);
    setDistanceM(0);
    setDurationSeconds(0);
    setItemCount(0);
  }, []);

  const addWaypoint = useCallback((fix: GpsFix): LngLat | null => {
    if (fix.accuracy > MAX_ACCEPTABLE_ACCURACY_M) return null;
    const smoothed = kalmanRef.current.update(fix);
    const prev = waypointsRef.current.at(-1);
    if (prev) {
      const delta = haversineMeters(prev, smoothed);
      if (delta < 3) return null;
      setDistanceM((d) => d + delta);
    }
    waypointsRef.current.push(smoothed);
    return smoothed;
  }, []);

  const incrementItemCount = useCallback(() => {
    setItemCount((c) => c + 1);
  }, []);

  const getWaypoints = useCallback(() => waypointsRef.current.slice(), []);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  return (
    <RouteSessionContext.Provider
      value={{
        isActive,
        routeId,
        distanceM,
        durationSeconds,
        itemCount,
        getWaypoints,
        startSession,
        endSession,
        addWaypoint,
        incrementItemCount,
      }}
    >
      {children}
    </RouteSessionContext.Provider>
  );
}

export function useRouteSession(): RouteSessionState {
  const ctx = useContext(RouteSessionContext);
  if (!ctx) throw new Error('useRouteSession must be used within RouteSessionProvider');
  return ctx;
}
