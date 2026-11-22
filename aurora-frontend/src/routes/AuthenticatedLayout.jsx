import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import AppSidebar from './AppSidebar.jsx'
import HomeBreadcrumbLink from '../shared/components/HomeBreadcrumbLink.jsx'
import { useAuth } from '../shared/auth/useAuth.js'
import './AuthenticatedLayout.css'

const ROTULOS = {
  '/': 'Visão geral',
  '/expenses': 'Gastos',
  '/expenses/new': 'Novo gasto',
  '/payable-bills': 'Contas a pagar',
  '/payable-bills/new': 'Nova conta',
  '/receivables': 'Contas a receber',
  '/receivables/new': 'Novo recebimento',
  '/credit-cards': 'Cartões',
  '/financial-overview': 'Visão financeira',
  '/notifications': 'Notificações',
  '/reports-analytics': 'Relatórios',
  '/financial-goals': 'Metas',
  '/family': 'Família',
}

function iniciais(nome) {
  return String(nome ?? '').trim().split(/\s+/).filter(Boolean).slice(0, 2)
    .map((parte) => parte[0].toUpperCase()).join('')
}

export default function AuthenticatedLayout({ children }) {
  const { pathname } = useLocation()
  const { user } = useAuth()
  const nome = user?.name ?? ''
  const [menuAberto, setMenuAberto] = useState(false)
  const rotulo = ROTULOS[pathname]
    ?? (pathname.startsWith('/credit-cards/invoices/') ? 'Fatura' : '')

  useEffect(() => {
    if (!menuAberto) return undefined

    function aoTeclado(evento) {
      if (evento.key === 'Escape') setMenuAberto(false)
    }

    document.addEventListener('keydown', aoTeclado)
    return () => document.removeEventListener('keydown', aoTeclado)
  }, [menuAberto])

  return (
    <div className="app-shell">
      {menuAberto && (
        <button
          type="button"
          className="app-shell__overlay"
          aria-label="Fundo do menu"
          onClick={() => setMenuAberto(false)}
        />
      )}

      <div
        id="app-sidebar"
        className={`app-shell__sidebar${menuAberto ? ' app-shell__sidebar--aberto' : ''}`}
      >
        <AppSidebar onNavigate={() => setMenuAberto(false)} />
      </div>

      <div className="app-shell__main">
        <div className="app-shell__topbar">
          <button
            type="button"
            className="app-shell__menu-button"
            aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={menuAberto}
            aria-controls="app-sidebar"
            onClick={() => setMenuAberto((aberto) => !aberto)}
          >
            <span aria-hidden="true">{menuAberto ? '✕' : '☰'}</span>
          </button>

          <div className="app-shell__breadcrumb">
            <HomeBreadcrumbLink />
            <span aria-hidden="true">›</span>
            <span aria-current="page">{rotulo}</span>
          </div>

          <div className="app-shell__actions">
            {user?.role === 'PRINCIPAL' && (
              <Link className="app-shell__icon-button" to="/notifications" aria-label="Notificações">
                <svg viewBox="0 0 18 18" width="18" height="18" fill="none"
                  stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <path d="M5 12V8a4 4 0 0 1 8 0v4l1.5 2H3.5z" />
                  <path d="M7.5 16a1.5 1.5 0 0 0 3 0" />
                </svg>
              </Link>
            )}
            <span className="app-shell__user">
              <span className="app-shell__avatar" aria-hidden="true">{iniciais(nome)}</span>
              <span>{nome}</span>
            </span>
          </div>
        </div>

        <div className="app-shell__content">{children}</div>
      </div>
    </div>
  )
}
