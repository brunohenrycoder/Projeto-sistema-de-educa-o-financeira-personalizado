import { NavLink } from 'react-router-dom'
import LogoutButton from '../features/auth/LogoutButton.jsx'
import { useAuth } from '../shared/auth/useAuth.js'
import './AppSidebar.css'

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
    <svg className="sidebar__icon" viewBox="0 0 18 18" fill="none" stroke="currentColor"
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONES[nome]}
    </svg>
  )
}

function iniciais(nome) {
  return String(nome ?? '').trim().split(/\s+/).filter(Boolean).slice(0, 2)
    .map((parte) => parte[0].toUpperCase()).join('')
}

export default function AppSidebar({ onNavigate }) {
  const { user } = useAuth()
  const nome = user?.name ?? ''
  const ePrincipal = user?.role === 'PRINCIPAL'
  const links = ePrincipal ? LINKS_PRINCIPAL : LINKS_DEPENDENTE

  return (
    <nav className="sidebar" aria-label="Navegação principal">
      <p className="sidebar__brand">
        <span className="sidebar__brand-mark" aria-hidden="true">✳</span>
        Aurora
      </p>

      <div className="sidebar__family">
        <span className="sidebar__avatar" aria-hidden="true">{iniciais(nome)}</span>
        <span className="sidebar__family-info">
          <strong>Família</strong>
          <span>{ePrincipal ? 'Perfil responsável' : 'Perfil dependente'}</span>
        </span>
        <span className="sidebar__chevron" aria-hidden="true">⌄</span>
      </div>

      <p className="sidebar__menu-label">Menu principal</p>

      <ul className="sidebar__links">
        {links.map(({ to, label, end, icon }) => (
          <li key={to}>
            <NavLink to={to} end={end} className="sidebar__link" onClick={onNavigate}>
              <Icone nome={icon} />
              <span>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>

      <div className="sidebar__footer">
        <p className="sidebar__note">
          Um passo de cada vez.
          <br />
          Seu futuro financeiro começa hoje.
        </p>
        <div className="sidebar__user">
          <span className="sidebar__avatar" aria-hidden="true">{iniciais(nome)}</span>
          <span className="sidebar__user-info">
            <span>{nome}</span>
            <span>{ePrincipal ? 'Responsável' : 'Dependente'}</span>
          </span>
        </div>
        <LogoutButton />
      </div>
    </nav>
  )
}
