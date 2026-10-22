'use client';

import { fmtAgo, fmtDist, greeting, haversine, STATUS_CLASS, STATUS_LABEL } from '@/lib/client/format';
import { useApp } from './context';
import { IconArrow, IconPin } from './icons';

export default function HomeScreen() {
  const { data, me, coords, go, openChat, startRequest, openRequest, requestLocation } = useApp();

  const nearby = [...data.buildings]
    .map((building) => ({ building, distance: haversine(coords, building) }))
    .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))
    .slice(0, 3);

  const myRequests = data.requests.filter((request) => request.mine).slice(0, 3);
  const firstName = me?.name.split(' ')[0] ?? null;

  return (
    <div className="wrap">
      <div className="hello">
        <h1>
          {greeting()}
          {firstName ? `, ${firstName}` : ''}
        </h1>
        <p>
          <span className="city-pill">📍 {data.city.name}</span>
          <span>Городские чаты, заявки и помощь рядом</span>
        </p>
      </div>

      <div className="section" style={{ marginTop: 16 }}>
        <div className="section-head">
          <h2 className="section-title">В городе</h2>
          <button className="section-link" onClick={() => go('map')} type="button">
            На карте
          </button>
        </div>
        <div className="feed-scroll">
          {data.feed.map((item) => (
            <article className={`feed-card tone-${item.tone}`} key={item.id}>
              <div className="feed-ico">{item.icon}</div>
              <div style={{ minWidth: 0 }}>
                {item.tag ? <div className="feed-tag">{item.tag}</div> : null}
                <div className="feed-t">{item.title}</div>
                <div className="feed-s">{item.body}</div>
                <div className="hint" style={{ marginTop: 6 }}>
                  {fmtAgo(item.createdAt)}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="section">
        <div className="section-head">
          <h2 className="section-title">Что случилось?</h2>
        </div>
        <div className="tiles">
          {data.categories.map((category) => (
            <button
              className="tile"
              key={category.id}
              onClick={() => startRequest(category.id)}
              type="button"
              title={category.subtitle}
            >
              <span className="tile-ico">{category.icon}</span>
              <span className="tile-t">{category.title}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="section">
        <div className="section-head">
          <h2 className="section-title">Рядом с вами</h2>
          <button className="section-link" onClick={requestLocation} type="button">
            Моё местоположение
          </button>
        </div>
        <div className="list single">
          {nearby.map(({ building, distance }) => (
            <button className="item" key={building.id} onClick={() => openChat(building)} type="button">
              <div className="item-ico">{building.type === 'snt' ? '🌳' : '🏢'}</div>
              <div className="item-body">
                <div className="item-t">
                  {building.title}
                  {building.joined ? <span className="badge ok">вы в чате</span> : null}
                </div>
                <div className="item-s">{building.address}</div>
                <div className="hint" style={{ marginTop: 3 }}>
                  {building.members} участн. · {building.district} район
                </div>
              </div>
              <div className="item-right">
                {distance !== null ? <span className="dist">{fmtDist(distance)}</span> : null}
                <IconArrow className="chev" />
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="section">
        <div className="section-head">
          <h2 className="section-title">Мои заявки</h2>
          <button className="section-link" onClick={() => startRequest()} type="button">
            Новая
          </button>
        </div>
        <div className="list single">
          {myRequests.length ? (
            myRequests.map((request) => (
              <button className="item" key={request.id} onClick={() => openRequest(request.id)} type="button">
                <div className="item-ico amber">{request.categoryIcon}</div>
                <div className="item-body">
                  <div className="item-t">{request.title}</div>
                  <div className="item-s">
                    {request.address} · {fmtAgo(request.updatedAt)}
                  </div>
                </div>
                <div className="item-right">
                  <span className={`badge ${STATUS_CLASS[request.status] ?? ''}`}>
                    {STATUS_LABEL[request.status] ?? request.status}
                  </span>
                </div>
              </button>
            ))
          ) : (
            <div className="card pad hint" style={{ lineHeight: 1.55 }}>
              {me
                ? 'Заявок пока нет. Выберите проблему выше — вода, свет, двор — и опишите её в двух словах.'
                : 'Войдите, чтобы отправлять заявки в управляющую компанию и следить за статусом.'}
            </div>
          )}
        </div>
      </div>

      <div className="section">
        <div
          className="card pad"
          style={{
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            background: 'linear-gradient(135deg, #eef2ff, #e4edff)',
            borderColor: '#dde2ff'
          }}
        >
          <div style={{ fontSize: 26 }}>🤝</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 750, fontSize: 13.5 }}>Помогите соседям</div>
            <div className="hint" style={{ marginTop: 2 }}>
              Загляните в чат своего дома — там просьбы и объявления
            </div>
          </div>
          <button className="btn sm" onClick={() => go('chats')} type="button" style={{ width: 'auto' }}>
            Открыть
          </button>
        </div>
      </div>

      <div className="section center hint" style={{ paddingBottom: 8 }}>
        <IconPin style={{ width: 14, height: 14, verticalAlign: '-2px' }} /> {data.city.name} · демонстрационные
        данные
      </div>
    </div>
  );
}
