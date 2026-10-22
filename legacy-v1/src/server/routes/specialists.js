import { fail, send } from '../http.js';
import { randomId } from '../security.js';

const ROLES = ['plumber', 'electrician', 'mechanic', 'handyman', 'cleaning', 'moving'];

export function registerSpecialistRoutes(router) {
  router.get('/api/specialists', ({ res, db }) => {
    send(res, 200, { ok: true, specialists: db.specialists });
  });

  router.post('/api/specialists', ({ res, body, db, save, user }) => {
    if (!user) return fail(res, 401, 'Войдите, чтобы добавить профиль');

    const title = String(body.title || '').trim();
    const phone = String(body.phone || '').replace(/[^\d+]/g, '');

    if (title.length < 2) return fail(res, 400, 'Укажите имя или название');
    if (title.length > 60) return fail(res, 400, 'Название — до 60 символов');
    if (phone.replace(/\D/g, '').length < 10) return fail(res, 400, 'Укажите телефон для связи');

    const specialist = {
      id: randomId('sp_'),
      name: title,
      title,
      role: ROLES.includes(body.role) ? body.role : 'handyman',
      about: String(body.about || '').slice(0, 600),
      phone: `+${phone.replace(/^\+/, '')}`,
      hours: String(body.hours || '').slice(0, 60),
      rating: 0,
      reviews: 0,
      lat: Number(body.lat) || db.city.lat,
      lng: Number(body.lng) || db.city.lng,
      demo: false,
      verified: false,
      userId: user.id,
      createdAt: new Date().toISOString()
    };

    db.specialists.unshift(specialist);
    save();
    return send(res, 201, { ok: true, specialist });
  });
}
