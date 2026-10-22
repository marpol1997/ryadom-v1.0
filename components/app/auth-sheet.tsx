'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '@/lib/client/api';
import type { Building, Me } from '@/lib/types';

type Mode = 'login' | 'register';

export default function AuthSheet({
  mode: initialMode,
  buildings,
  onClose,
  onDone
}: {
  mode: Mode;
  buildings: Building[];
  onClose: () => void;
  onDone: (user: Me) => void;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState('');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [buildingId, setBuildingId] = useState(buildings[0]?.id ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result =
        mode === 'login'
          ? await api.post<{ user: Me }>('/auth/login', { login, password })
          : await api.post<{ user: Me }>('/auth/register', { name, login, password, buildingId });
      onDone(result.user);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="sheet-back open"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Вход в Рядом">
        <div className="sheet-head">
          <div className="sheet-title">{mode === 'login' ? 'Вход' : 'Регистрация'}</div>
          <button className="sheet-close" onClick={onClose} aria-label="Закрыть" type="button">
            ✕
          </button>
        </div>

        <div className="sheet-body">
          <div className="auth-tabs">
            <button
              type="button"
              className={mode === 'login' ? 'active' : ''}
              onClick={() => {
                setMode('login');
                setError(null);
              }}
            >
              Войти
            </button>
            <button
              type="button"
              className={mode === 'register' ? 'active' : ''}
              onClick={() => {
                setMode('register');
                setError(null);
              }}
            >
              Создать аккаунт
            </button>
          </div>

          <form onSubmit={submit}>
            {mode === 'register' ? (
              <div className="field">
                <label htmlFor="auth-name">Имя</label>
                <input
                  id="auth-name"
                  className="input"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Как к вам обращаться"
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={60}
                />
              </div>
            ) : null}

            <div className="field">
              <label htmlFor="auth-login">E-mail или телефон</label>
              <input
                id="auth-login"
                className="input"
                value={login}
                onChange={(event) => setLogin(event.target.value)}
                placeholder="you@example.com или +7 978 000-00-00"
                autoComplete="username"
                inputMode="email"
                required
              />
            </div>

            <div className="field">
              <label htmlFor="auth-password">Пароль</label>
              <input
                id="auth-password"
                className="input"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={mode === 'register' ? 'Минимум 8 символов' : 'Ваш пароль'}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                required
                minLength={mode === 'register' ? 8 : 1}
                maxLength={200}
              />
            </div>

            {mode === 'register' ? (
              <div className="field">
                <label htmlFor="auth-building">Мой дом или СНТ</label>
                <select
                  id="auth-building"
                  className="input"
                  value={buildingId}
                  onChange={(event) => setBuildingId(event.target.value)}
                  required
                >
                  {buildings.map((building) => (
                    <option key={building.id} value={building.id}>
                      {building.type === 'snt' ? '🌳 ' : '🏢 '}
                      {building.title}
                    </option>
                  ))}
                </select>
                <div className="form-note">
                  Чат вашего дома увидят только его жители. Адрес можно поменять в профиле.
                </div>
              </div>
            ) : null}

            {error ? <div className="form-error show">{error}</div> : null}

            <div className="field">
              <button className="btn" type="submit" disabled={busy}>
                {busy ? 'Отправляем…' : mode === 'login' ? 'Войти' : 'Создать аккаунт'}
              </button>
            </div>

            <div className="form-note">
              Регистрация без Госуслуг: достаточно e-mail или телефона. Пароль хранится только в виде хеша.
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
