'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/client/api';
import { fmtTime } from '@/lib/client/format';
import type { Building, ChatMessage } from '@/lib/types';
import { useApp } from './context';
import { IconBack, IconInfo, IconSend } from './icons';

const POLL_MS = 4000;

export default function ChatDialog({ building, onClose }: { building: Building; onClose: () => void }) {
  const { me, markSeen, toast } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [joined, setJoined] = useState(building.joined);
  const [membersCount, setMembersCount] = useState(building.members);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const lastRef = useRef<string | null>(null);

  useEffect(() => {
    let alive = true;
    let timer: number | undefined;

    const load = async (after: string | null) => {
      try {
        const query = after ? `?after=${encodeURIComponent(after)}` : '';
        const result = await api.get<{
          joined: boolean;
          messages: ChatMessage[];
          membersCount: number;
          total: number;
        }>(`/chats/${building.id}/messages${query}`);
        if (!alive) return;

        setJoined(result.joined);
        setMembersCount(result.membersCount);
        markSeen(building.id, result.total);
        setMessages((previous) => {
          if (!after) return result.messages;
          const known = new Set(previous.map((message) => message.id));
          return [...previous, ...result.messages.filter((message) => !known.has(message.id))];
        });

        const last = result.messages[result.messages.length - 1];
        if (last) lastRef.current = last.createdAt;
        setLoading(false);
      } catch (error) {
        if (alive) toast((error as Error).message);
      }
      if (alive) timer = window.setTimeout(() => void load(lastRef.current), POLL_MS);
    };

    void load(null);
    return () => {
      alive = false;
      if (timer) window.clearTimeout(timer);
    };
  }, [building.id, markSeen, toast]);

  useEffect(() => {
    const element = bodyRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages, joined]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function join() {
    try {
      await api.post(`/chats/${building.id}/join`);
      setJoined(true);
      toast('Вы в чате — теперь можно писать');
      const result = await api.get<{ joined: boolean; messages: ChatMessage[]; membersCount: number }>(
        `/chats/${building.id}/messages`
      );
      setMessages(result.messages);
      setMembersCount(result.membersCount);
      markSeen(building.id, building.messages);
    } catch (error) {
      toast((error as Error).message);
    }
  }

  async function send() {
    const value = text.trim();
    if (!value || sending) return;
    setSending(true);
    try {
      const result = await api.post<{ message: ChatMessage }>(`/chats/${building.id}/messages`, { text: value });
      setMessages((previous) => [...previous, result.message]);
      lastRef.current = result.message.createdAt;
      setText('');
    } catch (error) {
      toast((error as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="dialog open">
      <div className="dialog-inner">
        <div className="dlg-head">
          <button className="dlg-back" onClick={onClose} aria-label="Назад" title="Назад (Esc)" type="button">
            <IconBack />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="dlg-title">{building.title}</div>
            <div className="dlg-sub">
              {building.type === 'snt' ? 'СНТ' : 'Дом'} · {membersCount} участников
            </div>
          </div>
          <button
            className="icon-btn"
            onClick={() =>
              toast(
                joined
                  ? 'Чат закрыт для посторонних: читают и пишут только жители, которые вступили.'
                  : 'Вступите в чат, чтобы читать и писать. Вступить может любой житель этого дома.'
              )
            }
            aria-label="О чате"
            style={{ width: 36, height: 36, borderRadius: 11 }}
            type="button"
          >
            <IconInfo style={{ width: 17, height: 17 }} />
          </button>
        </div>

        <div className="dlg-body" ref={bodyRef}>
          {loading ? (
            <div className="dlg-empty">Загружаем сообщения…</div>
          ) : messages.length ? (
            messages.map((message) => {
              const mine = Boolean(me && message.userId === me.id);
              return (
                <div className={`msg ${mine ? 'me' : ''}`} key={message.id}>
                  {mine ? null : <div className="author">{message.authorName || 'Сосед'}</div>}
                  <div>{message.body}</div>
                  <div className="time">{fmtTime(message.createdAt)}</div>
                </div>
              );
            })
          ) : (
            <div className="dlg-empty">
              Сообщений пока нет.
              {joined
                ? ' Напишите первым — соседи увидят.'
                : ' Вступите в чат, чтобы читать и писать.'}
            </div>
          )}
        </div>

        {joined ? null : (
          <div className="dlg-join">
            <button className="btn" onClick={join} type="button">
              Вступить в чат «{building.title}»
            </button>
          </div>
        )}

        {joined ? (
          <div className="dlg-input">
            <input
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void send();
              }}
              placeholder="Написать соседям…"
              maxLength={1500}
              autoComplete="off"
            />
            <button onClick={send} aria-label="Отправить" disabled={sending} type="button">
              <IconSend />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
