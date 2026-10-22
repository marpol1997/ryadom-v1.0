'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '@/lib/client/api';
import { useApp } from './context';
import { IconCamera, IconLocate } from './icons';

const MAX_BYTES = 3 * 1024 * 1024;

export default function RequestForm({ defaultCategory }: { defaultCategory?: string }) {
  const { data, closeSheet, refresh, toast } = useApp();
  const [categoryId, setCategoryId] = useState(defaultCategory ?? data.categories[0]?.id ?? '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function pickFile(next: File | null) {
    if (!next) {
      setFile(null);
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(next.type)) {
      setError('Фото должно быть JPEG, PNG или WebP');
      return;
    }
    if (next.size > MAX_BYTES) {
      setError('Фото больше 3 МБ — сделайте поменьше');
      return;
    }
    setError(null);
    setFile(next);
  }

  function locate() {
    if (!navigator.geolocation) {
      toast('Геолокация недоступна');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
        toast('Точка на карте отмечена');
      },
      () => toast('Не удалось определить местоположение'),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set('categoryId', categoryId);
      form.set('title', title);
      form.set('description', description);
      form.set('address', address);
      if (coords) {
        form.set('lat', String(coords.lat));
        form.set('lng', String(coords.lng));
      }
      if (file) form.set('photo', file);

      await api.post('/requests', form);
      await refresh();
      closeSheet();
      toast('Заявка отправлена — следите за статусом');
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <div className="field">
        <label>Что случилось</label>
        <div className="chips" style={{ flexWrap: 'wrap', overflow: 'visible' }}>
          {data.categories.map((category) => (
            <button
              key={category.id}
              type="button"
              className={`chip ${categoryId === category.id ? 'active' : ''}`}
              onClick={() => setCategoryId(category.id)}
            >
              {category.icon} {category.title}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label htmlFor="req-title">Коротко о проблеме</label>
        <input
          id="req-title"
          className="input"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Протечка в подвале"
          required
          minLength={3}
          maxLength={120}
        />
      </div>

      <div className="field">
        <label htmlFor="req-address">Адрес</label>
        <input
          id="req-address"
          className="input"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          placeholder="ул. Большая Морская, 12, подъезд 2"
          required
          maxLength={200}
        />
      </div>

      <div className="field">
        <label htmlFor="req-description">Подробности</label>
        <textarea
          id="req-description"
          className="input"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={4}
          maxLength={2000}
          placeholder="Что именно произошло, когда началось, что уже делали"
        />
      </div>

      <div className="field">
        <label>Фото и точка на карте</label>
        <div className="btn-row">
          <label className="btn outline" style={{ cursor: 'pointer', margin: 0 }}>
            <IconCamera style={{ width: 18, height: 18 }} />
            {file ? 'Другое фото' : 'Прикрепить фото'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => pickFile(event.target.files?.[0] ?? null)}
              style={{ display: 'none' }}
            />
          </label>
          <button className="btn outline" type="button" onClick={locate}>
            <IconLocate style={{ width: 18, height: 18 }} />
            {coords ? 'Точка отмечена' : 'Моя точка'}
          </button>
        </div>
        {preview ? (
          <img
            src={preview}
            alt="Фото заявки"
            style={{ marginTop: 10, borderRadius: 14, maxHeight: 180, objectFit: 'cover', width: '100%' }}
          />
        ) : null}
        <div className="form-note">Фото до 3 МБ, JPEG/PNG/WebP. Без фото заявку тоже примут.</div>
      </div>

      {error ? <div className="form-error show">{error}</div> : null}

      <div className="field">
        <button className="btn" type="submit" disabled={busy}>
          {busy ? 'Отправляем…' : 'Отправить заявку'}
        </button>
      </div>
    </form>
  );
}
