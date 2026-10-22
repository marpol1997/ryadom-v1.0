'use client';

import { useState } from 'react';
import { fmtAgo } from '@/lib/client/format';
import { useApp } from './context';
import { IconArrow, IconLock } from './icons';

type Tab = 'house' | 'snt';

export default function ChatsScreen() {
  const { data, seen, openChat } = useApp();
  const [tab, setTab] = useState<Tab>('house');
  const list = data.buildings.filter((building) => building.type === tab);

  return (
    <div className="wrap">
      <div className="hello">
        <h1>Чаты</h1>
        <p>{tab === 'snt' ? 'Садовые товарищества Севастополя' : 'Дома Севастополя — чаты соседей'}</p>
      </div>

      <div className="segmented">
        <button className={tab === 'house' ? 'active' : ''} onClick={() => setTab('house')} type="button">
          🏢 Дома
        </button>
        <button className={tab === 'snt' ? 'active' : ''} onClick={() => setTab('snt')} type="button">
          🌳 СНТ
        </button>
      </div>

      <div className="list single" style={{ marginTop: 10 }}>
        {list.length ? (
          list.map((building) => {
            const unread = Math.max(0, building.messages - (seen[building.id] ?? 0));
            return (
              <button className="item chat-row" key={building.id} onClick={() => openChat(building)} type="button">
                <div className="item-ico">{building.type === 'snt' ? '🌳' : '🏢'}</div>
                <div className="item-body">
                  <div className="item-t">
                    {building.title}
                    {building.joined ? <span className="badge ok">вы в чате</span> : null}
                  </div>
                  {building.lastMessage ? (
                    <div className="item-s">
                      {building.lastMessage.userName}: {building.lastMessage.text}
                    </div>
                  ) : (
                    <div className="item-s">Сообщений пока нет</div>
                  )}
                  <div className="item-s hint" style={{ marginTop: 3 }}>
                    {building.district} район · {building.members} участн. ·{' '}
                    {fmtAgo(building.lastMessage ? building.lastMessage.createdAt : new Date().toISOString())}
                  </div>
                </div>
                <div className="item-right">
                  {unread > 0 ? <span className="unread">{unread > 9 ? '9+' : unread}</span> : null}
                  {!building.joined ? (
                    <span className="lock-note" title="Чат закрыт для посторонних">
                      <IconLock style={{ width: 14, height: 14 }} />
                      <span>закрыт</span>
                    </span>
                  ) : (
                    <IconArrow className="chev" />
                  )}
                </div>
              </button>
            );
          })
        ) : (
          <div className="empty">
            <span className="e">💬</span>
            Пока нет чатов этого типа
          </div>
        )}
      </div>
    </div>
  );
}
