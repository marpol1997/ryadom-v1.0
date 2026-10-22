'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '@/lib/client/api';
import { initials, ROLE_LABEL } from '@/lib/client/format';
import { useApp } from './context';
import { IconArrow } from './icons';

function ProfileForm() {
  const { me, data, refresh, closeSheet, toast } = useApp();
  const [name, setName] = useState(me?.name ?? '');
  const [buildingId, setBuildingId] = useState(me?.buildingId ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.patch('/me', { name, buildingId });
      await refresh();
      closeSheet();
      toast('Профиль обновлён');
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <div className="field">
        <label htmlFor="me-name">Имя</label>
        <input
          id="me-name"
          className="input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          minLength={2}
          maxLength={60}
          required
        />
      </div>
      <div className="field">
        <label htmlFor="me-building">Мой дом или СНТ</label>
        <select
          id="me-building"
          className="input"
          value={buildingId}
          onChange={(event) => setBuildingId(event.target.value)}
        >
          {data.buildings.map((building) => (
            <option key={building.id} value={building.id}>
              {building.type === 'snt' ? '🌳 ' : '🏢 '}
              {building.title}
            </option>
          ))}
        </select>
        <div className="form-note">
          При смене адреса вы выйдете из чата старого дома и попадёте в чат нового.
        </div>
      </div>
      {error ? <div className="form-error show">{error}</div> : null}
      <div className="field">
        <button className="btn" type="submit" disabled={busy}>
          {busy ? 'Сохраняем…' : 'Сохранить'}
        </button>
      </div>
    </form>
  );
}

export default function ProfileScreen() {
  const { me, data, openAuth, openSheet, openChat, closeSheet, refresh, toast, go } = useApp();
  const [notifications, setNotifications] = useState(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('ryadom_notifications') !== 'off';
  });

  const building = me?.buildingId
    ? (data.buildings.find((item) => item.id === me.buildingId) ?? null)
    : null;
  const stats = data.stats ?? { requests: 0, open: 0, chats: 0, messages: 0 };

  async function logout() {
    try {
      await api.post('/auth/logout');
      await refresh();
      closeSheet();
      toast('Вы вышли из аккаунта');
      go('home');
    } catch (error) {
      toast((error as Error).message);
    }
  }

  return (
    <div className="wrap">
      {me ? (
        <div className="profile-hero">
          <div className="ph-top">
            <div className="ph-avatar" style={{ background: me.avatarColor }}>
              {initials(me.name)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="ph-name">{me.name}</div>
              <div className="ph-addr">
                {building ? `${building.title} · ${building.district} район` : 'Дом не выбран'}
              </div>
            </div>
          </div>
          <div className="ph-badge">✅ {ROLE_LABEL[me.role] ?? me.role} · аккаунт подтверждён</div>
          <div className="ph-stats">
            <div className="ph-stat">
              <b>{stats.requests}</b>
              <span>заявок</span>
            </div>
            <div className="ph-stat">
              <b>{stats.open}</b>
              <span>в работе</span>
            </div>
            <div className="ph-stat">
              <b>{stats.messages}</b>
              <span>сообщений</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="profile-hero" style={{ background: 'linear-gradient(135deg,#6366f1,#3730a3)' }}>
          <div className="ph-top">
            <div className="ph-avatar" style={{ fontSize: 24 }}>
              👋
            </div>
            <div style={{ flex: 1 }}>
              <div className="ph-name">Вы — гость</div>
              <div className="ph-addr">Зарегистрируйтесь, чтобы пользоваться всем</div>
            </div>
          </div>
          <div style={{ position: 'relative', marginTop: 14, fontSize: 12.5, lineHeight: 1.6, opacity: 0.92 }}>
            • чаты своего дома и СНТ
            <br />• заявки с фото и статусом
            <br />• помощь соседей на карте
          </div>
          <button
            className="btn"
            style={{ marginTop: 16, background: '#fff', color: '#4338ca', position: 'relative' }}
            onClick={() => openAuth('register')}
            type="button"
          >
            Создать аккаунт или войти
          </button>
        </div>
      )}

      <div className="section">
        <h2 className="section-title" style={{ marginBottom: 10 }}>
          Мой дом
        </h2>
        <div className="list single">
          {building ? (
            <button className="item" onClick={() => openChat(building)} type="button">
              <div className="item-ico">{building.type === 'snt' ? '🌳' : '🏢'}</div>
              <div className="item-body">
                <div className="item-t">
                  {building.title} <span className="badge">мой дом</span>
                </div>
                <div className="item-s">
                  {building.members} участников · {building.district} район
                </div>
              </div>
              <IconArrow className="chev" />
            </button>
          ) : (
            <div className="card pad hint" style={{ lineHeight: 1.55 }}>
              {me
                ? 'Дом не выбран — укажите его в настройках профиля.'
                : 'После регистрации здесь появится чат вашего дома или СНТ.'}
            </div>
          )}
        </div>
      </div>

      <div className="section">
        <h2 className="section-title" style={{ marginBottom: 10 }}>
          Аккаунт
        </h2>
        <div className="settings">
          {me ? (
            <>
              <button
                className="set-row"
                onClick={() => openSheet({ title: 'Имя и дом', node: <ProfileForm /> })}
                type="button"
              >
                <div className="set-ico">✏️</div>
                <div className="set-body">
                  <div className="set-t">Имя и дом</div>
                  <div className="set-s">
                    {me.name} · {building ? building.title : '—'}
                  </div>
                </div>
                <IconArrow className="chev" />
              </button>
              <div className="set-row">
                <div className="set-ico">🔑</div>
                <div className="set-body">
                  <div className="set-t">Логин</div>
                  <div className="set-s">{me.email ?? me.phone ?? '—'}</div>
                </div>
              </div>
              <button className="set-row" onClick={logout} type="button">
                <div className="set-ico">🚪</div>
                <div className="set-body">
                  <div className="set-t">Выйти из аккаунта</div>
                  <div className="set-s">Заявки и чаты останутся на сервере</div>
                </div>
              </button>
            </>
          ) : (
            <>
              <button className="set-row" onClick={() => openAuth('login')} type="button">
                <div className="set-ico">🔐</div>
                <div className="set-body">
                  <div className="set-t">Войти или зарегистрироваться</div>
                  <div className="set-s">Нужно для чатов и заявок</div>
                </div>
                <IconArrow className="chev" />
              </button>
              <button className="set-row" onClick={() => openAuth('register')} type="button">
                <div className="set-ico">✨</div>
                <div className="set-body">
                  <div className="set-t">Создать аккаунт</div>
                  <div className="set-s">Это займёт меньше минуты</div>
                </div>
                <IconArrow className="chev" />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="section">
        <h2 className="section-title" style={{ marginBottom: 10 }}>
          Настройки
        </h2>
        <div className="settings">
          <div className="set-row">
            <div className="set-ico">🔔</div>
            <div className="set-body">
              <div className="set-t">Уведомления</div>
              <div className="set-s">Отключения, ответы по заявкам</div>
            </div>
            <button
              className={`switch ${notifications ? 'on' : ''}`}
              aria-label="Уведомления"
              onClick={() => {
                const next = !notifications;
                setNotifications(next);
                try {
                  localStorage.setItem('ryadom_notifications', next ? 'on' : 'off');
                } catch {
                  /* приватный режим */
                }
                toast(next ? 'Уведомления включены' : 'Уведомления выключены');
              }}
              type="button"
            />
          </div>
          <button className="set-row" onClick={() => go('specialists')} type="button">
            <div className="set-ico">🚨</div>
            <div className="set-body">
              <div className="set-t">Экстренные службы</div>
              <div className="set-s">112, 101, 102, 103, 104</div>
            </div>
            <IconArrow className="chev" />
          </button>
          <button
            className="set-row"
            onClick={() =>
              openSheet({
                title: 'О приложении',
                node: (
                  <div>
                    <p style={{ marginTop: 0 }}>
                      «Рядом» — городской сервис для жителей Севастополя: чаты домов и СНТ, заявки с фото и
                      статусом, карта города, специалисты и участковые.
                    </p>
                    <div className="info-rows">
                      <div className="info-row">
                        <span className="info-label">Версия</span>
                        <span className="info-value">2.0</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">Город</span>
                        <span className="info-value">{data.city.name}</span>
                      </div>
                    </div>
                    <div className="form-note">
                      Часть справочных данных показана для примера. Сервис не является официальным порталом
                      органов власти.
                    </div>
                  </div>
                )
              })
            }
            type="button"
          >
            <div className="set-ico">ℹ️</div>
            <div className="set-body">
              <div className="set-t">О приложении</div>
              <div className="set-s">Рядом · Севастополь · v2.0</div>
            </div>
            <IconArrow className="chev" />
          </button>
        </div>
      </div>

      <div className="section center hint" style={{ lineHeight: 1.6, paddingBottom: 8 }}>
        Рядом · Севастополь · версия 2.0
        <br />
        Приложение работает в браузере и ставится на главный экран телефона.
      </div>
    </div>
  );
}
