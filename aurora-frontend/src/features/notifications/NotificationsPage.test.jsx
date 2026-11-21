import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { ApiError } from '../../shared/api/errors.js'
import { listNotifications } from './api/listNotifications.js'
import NotificationsPage from './NotificationsPage.jsx'

vi.mock('./api/listNotifications.js', () => ({ listNotifications: vi.fn() }))

const NOTIFICACOES = {
  notifications: [
    {
      type: 'LEMBRETE_VENCIMENTO',
      description: 'A conta "Aluguel" vence em 2026-11-20.',
      createdAt: '2026-11-18T08:00:00',
    },
    {
      type: 'ALERTA_DESPESAS',
      description: 'As despesas familiares atingiram 85.00% da renda no período; o limite é 80%.',
      createdAt: '2026-11-17T09:30:00',
    },
  ],
}

function renderizar() {
  return render(
    <MemoryRouter>
      <NotificationsPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  listNotifications.mockResolvedValue(NOTIFICACOES)
})

afterEach(() => {
  cleanup()
})

describe('NotificationsPage', () => {
  it('carrega e exibe as notificações retornadas pela API', async () => {
    renderizar()

    const lista = await screen.findByTestId('notifications-lista')
    expect(within(lista).getAllByRole('listitem')).toHaveLength(2)
    expect(listNotifications).toHaveBeenCalledTimes(1)
  })

  it('exibe rótulos compreensíveis para LEMBRETE_VENCIMENTO e ALERTA_DESPESAS', async () => {
    renderizar()

    const lista = await screen.findByTestId('notifications-lista')
    const itens = within(lista).getAllByRole('listitem')
    expect(within(itens[0]).getByText('Lembrete de vencimento')).toBeInTheDocument()
    expect(within(itens[1]).getByText('Alerta de despesas')).toBeInTheDocument()
  })

  it('preserva a descrição integral retornada pelo backend', async () => {
    renderizar()

    expect(await screen.findByText('A conta "Aluguel" vence em 2026-11-20.')).toBeInTheDocument()
    expect(screen.getByText(
      'As despesas familiares atingiram 85.00% da renda no período; o limite é 80%.',
    )).toBeInTheDocument()
  })

  it('exibe data e horário formatados com dateTime válido', async () => {
    renderizar()

    const data = await screen.findByText('18/11/2026 08:00')
    expect(data.tagName).toBe('TIME')
    expect(data).toHaveAttribute('datetime', '2026-11-18T08:00:00')
    expect(screen.getByText('17/11/2026 09:30')).toBeInTheDocument()
  })

  it('usa semântica de região, lista e hierarquia de títulos', async () => {
    renderizar()

    expect(screen.getByRole('heading', { level: 1, name: 'Notificações' })).toBeInTheDocument()
    const secao = await screen.findByRole('region', { name: 'Alertas e lembretes' })
    expect(within(secao).getByRole('heading', { level: 2, name: 'Alertas e lembretes' }))
      .toBeInTheDocument()
    expect(await within(secao).findByRole('list')).toBeInTheDocument()

    const itens = await within(secao).findAllByRole('listitem')
    expect(within(itens[0]).getByRole('heading', { level: 3, name: 'Lembrete de vencimento' }))
      .toBeInTheDocument()
    expect(within(itens[1]).getByRole('heading', { level: 3, name: 'Alerta de despesas' }))
      .toBeInTheDocument()
  })

  it('preserva a ordem retornada pela API', async () => {
    renderizar()

    const lista = await screen.findByTestId('notifications-lista')
    const descricoes = within(lista).getAllByRole('listitem')
      .map((item) => item.querySelector('.notifications__description').textContent)
    expect(descricoes).toEqual([
      'A conta "Aluguel" vence em 2026-11-20.',
      'As despesas familiares atingiram 85.00% da renda no período; o limite é 80%.',
    ])
  })

  it('exibe mensagem quando não há notificações', async () => {
    listNotifications.mockResolvedValue({ notifications: [] })

    renderizar()

    expect(await screen.findByText('Nenhuma notificação no momento.')).toBeInTheDocument()
    expect(screen.queryByTestId('notifications-lista')).not.toBeInTheDocument()
  })

  it('exibe estado de carregamento enquanto consulta', () => {
    listNotifications.mockImplementation(() => new Promise(() => {}))

    renderizar()

    expect(screen.getByText('Carregando notificações...')).toBeInTheDocument()
  })

  it('exibe mensagem de erro da API', async () => {
    listNotifications.mockRejectedValue(new ApiError({
      status: 403,
      erro: 'Acesso negado',
      messages: ['Somente o Principal pode consultar as notificações.'],
    }))

    renderizar()

    expect(await screen.findByRole('alert'))
      .toHaveTextContent('Somente o Principal pode consultar as notificações.')
  })

  it('permite tentar novamente após erro', async () => {
    listNotifications
      .mockRejectedValueOnce(new ApiError({
        status: 500,
        erro: 'Erro interno',
        messages: ['Não foi possível carregar as notificações.'],
      }))
      .mockResolvedValue(NOTIFICACOES)

    renderizar()

    expect(await screen.findByText('Não foi possível carregar as notificações.'))
      .toBeInTheDocument()

    const botao = screen.getByRole('button', { name: 'Tentar novamente' })
    expect(botao).toHaveClass('notifications__retry')
    botao.focus()
    expect(document.activeElement).toBe(botao)
    fireEvent.click(botao)

    expect(await screen.findByTestId('notifications-lista')).toBeInTheDocument()
    await waitFor(() => expect(listNotifications).toHaveBeenCalledTimes(2))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('trata tipo desconhecido sem quebrar a renderização', async () => {
    listNotifications.mockResolvedValue({
      notifications: [{
        type: 'TIPO_DESCONHECIDO',
        description: 'Mensagem de tipo não previsto.',
        createdAt: '2026-11-19T12:00:00',
      }],
    })

    renderizar()

    const lista = await screen.findByTestId('notifications-lista')
    const item = within(lista).getByRole('listitem')
    expect(within(item).getByText('Notificação')).toBeInTheDocument()
    expect(within(item).getByText('Mensagem de tipo não previsto.')).toBeInTheDocument()
    expect(item).toHaveAttribute('data-type', 'TIPO_DESCONHECIDO')
  })

  it('não exibe conteúdo de endividamento', async () => {
    renderizar()

    expect(await screen.findByTestId('notifications-lista')).toBeInTheDocument()
    expect(screen.queryByText(/endividamento/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/30%/)).not.toBeInTheDocument()
    expect(screen.queryByText(/50%/)).not.toBeInTheDocument()
  })
})
