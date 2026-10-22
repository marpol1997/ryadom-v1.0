'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/client/api';
import { fmtAgo, initials } from '@/lib/client/format';
import type { BootstrapData, Building, Me } from '@/lib/types';
import AuthSheet from './auth-sheet';
import ChatDialog from './chat-dialog';
import ChatsScreen from './chats-screen';
import { AppContext } from './context';
import type { AppApi, LatLng, Screen, SheetState } from './context';
import HomeScreen from './home-screen';
import { IconBell, IconChats, IconHome, IconMap, IconTools, IconUser } from './icons';
import MapScreen from './map-screen';
import ProfileScreen from './profile-screen';
import RequestDetail from './request-detail';
import RequestForm from './request-form';
import Sheet from './sheet';
import SpecialistsScreen from './specialists-screen';
import Toast from './toast';

const SEEN_KEY = 'ryadom_seen_v2';
const FEED_SEEN_KEY = 'ryadom_feed_seen';

const TABS: Array<{ id: Screen; label: string; Icon: typeof IconHome }> = [
  { id: 'home', label: 'Главная', Icon: IconHome },
  { id: 'map', label: 'Карта', Icon: IconMap },
  { id: 'chats', label: 'Чаты', Icon: IconChats },
  { id: 'specialists', label: 'Мастера', Icon: IconTools },
  { id: 'profile', label: 'Профиль', Icon: IconUser }
];

export default function AppShell() {
  const [data, setData] = useState<BootstrapData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [screen, setScreen] = useState<Screen>('home');
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [chat, setChat] = useState<Building | null>(null);
  const [auth, setAuth] = useState<'login' | 'register' | null>(null);
  const [toastText, setToastText] = useState<string | null>(null);
  const [seen, setSeen] = useState<Record<string, number>>({});
  const [feedSeen, setFeedSeen] = useState<string | null>(null);
  const [coords, setCoords] = useState<LatLng | null>(null);
  const toastTimer = useRef<number | null>(null);

  const toast = useCallback((text: string) => {
    setToastText(text);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastText(null), 3000);
  }, []);

  const refresh = useCallback(async () => {
    const next = await api.get<BootstrapData>('/bootstrap');
    setData(next);
  }, []);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const next = await api.get<BootstrapData>('/bootstrap');
        if (alive) setData(next);
      } catch (caught) {
        if (alive) setError((caught as Error).message);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SEEN_KEY);
      if (raw) setSeen(JSON.parse(raw) as Record<string, number>);
      setFeedSeen(localStorage.getItem(FEED_SEEN_KEY));
    } catch {
      /* приватный режим — просто без счётчиков */
    }
  }, []);

  const markSeen = useCallback((buildingId: string, count: number) => {
    setSeen((previous) => {
      if ((previous[buildingId] ?? 0) >= count) return previous;
      const next = { ...previous, [buildingId]: count };
      try {
        localStorage.setItem(SEEN_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast('Геолокация недоступна в этом браузере');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
        toast('Местоположение определено');
      },
      () => toast('Не удалось определить местоположение'),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, [toast]);

  const me: Me | null = data?.me ?? null;

  const openRequest = useCallback((id: string) => {
    setSheet({ title: 'Заявка', node: <RequestDetail id={id} /> });
  }, []);

  const startRequest = useCallback(
    (categoryId?: string) => {
      if (!me) {
        setAuth('login');
        return;
      }
      setSheet({ title: 'Новая заявка', node: <RequestForm defaultCategory={categoryId} /> });
    },
    [me]
  );

  const openChat = useCallback(
    (building: Building) => {
      if (!me) {
        setAuth('login');
        return;
      }
      setChat(building);
    },
    [me]
  );

  const openNotifications = useCallback(() => {
    if (!data) return;
    const now = new Date().toISOString();
    setFeedSeen(now);
    try {
      localStorage.setItem(FEED_SEEN_KEY, now);
    } catch {
      /* ignore */
    }
    setSheet({
      title: 'Уведомления',
      node: (
        <div className="list">
          {data.feed.map((item) => (
            <div className="item" key={item.id} style={{ alignItems: 'flex-start', cursor: 'default' }}>
              <div
                className={`item-ico ${item.tone === 'danger' ? 'red' : item.tone === 'warn' ? 'amber' : ''}`}
              >
                {item.icon}
              </div>
              <div className="item-body">
                <div className="item-t">{item.title}</div>
                <div className="item-s clamp2">{item.body}</div>
                <div className="hint" style={{ marginTop: 4 }}>
                  {fmtAgo(item.createdAt)} · {item.tag || 'город'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )
    });
  }, [data]);

  const unreadTotal = useMemo(() => {
    if (!data) return 0;
    return data.buildings.reduce(
      (sum, building) =>
        sum + (building.joined ? Math.max(0, building.messages - (seen[building.id] ?? 0)) : 0),
      0
    );
  }, [data, seen]);

  const hasNews = useMemo(() => {
    if (!data || !data.feed[0]) return false;
    if (!feedSeen) return true;
    const latest = data.feed[0].createdAt;
    return latest > feedSeen;
  }, [data, feedSeen]);

  if (error) {
    return (
      <div className="wrap" style={{ paddingTop: 60, textAlign: 'center' }}>
        <div style={{ fontSize: 40 }}>🛠️</div>
        <h1 style={{ fontSize: 22, marginTop: 12 }}>Не удалось загрузить город</h1>
        <p className="hint" style={{ marginTop: 8 }}>
          {error}
        </p>
        <button className="btn" style={{ marginTop: 18 }} onClick={() => window.location.reload()} type="button">
          Попробовать снова
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="wrap" style={{ paddingTop: 80, textAlign: 'center' }}>
        <div className="hint">Загружаем город…</div>
      </div>
    );
  }

  const appApi: AppApi = {
    data,
    me,
    coords,
    seen,
    markSeen,
    screen,
    go: setScreen,
    toast,
    refresh,
    openAuth: setAuth,
    openSheet: setSheet,
    closeSheet: () => setSheet(null),
    openChat,
    closeChat: () => setChat(null),
    chat,
    startRequest,
    openRequest,
    requestLocation
  };

  return (
    <AppContext.Provider value={appApi}>
      <div className="app">
        <aside className="rail">
          <div className="rail-brand">
            <div className="logo-mark">
              <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} aria-hidden="true">
                <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z" />
                <circle cx="12" cy="10" r="2.4" />
              </svg>
            </div>
            <div>
              <div className="brand-name">Рядом</div>
              <div className="brand-city">{data.city.name}</div>
            </div>
          </div>

          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`rail-item ${screen === tab.id ? 'active' : ''}`}
              onClick={() => setScreen(tab.id)}
              type="button"
            >
              <tab.Icon />
              {tab.label}
            </button>
          ))}

          <div className="rail-foot">
            Городской сервис для жителей
            <br />
            {data.city.name} · v2.0
          </div>
        </aside>

        <div className="main">
          <header className="topbar">
            <div className="brand-mini">
              <div className="logo-mark">
                <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} aria-hidden="true">
                  <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z" />
                  <circle cx="12" cy="10" r="2.4" />
                </svg>
              </div>
              <div>
                <div className="brand-name">Рядом</div>
                <div className="brand-city">{data.city.name}</div>
              </div>
            </div>
            <div className="top-actions">
              <button className="icon-btn" onClick={openNotifications} aria-label="Уведомления" type="button">
                <IconBell />
                {hasNews ? <span className="dot" /> : null}
              </button>
              <button
                className="avatar-btn"
                style={{ background: me?.avatarColor ?? '#94a3b8' }}
                onClick={() => setScreen('profile')}
                aria-label="Профиль"
                type="button"
              >
                {me ? initials(me.name) : '?'}
              </button>
            </div>
          </header>

          <div className="screens">
            <section className={`screen ${screen === 'home' ? 'active' : ''}`}>
              {screen === 'home' ? <HomeScreen /> : null}
            </section>
            <section className={`screen map-screen ${screen === 'map' ? 'active' : ''}`}>
              {screen === 'map' ? <MapScreen /> : null}
            </section>
            <section className={`screen ${screen === 'chats' ? 'active' : ''}`}>
              {screen === 'chats' ? <ChatsScreen /> : null}
            </section>
            <section className={`screen ${screen === 'specialists' ? 'active' : ''}`}>
              {screen === 'specialists' ? <SpecialistsScreen /> : null}
            </section>
            <section className={`screen ${screen === 'profile' ? 'active' : ''}`}>
              {screen === 'profile' ? <ProfileScreen /> : null}
            </section>
          </div>

          <nav className="tabbar">
            <div className="tabbar-inner">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  className={`tab ${screen === tab.id ? 'active' : ''}`}
                  onClick={() => setScreen(tab.id)}
                  type="button"
                >
                  <tab.Icon />
                  {tab.label}
                  {tab.id === 'chats' && unreadTotal > 0 ? (
                    <span className="nav-badge">{unreadTotal > 9 ? '9+' : unreadTotal}</span>
                  ) : null}
                </button>
              ))}
            </div>
          </nav>
        </div>
      </div>

      {chat ? <ChatDialog building={chat} onClose={() => setChat(null)} /> : null}

      {sheet ? (
        <Sheet title={sheet.title} node={sheet.node} foot={sheet.foot} onClose={() => setSheet(null)} />
      ) : null}

      {auth ? (
        <AuthSheet
          mode={auth}
          buildings={data.buildings}
          onClose={() => setAuth(null)}
          onDone={async (user) => {
            setAuth(null);
            await refresh();
            toast(`Здравствуйте, ${user.name.split(' ')[0]}`);
          }}
        />
      ) : null}

      <Toast text={toastText} />
    </AppContext.Provider>
  );
}
