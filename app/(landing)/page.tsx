/** Лендинг. Обычные ссылки (не next/link): у приложения своя корневая раскладка и свой CSS. */

const FEATURES = [
  {
    icon: '🏢',
    title: 'Чат дома и СНТ',
    text: 'Соседи, объявления, вода, отопление и мусор — в одном закрытом чате. Отдельные чаты для домов и садовых товариществ.'
  },
  {
    icon: '📸',
    title: 'Заявка с фото и статусом',
    text: 'Опишите проблему, прикрепите фото, отметьте точку на карте. Заявка получает номер и статус — видно, что с ней происходит.'
  },
  {
    icon: '🗺️',
    title: 'Карта города',
    text: 'Дома, СНТ, активные заявки, мастера и участковые — на одной карте Севастополя. Поиск по улице и дому.'
  },
  {
    icon: '🔧',
    title: 'Специалисты',
    text: 'Сантехники, электрики, ремонт подъездов и техники. С телефонами и часами работы — без посредников.'
  },
  {
    icon: '👮',
    title: 'Участковый рядом',
    text: 'Кто обслуживает ваш район, как связаться и куда обратиться, если вопрос не решается во дворе.'
  },
  {
    icon: '🔔',
    title: 'Уведомления',
    text: 'Ответ по заявке, новое сообщение в чате дома, отключение воды. Приложение ставится на главный экран.'
  }
] as const;

const STEPS = [
  {
    title: 'Создайте аккаунт',
    text: 'Имя, e-mail или телефон и пароль. Выберите свой дом или СНТ из списка — по адресу.'
  },
  {
    title: 'Загляните в чат',
    text: 'Сразу видно, что происходит в доме: объявления, просьбы, отключения. Можно писать соседям.'
  },
  {
    title: 'Отправьте заявку',
    text: 'Если проблема не решается разговором — фото, адрес, точка на карте. Дальше следите за статусом.'
  }
] as const;

function LogoMark() {
  return (
    <span className="brand-mark">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2.6c-3.9 0-7 3.1-7 6.9 0 5 7 12 7 12s7-7 7-12c0-3.8-3.1-6.9-7-6.9zm0 9.4a2.6 2.6 0 1 1 0-5.2 2.6 2.6 0 0 1 0 5.2z" />
      </svg>
    </span>
  );
}

function PhonePreview() {
  return (
    <div className="phone-screen" aria-hidden="true">
      <div
        style={{
          padding: '18px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          background: 'linear-gradient(180deg,#f7f8ff,#eef2ff)',
          height: '100%'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 10,
              background: 'linear-gradient(140deg,#6366f1,#3730a3)'
            }}
          />
          <div>
            <div style={{ fontWeight: 800, fontSize: 13 }}>Рядом</div>
            <div style={{ fontSize: 10, color: '#64748b' }}>Севастополь</div>
          </div>
        </div>

        <div style={{ fontWeight: 800, fontSize: 15, lineHeight: 1.25 }}>
          Добрый день,
          <br />
          соседи рядом
        </div>

        <div
          style={{
            background: '#fff',
            borderRadius: 14,
            padding: 10,
            boxShadow: '0 4px 14px rgba(15,23,42,.07)',
            display: 'flex',
            gap: 8
          }}
        >
          <div style={{ fontSize: 16 }}>💧</div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700 }}>Отключение воды</div>
            <div style={{ fontSize: 9.5, color: '#64748b' }}>Острякова 40–52 · 09:00–14:00</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
          {['💧', '💡', '🔥', '🗑️'].map((icon) => (
            <div
              key={icon}
              style={{
                background: '#fff',
                borderRadius: 12,
                padding: '8px 4px',
                textAlign: 'center',
                fontSize: 15,
                boxShadow: '0 2px 8px rgba(15,23,42,.05)'
              }}
            >
              {icon}
            </div>
          ))}
        </div>

        <div
          style={{
            background: '#fff',
            borderRadius: 14,
            padding: 10,
            boxShadow: '0 4px 14px rgba(15,23,42,.07)'
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700 }}>Чат дома</div>
          <div style={{ fontSize: 9.5, color: '#64748b', marginTop: 2 }}>
            Ирина: в субботу собрание в 19:00
          </div>
        </div>

        <div
          style={{
            marginTop: 'auto',
            background: '#4f46e5',
            color: '#fff',
            borderRadius: 12,
            padding: '9px 12px',
            fontSize: 11,
            fontWeight: 700,
            textAlign: 'center'
          }}
        >
          Отправить заявку
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <>
      <header className="site">
        <div className="wrap nav">
          <a className="brand" href="/">
            <LogoMark />
            <span>
              Рядом<small>Севастополь</small>
            </span>
          </a>
          <nav className="nav-links">
            <a href="#features">Возможности</a>
            <a href="#how">Как работает</a>
            <a href="#gosuslugi">Без Госуслуг</a>
            <a href="#for-uk">УК и ТСЖ</a>
          </nav>
          <a className="btn btn-primary" href="/app">
            Открыть приложение
          </a>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="wrap hero-grid">
            <div>
              <span className="pill">
                <i />
                Севастополь · чаты домов и СНТ
              </span>
              <h1>
                Соседи <em>рядом</em> —<br />
                даже когда вы далеко
              </h1>
              <p className="lead">
                Домовой чат без мессенджерной суеты, заявка в УК с фото и статусом, карта города и проверенные
                мастера. Всё в одном приложении — для жителей Севастополя.
              </p>
              <div className="hero-actions">
                <a className="btn btn-primary" href="/app">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 12h14M13 6l6 6-6 6" style={{ stroke: '#fff', fill: 'none' }} />
                  </svg>
                  Открыть приложение
                </a>
                <a className="btn btn-ghost" href="#how">
                  Как это работает
                </a>
              </div>
              <div className="hero-note">Бесплатно · работает в браузере · устанавливается на телефон</div>
              <div className="stats">
                <div className="stat">
                  <b>16</b>
                  <span>чатов домов и СНТ</span>
                </div>
                <div className="stat">
                  <b>34</b>
                  <span>точки на карте</span>
                </div>
                <div className="stat">
                  <b>4</b>
                  <span>района города</span>
                </div>
              </div>
            </div>

            <div className="phone-stage">
              <div className="float-card fc-1">
                <div className="ic">💧</div>
                <div>
                  <b>Заявка принята</b>
                  <span>Протечка в подъезде · в работе</span>
                </div>
              </div>
              <div className="phone">
                <PhonePreview />
              </div>
              <div className="float-card fc-2">
                <div className="ic">💬</div>
                <div>
                  <b>Чат вашего дома</b>
                  <span>3 новых сообщения от соседей</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features">
          <div className="wrap">
            <div className="sec-head">
              <div className="eyebrow">Возможности</div>
              <h2>Всё, что нужно для дома — в одном месте</h2>
              <p>Без десятка чатов, потерянных объявлений и звонков «а кто у нас старший по подъезду?».</p>
            </div>
            <div className="cards">
              {FEATURES.map((feature) => (
                <article className="card" key={feature.title}>
                  <div className="ic">{feature.icon}</div>
                  <h3>{feature.title}</h3>
                  <p>{feature.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="how" style={{ paddingTop: 20 }}>
          <div className="wrap">
            <div className="sec-head">
              <div className="eyebrow">Как работает</div>
              <h2>Три шага — и вы в чате своего дома</h2>
              <p>Никаких приглашений по коду и ожидания модератора.</p>
            </div>
            <div className="steps">
              {STEPS.map((step) => (
                <div className="step" key={step.title}>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="gosuslugi" style={{ paddingTop: 20 }}>
          <div className="wrap split">
            <div className="panel">
              <div className="eyebrow">Честно о регистрации</div>
              <h2>Начать можно без Госуслуг</h2>
              <p>
                Чтобы читать чат дома и отправлять заявки, достаточно e-mail или телефона. Мы не просим
                паспортные данные и не тянем вас в офис.
              </p>
              <ul>
                <li>
                  <span className="tick">✓</span>
                  <span>Пароль хранится в виде хеша, а не открытым текстом</span>
                </li>
                <li>
                  <span className="tick">✓</span>
                  <span>Дом выбирается из списка — соседи видят только свой чат</span>
                </li>
                <li>
                  <span className="tick">✓</span>
                  <span>Привязка к Госуслугам появится позже — только для официальных обращений</span>
                </li>
              </ul>
            </div>
            <div className="panel dark">
              <div className="eyebrow" style={{ color: '#c7d2fe' }}>
                Уже есть аккаунт?
              </div>
              <h2>Откройте приложение</h2>
              <p>
                Чаты, заявки и карта — на телефоне и на компьютере. Данные синхронизируются через сервер,
                поэтому начатое на компьютере можно продолжить с телефона.
              </p>
              <a className="btn" style={{ background: '#fff', color: '#4338ca' }} href="/app">
                Войти в Рядом
              </a>
              <div style={{ marginTop: 14, fontSize: 12.5, color: '#c7d2fe' }}>
                Установка: меню браузера → «Установить приложение» или «На главный экран»
              </div>
            </div>
          </div>
        </section>

        <section id="for-uk" style={{ paddingTop: 10 }}>
          <div className="wrap">
            <div className="band">
              <div>
                <h3>Вы из УК, ТСЖ или СНТ?</h3>
                <p>
                  Заявки жителей приходят с фото, адресом и точкой на карте — меньше уточняющих звонков и
                  потерянных обращений. Статус меняет сотрудник управляющей компании.
                </p>
              </div>
              <a className="btn btn-ghost" href="/app">
                Посмотреть кабинет
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="site">
        <div className="wrap">
          <div className="foot">
            <div className="brand" style={{ fontSize: 16 }}>
              <span className="brand-mark" style={{ width: 32, height: 32, borderRadius: 9 }}>
                <svg viewBox="0 0 24 24" style={{ width: 18, height: 18 }} aria-hidden="true">
                  <path d="M12 2.6c-3.9 0-7 3.1-7 6.9 0 5 7 12 7 12s7-7 7-12c0-3.8-3.1-6.9-7-6.9zm0 9.4a2.6 2.6 0 1 1 0-5.2 2.6 2.6 0 0 1 0 5.2z" />
                </svg>
              </span>
              <span>
                Рядом<small>Севастополь</small>
              </span>
            </div>
            <div className="foot-links">
              <a href="/app">Приложение</a>
              <a href="#features">Возможности</a>
              <a href="#how">Как работает</a>
              <a href="#gosuslugi">Регистрация</a>
            </div>
          </div>
          <div className="disclaimer">
            «Рядом» — городской сервис для жителей Севастополя. Часть справочных данных (лента города, профили
            специалистов, демонстрационные заявки) показана для примера. Сервис не является официальным
            порталом органов власти; обращения в ведомства принимаются через профильные каналы.
          </div>
        </div>
      </footer>
    </>
  );
}
