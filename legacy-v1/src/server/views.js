/** Преобразование записей БД в объекты для клиента. */

export function chatView(chat, userId) {
  const members = (chat.members || []).length;
  return {
    id: chat.id,
    type: chat.type,
    title: chat.title,
    address: chat.address,
    district: chat.district,
    lat: chat.lat,
    lng: chat.lng,
    units: chat.units,
    about: chat.about,
    members: (chat.membersBase || 0) + members,
    joined: Boolean(userId && (chat.members || []).includes(userId))
  };
}

export function requestView(request, { withPhoto = false, userId = null } = {}) {
  const view = {
    id: request.id,
    category: request.category,
    title: request.title,
    description: request.description,
    address: request.address,
    lat: request.lat,
    lng: request.lng,
    status: request.status,
    author: request.author,
    demo: Boolean(request.demo),
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    hasPhoto: Boolean(request.photo),
    comments: (request.comments || []).slice(-30),
    history: request.history || [],
    mine: Boolean(userId && request.userId === userId)
  };
  if (withPhoto) view.photo = request.photo || null;
  return view;
}

export function chatStats(db, chatId) {
  const messages = db.messages.filter((message) => message.chatId === chatId);
  const last = messages[messages.length - 1];
  return {
    messages: messages.length,
    lastMessage: last ? { text: last.text, userName: last.userName, createdAt: last.createdAt } : null
  };
}
