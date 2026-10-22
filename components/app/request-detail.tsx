'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/client/api';
import { fmtAgo, fmtDateTime, STATUS_CLASS, STATUS_LABEL } from '@/lib/client/format';
import type { RequestItem, RequestStatus } from '@/lib/types';
import { useApp } from './context';

const STATUS_FLOW: Array<{ id: RequestStatus; label: string }> = [
  { id: 'in_progress', label: 'В работу' },
  { id: 'done', label: 'Решено' },
  { id: 'rejected', label: 'Отклонить' }
];

export default function RequestDetail({ id }: { id: string }) {
  const { refresh, toast } = useApp();
  const [request, setRequest] = useState<RequestItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await api.get<{ request: RequestItem }>(`/requests/${id}`);
      setRequest(result.request);
    } catch (error) {
      toast((error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function changeStatus(status: RequestStatus) {
    setBusy(true);
    try {
      const result = await api.patch<{ request: RequestItem }>(`/requests/${id}`, { status });
      setRequest(result.request);
      await refresh();
      toast('Статус обновлён');
    } catch (error) {
      toast((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function sendComment() {
    const text = comment.trim();
    if (!text || busy) return;
    setBusy(true);
    try {
      const result = await api.post<{ request: RequestItem }>(`/requests/${id}/comments`, { text });
      setRequest(result.request);
      setComment('');
      await refresh();
    } catch (error) {
      toast((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="dlg-empty">Загружаем заявку…</div>;
  if (!request) return <div className="dlg-empty">Заявка не найдена</div>;

  return (
    <div>
      <div className="row" style={{ alignItems: 'flex-start', gap: 12 }}>
        <div className="item-ico amber" style={{ width: 46, height: 46, fontSize: 22 }}>
          {request.categoryIcon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 16, lineHeight: 1.3 }}>{request.title}</div>
          <div className="hint" style={{ marginTop: 3 }}>
            {request.categoryTitle} · {request.address}
          </div>
        </div>
        <span className={`badge ${STATUS_CLASS[request.status] ?? ''}`}>
          {STATUS_LABEL[request.status] ?? request.status}
        </span>
      </div>

      {request.photoUrl ? (
        <img
          src={request.photoUrl}
          alt="Фото заявки"
          style={{ width: '100%', marginTop: 12, borderRadius: 16, objectFit: 'cover', maxHeight: 260 }}
        />
      ) : null}

      {request.description ? (
        <div className="card pad" style={{ marginTop: 12, lineHeight: 1.55 }}>
          {request.description}
        </div>
      ) : null}

      <div className="info-rows" style={{ marginTop: 12 }}>
        <div className="info-row">
          <span className="info-label">Автор</span>
          <span className="info-value">{request.authorName}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Создана</span>
          <span className="info-value">{fmtDateTime(request.createdAt)}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Обновлена</span>
          <span className="info-value">{fmtAgo(request.updatedAt)}</span>
        </div>
      </div>

      {request.events?.length ? (
        <>
          <div className="divider" />
          <div style={{ fontWeight: 750, fontSize: 13.5, marginBottom: 6 }}>История</div>
          <div className="list">
            {request.events.map((event, index) => (
              <div className="row" key={`${event.createdAt}-${index}`} style={{ alignItems: 'flex-start' }}>
                <span className={`badge ${STATUS_CLASS[event.status] ?? ''}`}>
                  {STATUS_LABEL[event.status] ?? event.status}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="small">{event.comment || '—'}</div>
                  <div className="hint">{fmtDateTime(event.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}

      <div className="divider" />
      <div style={{ fontWeight: 750, fontSize: 13.5, marginBottom: 6 }}>Комментарии</div>
      <div className="list">
        {request.comments?.length ? (
          request.comments.map((item) => (
            <div className="card pad" key={item.id} style={{ padding: 12 }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <b style={{ fontSize: 13 }}>{item.authorName}</b>
                <span className="hint">{fmtAgo(item.createdAt)}</span>
              </div>
              <div style={{ marginTop: 4, fontSize: 13.5 }}>{item.body}</div>
            </div>
          ))
        ) : (
          <div className="hint">Комментариев пока нет</div>
        )}
      </div>

      <div className="dlg-input" style={{ marginTop: 12, background: 'transparent', padding: 0 }}>
        <input
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void sendComment();
          }}
          placeholder="Написать комментарий…"
          maxLength={1000}
        />
        <button onClick={sendComment} disabled={busy} aria-label="Отправить" type="button">
          <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, stroke: '#fff', fill: 'none' }}>
            <path d="M22 2L11 13" />
            <path d="M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
        </button>
      </div>

      {request.canManage ? (
        <div style={{ marginTop: 16 }}>
          <div className="hint" style={{ marginBottom: 6 }}>
            Смена статуса{request.mine ? '' : ' · вы сотрудник УК'}
          </div>
          <div className="btn-row" style={{ flexWrap: 'wrap' }}>
            {STATUS_FLOW.map((action) => (
              <button
                key={action.id}
                className="btn outline sm"
                type="button"
                disabled={busy || request.status === action.id}
                onClick={() => changeStatus(action.id)}
                style={{ flex: '1 1 30%' }}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
