/* Публичная точка входа ядра: собирает App и отдаёт его остальным модулям. */
import { A } from './app.js';
import './utils.js';
import { S } from './state.js';
import './domain.js';
import './local.js';
import './store.js';
import './boot.js';

window.App = A;

export { A, S };
