import { fail, send } from '../http.js';
import { randomId } from '../security.js';
import { requestView } from '../views.js';

const STATUSES = ['new', 'in_progress', 'done', 'rejected'];
const PHOTO_RE = /^data:image\/(jpeg|png|webp);base64,/;
const MAX_PHOTO_CHARS = 700000;

const byNewest = (a, b) => b.createdAt.localeCompare(a.createdAt);

export function registerRequestRoutes(router) {
  router.get('/api/requests', ({ res, url, db, user }) => {
    let list = db.requests.slice().sort(byNewest);
    if (url.searchParams.get('mine') === '1') {
      if (!user) return fail(res, 401, 'Требуется вход');
      list = list.filter((request) => request.userId === user.id);
    }
    return send(res, 200, {
      ok: true,
      requests: list.slice(0, 300).map((request) => requestView(request, { userId: user?.id }))
    });
  });

  router.post('/api/requests', ({ res, body, db, save, user }) => {
    if (!user) return fail(res, 401, 'Войдите, чтобы отправить заявку');

    const category = db.categories.find((item) => item.id === body.category);
    if (!category) return fail(res, 400, 'Выберите категорию');

    const title = String(body.title || '').trim();
    const description = String(body.description || '').trim();
    const address = String(body.address || '').trim();

    if (title.length < 3) return fail(res, 400, 'Опишите проблему коротко в заголовке');
    if (title.length > 120) return fail(res, 400, 'Заголовок — до 120 символов');
    if (description.length > 2000) return fail(res, 400, 'Описание слишком длинное');
    if (!address) return fail(res, 400, 'Укажите адрес');
    if (address.length > 200) return fail(res, 400, 'Адрес слишком длинный');

    let lat = Number(body.lat);
    let lng = Number(body.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      lat = db.city.lat;
      lng = db.city.lng;
    }

    let photo = null;
    if (body.photo) {
      const dataUrl = String(body.photo);
      if (!PHOTO_RE.test(dataUrl)) return fail(res, 400, 'Фото должно быть JPEG/PNG/WebP');
      if (dataUrl.length > MAX_PHOTO_CHARS) return fail(res, 413, 'Фото слишком большое');
      photo = dataUrl;
    }

    const now = new Date().toISOString();
    const request = {
      id: randomId('r_'),
      userId: user.id,
      author: user.name,
      category: category.id,
      title: title.slice(0, 120),
      description,
      address: address.slice(0, 200),
      lat,
      lng,
      status: 'new',
      demo: false,
      photo,
      comments: [],
      createdAt: now,
      updatedAt: now,
      history: [{ status: 'new', at: now, comment: 'Заявка создана' }]
    };

    db.requests.push(request);
    save();
    return send(res, 201, { ok: true, request: requestView(request, { withPhoto: true, userId: user.id }) });
  });

  router.get('/api/requests/:id', ({ res, db, user, params }) => {
    const request = db.requests.find((item) => item.id === params.id);
    if (!request) return fail(res, 404, 'Заявка не найдена');
    return send(res, 200, {
      ok: true,
      request: requestView(request, { withPhoto: true, userId: user?.id }),
      mine: Boolean(user && request.userId === user.id)
    });
  });

  router.patch('/api/requests/:id', ({ res, body, db, save, user, params }) => {
    if (!user) return fail(res, 401, 'Требуется вход');
    const request = db.requests.find((item) => item.id === params.id);
    if (!request) return fail(res, 404, 'Заявка не найдена');
    if (request.userId !== user.id) return fail(res, 403, 'Менять статус может только автор заявки');
    if (!STATUSES.includes(body.status)) return fail(res, 400, 'Неизвестный статус');

    request.status = body.status;
    request.updatedAt = new Date().toISOString();
    request.history.push({
      status: body.status,
      at: request.updatedAt,
      comment: String(body.comment || '').slice(0, 300)
    });
    save();
    return send(res, 200, {
      ok: true,
      request: requestView(request, { withPhoto: true, userId: user.id })
    });
  });

  router.post('/api/requests/:id/comments', ({ res, body, db, save, user, params }) => {
    if (!user) return fail(res, 401, 'Требуется вход');
    const request = db.requests.find((item) => item.id === params.id);
    if (!request) return fail(res, 404, 'Заявка не найдена');

    const text = String(body.text || '').trim();
    if (!text) return fail(res, 400, 'Пустой комментарий');
    if (text.length > 1000) return fail(res, 400, 'Слишком длинный комментарий');

    request.comments.push({ userName: user.name, text, at: new Date().toISOString() });
    request.updatedAt = new Date().toISOString();
    save();
    return send(res, 201, {
      ok: true,
      request: requestView(request, { withPhoto: true, userId: user.id })
    });
  });
}
