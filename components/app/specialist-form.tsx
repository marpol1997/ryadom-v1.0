'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '@/lib/client/api';
import { useApp } from './context';

const ROLES = [
  { id: 'plumber', label: 'Сантехник' },
  { id: 'electrician', label: 'Электрик' },
  { id: 'repair', label: 'Ремонт' },
  { id: 'cleaning', label: 'Уборка' },
  { id: 'tech', label: 'Техника' },
  { id: 'handyman', label: 'Мастер на час' }
];

export default function SpecialistForm() {
  const { closeSheet, refresh, toast } = useApp();
  const [name, setName] = useState('');
  const [role, setRole] = useState('plumber');
  const [about, setAbout] = useState('');
  const [phone, setPhone] = useState('');
  const [hours, setHours] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post('/specialists', { name, role, about, phone, hours });
      await refresh();
      closeSheet();
      toast('Профиль добавлен — он появится в списке');
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <div className="field">
        <label htmlFor="spec-name">Имя или название</label>
        <input
          id="spec-name"
          className="input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Сергей, сантехник"
          required
          minLength={2}
          maxLength={60}
        />
      </div>

      <div className="field">
        <label>Специальность</label>
        <select className="input" value={role} onChange={(event) => setRole(event.target.value)}>
          {ROLES.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="spec-phone">Телефон</label>
        <input
          id="spec-phone"
          className="input"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="+7 978 000-00-00"
          inputMode="tel"
          required
        />
      </div>

      <div className="field">
        <label htmlFor="spec-hours">Часы работы</label>
        <input
          id="spec-hours"
          className="input"
          value={hours}
          onChange={(event) => setHours(event.target.value)}
          placeholder="круглосуточно / пн–сб 9:00–19:00"
          maxLength={80}
        />
      </div>

      <div className="field">
        <label htmlFor="spec-about">О себе</label>
        <textarea
          id="spec-about"
          className="input"
          value={about}
          onChange={(event) => setAbout(event.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="Что делаете, район выезда, опыт"
        />
      </div>

      {error ? <div className="form-error show">{error}</div> : null}

      <div className="field">
        <button className="btn" type="submit" disabled={busy}>
          {busy ? 'Сохраняем…' : 'Добавить профиль'}
        </button>
      </div>

      <div className="form-note">
        Профиль проверяет модератор — до проверки рядом с именем нет отметки «проверен».
      </div>
    </form>
  );
}
