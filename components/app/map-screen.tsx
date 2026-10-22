'use client';

import { useEffect, useRef, useState } from 'react';
import type * as Leaflet from 'leaflet';
import { fmtDist, haversine } from '@/lib/client/format';
import { useApp } from './context';
import { IconLocate, IconSearch } from './icons';

type Filter = 'all' | 'house' | 'snt' | 'requests' | 'specialists';

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'Всё' },
  { id: 'house', label: '🏢 Дома' },
  { id: 'snt', label: '🌳 СНТ' },
  { id: 'requests', label: '📌 Заявки' },
  { id: 'specialists', label: '🔧 Мастера' }
];

export default function MapScreen() {
  const { data, coords, requestLocation, openChat, openRequest, openSheet, toast } = useApp();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const leafletRef = useRef<typeof Leaflet | null>(null);
  const layerRef = useRef<Leaflet.LayerGroup | null>(null);
  const [ready, setReady] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const { lat, lng, zoom } = data.city;

  useEffect(() => {
    let disposed = false;

    void (async () => {
      const L = await import('leaflet');
      if (disposed || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, { zoomControl: true }).setView([lat, lng], zoom);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
      }).addTo(map);

      leafletRef.current = L;
      mapRef.current = map;
      layerRef.current = L.layerGroup().addTo(map);
      setReady(true);
    })();

    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
      leafletRef.current = null;
    };
  }, [lat, lng, zoom]);

  useEffect(() => {
    const L = leafletRef.current;
    const layer = layerRef.current;
    if (!ready || !L || !layer) return;

    layer.clearLayers();

    const pin = (emoji: string, extra = '') =>
      L.divIcon({
        className: `map-pin ${extra}`,
        html: `<span class="map-pin-emoji">${emoji}</span>`,
        iconSize: [34, 34],
        iconAnchor: [17, 34]
      });

    if (filter === 'all' || filter === 'house' || filter === 'snt') {
      for (const building of data.buildings) {
        if (filter === 'house' && building.type !== 'house') continue;
        if (filter === 'snt' && building.type !== 'snt') continue;
        if (query.trim()) {
          const needle = query.trim().toLowerCase();
          if (
            !building.title.toLowerCase().includes(needle) &&
            !building.address.toLowerCase().includes(needle)
          ) {
            continue;
          }
        }
        L.marker([building.lat, building.lng], { icon: pin(building.type === 'snt' ? '🌳' : '🏢') })
          .on('click', () => openChat(building))
          .addTo(layer);
      }
    }

    if (filter === 'all' || filter === 'requests') {
      for (const request of data.requests) {
        if (request.lat === null || request.lng === null) continue;
        L.marker([request.lat, request.lng], { icon: pin(request.categoryIcon, 'fire') })
          .on('click', () => openRequest(request.id))
          .addTo(layer);
      }
    }

    if (filter === 'all' || filter === 'specialists') {
      for (const specialist of data.specialists) {
        if (specialist.lat === null || specialist.lng === null) continue;
        L.marker([specialist.lat, specialist.lng], { icon: pin('🔧') })
          .on('click', () =>
            openSheet({
              title: specialist.title,
              node: (
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>{specialist.title}</div>
                  <div className="hint" style={{ marginTop: 4 }}>
                    ★ {Number(specialist.rating).toFixed(1)} · {specialist.reviews} отзывов
                  </div>
                  <div className="form-note">{specialist.about}</div>
                  <div className="info-rows">
                    <div className="info-row">
                      <span className="info-label">Телефон</span>
                      <span className="info-value">{specialist.phone ?? 'скрыт'}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Часы</span>
                      <span className="info-value">{specialist.hours || '—'}</span>
                    </div>
                  </div>
                </div>
              ),
              foot: specialist.phone ? (
                <a className="btn" href={`tel:${specialist.phone.replace(/[^\d+]/g, '')}`}>
                  Позвонить
                </a>
              ) : undefined
            })
          )
          .addTo(layer);
      }
    }
  }, [ready, filter, query, data, openChat, openRequest, openSheet]);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!ready || !L || !map || !coords) return;
    map.setView([coords.lat, coords.lng], 15, { animate: true });
    L.circleMarker([coords.lat, coords.lng], {
      radius: 8,
      color: '#4f46e5',
      fillColor: '#4f46e5',
      fillOpacity: 0.5
    })
      .addTo(map)
      .bindTooltip('Вы здесь');
  }, [coords, ready]);

  function search() {
    const needle = query.trim().toLowerCase();
    if (!needle) return;
    const found = data.buildings.find(
      (building) =>
        building.title.toLowerCase().includes(needle) || building.address.toLowerCase().includes(needle)
    );
    const map = mapRef.current;
    if (found && map) {
      map.setView([found.lat, found.lng], 16, { animate: true });
    } else {
      toast('Ничего не нашли — попробуйте улицу или номер дома');
    }
  }

  const nearest = coords
    ? data.buildings
        .map((building) => ({ building, distance: haversine(coords, building) ?? Infinity }))
        .sort((a, b) => a.distance - b.distance)[0]
    : undefined;

  return (
    <div className="map-screen active" style={{ position: 'absolute', inset: 0 }}>
      <div id="map" ref={containerRef} />

      <div className="map-overlay">
        <div className="map-search">
          <IconSearch style={{ width: 18, height: 18 }} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') search();
            }}
            type="search"
            placeholder="Улица, дом, СНТ — поиск по Севастополю"
            autoComplete="off"
          />
          {query ? (
            <button className="clear" onClick={() => setQuery('')} aria-label="Очистить" type="button">
              ✕
            </button>
          ) : null}
        </div>

        <div className="map-filters">
          <div className="chips">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                className={`chip ${filter === item.id ? 'active' : ''}`}
                onClick={() => setFilter(item.id)}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="map-bottom">
        <div className="map-legend">
          {nearest
            ? `Ближе всего: ${nearest.building.title} · ${fmtDist(nearest.distance)}`
            : '🏢 дома · 🌳 СНТ · 📌 заявки · 🔧 мастера · 👮 участковые'}
        </div>
        <button className="map-fab" onClick={requestLocation} aria-label="Моё местоположение" type="button">
          <IconLocate />
        </button>
      </div>
    </div>
  );
}
