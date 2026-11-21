import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { ApiError } from '../../shared/api/errors.js'
import { getSavingsSuggestion } from '../financialgoals/api/getSavingsSuggestion.js'
import { listGoals } from '../financialgoals/api/listGoals.js'
import { confirmGoal } from '../financialgoals/api/confirmGoal.js'
import HomeGoalsSummary from './HomeGoalsSummary.jsx'
import HomeSavingsSuggestion from './HomeSavingsSuggestion.jsx'

vi.mock('../financialgoals/api/getSavingsSuggestion.js', () => ({ getSavingsSuggestion: vi.fn() }))
vi.mock('../financialgoals/api/listGoals.js', () => ({ listGoals: vi.fn() }))
vi.mock('../financialgoals/api/confirmGoal.js', () => ({ confirmGoal: vi.fn() }))

const METAS = [
  { id: 'm1', targetAmount: 450, createdAt: '2026-11-18T10:00:00' },
  { id: 'm2', targetAmount: 600, createdAt: '2026-11-17T09:00:00' },
  { id: 'm3', targetAmount: 750, createdAt: '2026-11-16T08:00:00' },
  { id: 'm4', targetAmount: 900, createdAt: '2026-11-15T07:00:00' },
  { id: 'm5', targetAmount: 1000, createdAt: '2026-11-14T06:00:00' },
  { id: 'm6', targetAmount: 1200, createdAt: '2026-11-13T05:00:00' },
]

function erroApi(mensagem) {
  return new ApiError({
    status: 500,
    erro: 'Erro interno',
    messages: [mensagem],
    caminho: '/api/teste',
  })
}

function renderizarSugestao() {
  return render(
    <MemoryRouter>
      <HomeSavingsSuggestion />
    </MemoryRouter>,
  )
}

function renderizarMetas() {
  return render(
    <MemoryRouter>
      <HomeGoalsSummary />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  getSavingsSuggestion.mockResolvedValue({ averageMonthlySurplus: 450 })
  listGoals.mockResolvedValue(METAS)
})

afterEach(() => {
  cleanup()
})

describe('Sugestão de economia na Home', () => {
  it('consome o serviço existente ao montar', async () => {
    renderizarSugestao()

    await waitFor(() => expect(getSavingsSuggestion).toHaveBeenCalledTimes(1))
  })

  it('exibe o valor retornado com rótulo neutro e link para a página completa', async () => {
    renderizarSugestao()

    expect(await screen.findByText(/450,00/)).toBeInTheDocument()
    expect(screen.getByText(/Valor de referência para planejamento/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver metas financeiras' })).toHaveAttribute('href', '/financial-goals')
  })

  it('não cria metas nem oferece ações de aceitar, ajustar, dispensar ou confirmar', async () => {
    renderizarSugestao()

    await screen.findByText(/450,00/)
    expect(confirmGoal).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: /aceitar|ajustar|dispensar|confirmar/i })).not.toBeInTheDocument()
  })

  it('não exibe recomendações, prazos ou progresso', async () => {
    renderizarSugestao()

    await screen.findByText(/450,00/)
    expect(screen.queryByText(/recomendação|conselho|prazo|progresso|guardado/i)).not.toBeInTheDocument()
  })

  it('exibe estado vazio quando a API retorna null (204)', async () => {
    getSavingsSuggestion.mockResolvedValue(null)
    renderizarSugestao()

    expect(await screen.findByText('Não há sugestão de economia calculada no momento.')).toBeInTheDocument()
  })

  it('exibe erro e permite retry', async () => {
    getSavingsSuggestion
      .mockRejectedValueOnce(erroApi('Não foi possível carregar a sugestão.'))
      .mockResolvedValueOnce({ averageMonthlySurplus: 450 })
    renderizarSugestao()

    expect(await screen.findByText('Não foi possível carregar a sugestão.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    expect(await screen.findByText(/450,00/)).toBeInTheDocument()
    expect(getSavingsSuggestion).toHaveBeenCalledTimes(2)
  })
})

describe('Metas cadastradas na Home', () => {
  it('consome o serviço existente ao montar', async () => {
    renderizarMetas()

    await waitFor(() => expect(listGoals).toHaveBeenCalledTimes(1))
  })

  it('exibe no máximo cinco metas preservando a ordem da API', async () => {
    renderizarMetas()

    await screen.findByText(/450,00/)
    const itens = screen.getAllByRole('listitem')
    expect(itens).toHaveLength(5)
    expect(itens[0]).toHaveTextContent(/450,00/)
    expect(itens[1]).toHaveTextContent(/600,00/)
    expect(itens[2]).toHaveTextContent(/750,00/)
    expect(itens[3]).toHaveTextContent(/900,00/)
    expect(itens[4]).toHaveTextContent(/1\.000,00/)
    expect(screen.queryByText(/1\.200,00/)).not.toBeInTheDocument()
  })

  it('exibe somente valor-alvo e data de criação', async () => {
    renderizarMetas()

    await screen.findByText(/450,00/)
    const itens = screen.getAllByRole('listitem')
    expect(within(itens[0]).getByText(/450,00/)).toBeInTheDocument()
    expect(within(itens[0]).getByText(/Criada em 18\/11\/2026 10:00/)).toBeInTheDocument()
    expect(screen.queryByText(/prazo|progresso|guardado|status/i)).not.toBeInTheDocument()
  })

  it('oferece link para a página completa de metas', () => {
    renderizarMetas()

    expect(screen.getByRole('link', { name: 'Ver metas financeiras' })).toHaveAttribute('href', '/financial-goals')
  })

  it('exibe estado vazio quando não há metas', async () => {
    listGoals.mockResolvedValue([])
    renderizarMetas()

    expect(await screen.findByText('Nenhuma meta cadastrada.')).toBeInTheDocument()
  })

  it('exibe erro e permite retry', async () => {
    listGoals
      .mockRejectedValueOnce(erroApi('Não foi possível carregar as metas.'))
      .mockResolvedValueOnce(METAS)
    renderizarMetas()

    expect(await screen.findByText('Não foi possível carregar as metas.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    expect(await screen.findByText(/450,00/)).toBeInTheDocument()
    expect(listGoals).toHaveBeenCalledTimes(2)
  })
})

describe('Independência entre os blocos', () => {
  it('falha na sugestão não impede a exibição das metas', async () => {
    getSavingsSuggestion.mockRejectedValue(erroApi('Falha na sugestão.'))
    render(
      <MemoryRouter>
        <HomeSavingsSuggestion />
        <HomeGoalsSummary />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Falha na sugestão.')).toBeInTheDocument()
    expect(await screen.findByText(/450,00/)).toBeInTheDocument()
  })

  it('falha nas metas não impede a exibição da sugestão', async () => {
    listGoals.mockRejectedValue(erroApi('Falha nas metas.'))
    render(
      <MemoryRouter>
        <HomeSavingsSuggestion />
        <HomeGoalsSummary />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Falha nas metas.')).toBeInTheDocument()
    expect(await screen.findByText(/Valor de referência para planejamento/)).toBeInTheDocument()
  })
})
