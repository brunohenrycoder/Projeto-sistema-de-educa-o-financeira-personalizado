import { useEffect, useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import LogoutButton from '../features/auth/LogoutButton.jsx'
import HomeBreadcrumbLink from '../shared/components/HomeBreadcrumbLink.jsx'
import HomeFinancialSection from '../features/home/HomeFinancialSection.jsx'
import HomeGoalsSummary from '../features/home/HomeGoalsSummary.jsx'
import HomeSavingsSuggestion from '../features/home/HomeSavingsSuggestion.jsx'
import HomeRecentExpenses from '../features/home/HomeRecentExpenses.jsx'
import HomeUpcomingBills from '../features/home/HomeUpcomingBills.jsx'
import { useAuth } from '../shared/auth/useAuth.js'
import { formatDate } from '../shared/format/date.js'
import './AuthenticatedHome.css'

const LINKS_PRINCIPAL = [
  { to: '/', label: 'Visão geral', end: true, icon: 'home' },
  { to: '/payable-bills', label: 'Contas a pagar', icon: 'calendar' },
  { to: '/receivables', label: 'Contas a receber', icon: 'inbox' },
  { to: '/expenses', label: 'Gastos da família', end: true, icon: 'receipt' },
  { to: '/expenses/new', label: 'Lançar gasto', end: true, icon: 'plus' },
  { to: '/credit-cards', label: 'Cartões e faturas', icon: 'card' },
  { to: '/family', label: 'Família', icon: 'users' },
  { to: '/financial-overview', label: 'Visão financeira', icon: 'chart' },
  { to: '/notifications', label: 'Alertas', icon: 'bell' },
  { to: '/reports-analytics', label: 'Relatórios e análises', icon: 'bars' },
  { to: '/financial-goals', label: 'Metas financeiras', icon: 'target' },
]

const LINKS_DEPENDENTE = [
  { to: '/', label: 'Visão geral', end: true, icon: 'home' },
  { to: '/expenses', label: 'Meus gastos', end: true, icon: 'receipt' },
  { to: '/expenses/new', label: 'Lançar gasto', end: true, icon: 'plus' },
]

const ICONES = {
  home: <><path d="M3 8.5 9 3l6 5.5" /><path d="M5 8v7h8V8" /><path d="M8 15v-4h2v4" /></>,
  calendar: <><rect x="3" y="4" width="12" height="11" rx="2" /><path d="M3 8h12M6 2v3M12 2v3" /></>,
  inbox: <><path d="M2.5 10.5 5 4h8l2.5 6.5" /><path d="M2.5 10.5h3l1 2h5l1-2h3V15H2.5z" /></>,
  receipt: <><path d="M4 2h10v14l-2-1.5L10 16l-2-1.5L6 16 4 14.5z" /><path d="M7 6h4M7 9h4" /></>,
  plus: <><circle cx="9" cy="9" r="6.5" /><path d="M9 6v6M6 9h6" /></>,
  card: <><rect x="2" y="4" width="14" height="10" rx="2" /><path d="M2 8h14M5 11h3" /></>,
  users: <><circle cx="6.5" cy="7" r="2.5" /><path d="M2 15c0-2.5 2-4 4.5-4S11 12.5 11 15" /><path d="M11 5.5a2.5 2.5 0 0 1 0 5M12 12c2 .4 3 1.7 3 3" /></>,
  chart: <><path d="M3 15V9M7 15V5M11 15v-4M15 15V7" /><path d="M2 17h14" /></>,
  bell: <><path d="M5 12V8a4 4 0 0 1 8 0v4l1.5 2H3.5z" /><path d="M7.5 16a1.5 1.5 0 0 0 3 0" /></>,
  bars: <><rect x="3" y="9" width="2.5" height="6" rx="1" /><rect x="7.5" y="5" width="2.5" height="10" rx="1" /><rect x="12" y="11" width="2.5" height="4" rx="1" /></>,
  target: <><circle cx="9" cy="9" r="6.5" /><circle cx="9" cy="9" r="3" /><circle cx="9" cy="9" r="0.6" /></>,
}

function Icone({ nome }) {
  return (
    <svg
      className="home__icon"
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONES[nome]}
    </svg>
  )
}

function dataAtualIso() {
  const agora = new Date()
  const ano = agora.getFullYear()
  const mes = String(agora.getMonth() + 1).padStart(2, '0')
  const dia = String(agora.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

function iniciais(nome) {
  return String(nome ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0].toUpperCase())
    .join('')
}

export default function AuthenticatedHome() {
  const { user } = useAuth()
  const nome = user?.name ?? ''
  const perfil = user?.role === 'PRINCIPAL' ? 'Responsável' : 'Dependente'
  const links = user?.role === 'PRINCIPAL' ? LINKS_PRINCIPAL : LINKS_DEPENDENTE
  const dataIso = dataAtualIso()
  const [menuAberto, setMenuAberto] = useState(false)

  useEffect(() => {
    if (!menuAberto) return undefined

    function aoTeclado(evento) {
      if (evento.key === 'Escape') setMenuAberto(false)
    }

    document.addEventListener('keydown', aoTeclado)
    return () => document.removeEventListener('keydown', aoTeclado)
  }, [menuAberto])

  return (
    <div className="home">
      {menuAberto && (
        <button
          type="button"
          className="home__overlay"
          aria-label="Fundo do menu"
          onClick={() => setMenuAberto(false)}
        />
      )}

      <nav
        id="home-menu"
        className={`home__nav${menuAberto ? ' home__nav--aberto' : ''}`}
        aria-label="Navegação principal"
      >
        <p className="home__brand">
          <span className="home__brand-mark" aria-hidden="true">✳</span>
          Aurora
        </p>

        <div className="home__family-card">
          <span className="home__avatar" aria-hidden="true">{iniciais(nome)}</span>
          <span className="home__family-info">
            <strong>Família</strong>
            <span>
              {user?.role === 'PRINCIPAL' ? 'Perfil responsável' : 'Perfil dependente'}
            </span>
          </span>
          <span className="home__chevron" aria-hidden="true">⌄</span>
        </div>

        <p className="home__menu-label">Menu principal</p>

        <ul className="home__links">
          {links.map(({ to, label, end, icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className="home__link"
                onClick={() => setMenuAberto(false)}
              >
                <Icone nome={icon} />
                <span>{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="home__nav-footer">
          <p className="home__aside-note">
            Um passo de cada vez.
            <br />
            Seu futuro financeiro começa hoje.
          </p>
          <div className="home__user">
            <span className="home__avatar" aria-hidden="true">
              {iniciais(nome)}
            </span>
            <span className="home__user-info">
              <span className="home__user-name">{nome}</span>
              <span className="home__user-role">{perfil}</span>
            </span>
          </div>
          <LogoutButton />
        </div>
      </nav>

      <main className="home__main">
        <div className="home__topbar">
          <button
            type="button"
            className="home__menu-button"
            aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={menuAberto}
            aria-controls="home-menu"
            onClick={() => setMenuAberto((aberto) => !aberto)}
          >
            <span aria-hidden="true">{menuAberto ? '✕' : '☰'}</span>
          </button>

          <nav className="home__breadcrumb" aria-label="Trilha de navegação">
            <HomeBreadcrumbLink />
            <span aria-hidden="true">›</span>
            <span aria-current="page">Visão geral</span>
          </nav>

          <div className="home__topbar-actions">
            {user?.role === 'PRINCIPAL' && (
              <Link className="home__icon-button" to="/notifications" aria-label="Notificações">
                <Icone nome="bell" />
              </Link>
            )}
            <span className="home__topbar-user">
              <span className="home__avatar home__avatar--small" aria-hidden="true">
                {iniciais(nome)}
              </span>
              <span>{nome}</span>
            </span>
          </div>
        </div>

        <header className="home__header">
          <div className="home__header-texto">
            <p className="home__eyebrow">Finanças em família</p>
            <h1 className="home__title">Visão geral</h1>
            <p className="home__greeting">{nome ? `Olá, ${nome}!` : 'Olá!'}</p>
            <p className="home__intro">
              Vamos cuidar do dinheiro da família, um passo de cada vez.
            </p>
            <p className="home__note">
              Autenticação realizada. Você está na sua conta Aurora.
            </p>
          </div>
          <div className="home__header-meta">
            <span className="home__period-chip">
              <Icone nome="calendar" />
              {new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
                .format(new Date(Number(dataIso.slice(0, 4)), Number(dataIso.slice(5, 7)) - 1, 1))}
            </span>
            <time className="home__date" dateTime={dataIso}>
              {formatDate(dataIso)}
            </time>
          </div>
        </header>

        <section className="home__content" aria-label="Conteúdo da visão geral">
          {user?.role === 'PRINCIPAL' && (
            <>
              <HomeFinancialSection />
              <div className="home__lists">
                <HomeUpcomingBills />
                <HomeRecentExpenses />
              </div>
              <div className="home__goals">
                <HomeSavingsSuggestion />
                <HomeGoalsSummary />
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  )
}
