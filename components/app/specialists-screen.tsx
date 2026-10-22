'use client';

import { useState } from 'react';
import { useApp } from './context';
import SpecialistForm from './specialist-form';

const ROLE_LABEL: Record<string, string> = {
  plumber: 'Сантехник',
  electrician: 'Электрик',
  repair: 'Ремонт',
  cleaning: 'Уборка',
  tech: 'Техника',
  handyman: 'Мастер'
};

const EMERGENCY = [
  { icon: '🚨', title: 'Единая служба спасения', phone: '112', note: 'Круглосуточно, бесплатно' },
  { icon: '🚒', title: 'Пожарная охрана', phone: '101', note: 'Возгорания, задымление' },
  { icon: '🚓', title: 'Полиция', phone: '102', note: 'Правонарушения' },
  { icon: '🚑', title: 'Скорая помощь', phone: '103', note: 'Медицинская помощь' },
  { icon: '🔥', title: 'Газовая служба', phone: '104', note: 'Запах газа — сразу' }
];

export default function SpecialistsScreen() {
  const { data, openSheet, me, openAuth, toast } = useApp();
  const [filter, setFilter] = useState('all');

  const roles = Array.from(new Set(data.specialists.map((item) => item.role)));
  const list =
    filter === 'all' ? data.specialists : data.specialists.filter((item) => item.role === filter);

  function addProfile() {
    if (!me) {
      openAuth('register');
      return;
    }
    openSheet({ title: 'Профиль мастера', node: <SpecialistForm /> });
  }

  return (
    <div className="wrap">
      <div className="hello">
        <h1>Специалисты</h1>
        <p>Проверенные мастера и службы Севастополя</p>
      </div>

      <div className="chips" style={{ marginTop: 12 }}>
        <button
          className={`chip ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
          type="button"
        >
          Все
        </button>
        {roles.map((role) => (
          <button
            key={role}
            className={`chip ${filter === role ? 'active' : ''}`}
            onClick={() => setFilter(role)}
            type="button"
          >
            {ROLE_LABEL[role] ?? role}
          </button>
        ))}
      </div>

      <div className="list single" style={{ marginTop: 12 }}>
        {list.map((specialist) => (
          <button
            className="item"
            key={specialist.id}
            type="button"
            onClick={() =>
              openSheet({
                title: specialist.title,
                node: (
                  <div>
                    <div className="row" style={{ gap: 12, marginBottom: 12 }}>
                      <div className="item-ico" style={{ width: 52, height: 52, fontSize: 24 }}>
                        🔧
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 16 }}>{specialist.title}</div>
                        <div className="hint">
                          {ROLE_LABEL[specialist.role] ?? specialist.role}
                          {specialist.verified ? ' · проверен' : ''}
                        </div>
                      </div>
                    </div>
                    <div className="info-rows">
                      <div className="info-row">
                        <span className="info-label">Рейтинг</span>
                        <span className="info-value">
                          {Number(specialist.rating).toFixed(1)} · {specialist.reviews} отзывов
                        </span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">Часы работы</span>
                        <span className="info-value">{specialist.hours || '—'}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">Телефон</span>
                        <span className="info-value">{specialist.phone ?? 'скрыт'}</span>
                      </div>
                    </div>
                    <div className="form-note">{specialist.about}</div>
                  </div>
                ),
                foot: specialist.phone ? (
                  <a className="btn" href={`tel:${specialist.phone.replace(/[^\d+]/g, '')}`}>
                    Позвонить {specialist.phone}
                  </a>
                ) : undefined
              })
            }
          >
            <div className="item-ico">
              {specialist.role === 'electrician' ? '💡' : specialist.role === 'repair' ? '🧱' : '🔧'}
            </div>
            <div className="item-body">
              <div className="item-t">
                {specialist.title}
                {specialist.verified ? <span className="badge ok">проверен</span> : null}
              </div>
              <div className="item-s">{specialist.about}</div>
              <div className="hint" style={{ marginTop: 3 }}>
                ★ {Number(specialist.rating).toFixed(1)} · {specialist.reviews} отзывов ·{' '}
                {specialist.hours || 'по договорённости'}
              </div>
            </div>
            <div className="item-right">
              <span className="dist">{specialist.phone ?? ''}</span>
            </div>
          </button>
        ))}
      </div>

      <div className="section">
        <button className="btn secondary" onClick={addProfile} type="button">
          ＋ Добавить свой профиль мастера
        </button>
      </div>

      <div className="section">
        <h2 className="section-title" style={{ marginBottom: 10 }}>
          Участковые
        </h2>
        <div className="list">
          {data.officers.map((officer) => (
            <button
              className="item"
              key={officer.id}
              type="button"
              onClick={() =>
                openSheet({
                  title: 'Участковый',
                  node: (
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 16 }}>{officer.name}</div>
                      <div className="hint" style={{ marginTop: 2 }}>
                        {officer.rankTitle} · {officer.district}
                      </div>
                      <div className="info-rows" style={{ marginTop: 12 }}>
                        <div className="info-row">
                          <span className="info-label">Телефон</span>
                          <span className="info-value">{officer.phone}</span>
                        </div>
                        <div className="info-row">
                          <span className="info-label">Адрес</span>
                          <span className="info-value">{officer.address}</span>
                        </div>
                      </div>
                    </div>
                  ),
                  foot: (
                    <a className="btn" href={`tel:${officer.phone.replace(/[^\d+]/g, '')}`}>
                      Позвонить
                    </a>
                  )
                })
              }
            >
              <div className="item-ico green">👮</div>
              <div className="item-body">
                <div className="item-t">{officer.name}</div>
                <div className="item-s">
                  {officer.rankTitle} · {officer.district}
                </div>
              </div>
              <div className="item-right">
                <span className="dist">{officer.phone}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="section">
        <h2 className="section-title" style={{ marginBottom: 10 }}>
          Экстренные службы
        </h2>
        <div className="list">
          {EMERGENCY.map((service) => (
            <a className="item" key={service.phone} href={`tel:${service.phone}`}>
              <div className="item-ico red">{service.icon}</div>
              <div className="item-body">
                <div className="item-t">{service.title}</div>
                <div className="item-s">{service.note}</div>
              </div>
              <div className="item-right">
                <span className="badge danger">{service.phone}</span>
              </div>
            </a>
          ))}
        </div>
        <button
          className="btn ghost"
          style={{ marginTop: 10 }}
          onClick={() => {
            void navigator.clipboard?.writeText('112').then(
              () => toast('112 скопирован'),
              () => toast('112 — единый номер')
            );
          }}
          type="button"
        >
          Скопировать 112
        </button>
      </div>
    </div>
  );
}
