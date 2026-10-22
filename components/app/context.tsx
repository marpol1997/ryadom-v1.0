'use client';

/** Контекст приложения: одна точка доступа к данным и действиям экранов. */
import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { BootstrapData, Building, Me } from '@/lib/types';

export type Screen = 'home' | 'map' | 'chats' | 'specialists' | 'profile';
export type LatLng = { lat: number; lng: number };

export interface SheetState {
  title: string;
  node: ReactNode;
  foot?: ReactNode;
}

export interface AppApi {
  data: BootstrapData;
  me: Me | null;
  coords: LatLng | null;
  seen: Record<string, number>;
  markSeen(buildingId: string, count: number): void;
  screen: Screen;
  go(screen: Screen): void;
  toast(text: string): void;
  refresh(): Promise<void>;
  openAuth(mode: 'login' | 'register'): void;
  openSheet(sheet: SheetState): void;
  closeSheet(): void;
  openChat(building: Building): void;
  closeChat(): void;
  chat: Building | null;
  startRequest(categoryId?: string): void;
  openRequest(id: string): void;
  requestLocation(): void;
}

export const AppContext = createContext<AppApi | null>(null);

export function useApp(): AppApi {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp вне AppProvider');
  return ctx;
}
