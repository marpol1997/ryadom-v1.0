/* Точка входа SPA: подключает ядро, экраны и интерфейс, затем запускает приложение. */
import './core/index.js';

import './features/home.js';
import './features/map.js';
import './features/chats.js';
import './features/specialists.js';
import './features/requests.js';
import './features/feed.js';

import './ui/rows.js';
import './ui/nav.js';
import './ui/sheet.js';
import './ui/auth.js';
import './ui/profile.js';

import { start } from './ui/init.js';

start();
