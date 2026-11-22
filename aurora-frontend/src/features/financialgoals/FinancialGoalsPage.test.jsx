import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { ApiError } from '../../shared/api/errors.js'
import { formatCurrency } from '../../shared/format/currency.js'
import { getCategoryVariations } from '../reportsanalytics/api/getCategoryVariations.js'
import { getSavingsSuggestion } from './api/getSavingsSuggestion.js'
import { confirmGoal } from './api/confirmGoal.js'
import { listGoals } from './api/listGoals.js'
import FinancialGoalsPage from './FinancialGoalsPage.jsx'

vi.mock('./api/getSavingsSuggestion.js', () => ({ getSavingsSuggestion: vi.fn() }))
vi.mock('./api/confirmGoal.js', () => ({ confirmGoal: vi.fn() }))
vi.mock('./api/listGoals.js', () => ({ listGoals: vi.fn() }))
vi.mock('../reportsanalytics/api/getCategoryVariations.js', () => ({ getCategoryVariations: vi.fn() }))

const METAS = [{
  id: 'g1',
  targetAmount: 450,
  createdAt: '2026-11-18T10:00:00',
}]

function textoMoeda(valor) {
  return (_, elemento) => elemento?.textContent === formatCurrency(valor)
}

function renderizar() {
  return render(
    <MemoryRouter>
      <FinancialGoalsPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  getSavingsSuggestion.mockResolvedValue({ averageMonthlySurplus: 450 })
  listGoals.mockResolvedValue(METAS)
  confirmGoal.mockResolvedValue({
    id: 'g2', targetAmount: 450, createdAt: '2026-11-19T10:00:00',
  })
})

afterEach(() => {
  cleanup()
})

describe('FinancialGoalsPage', () => {
  it('renderiza cabeçalho e consulta sugestão e metas na entrada', async () => {
    renderizar()

    expect(screen.getByRole('heading', { level: 1, name: 'Metas financeiras' })).toBeInTheDocument()
    expect(await screen.findByText('Sugestão de economia')).toBeInTheDocument()
    expect(getSavingsSuggestion).toHaveBeenCalledTimes(1)
    expect(listGoals).toHaveBeenCalledTimes(1)
  })

  it('exibe a sugestão disponível retornada pelo backend', async () => {
    renderizar()

    expect(await within(screen.getByRole('region', { name: 'Sugestão de economia' })).findByText(textoMoeda(450))).toBeInTheDocument()
    expect(screen.getByText(/Valor de referência para planejamento:/)).toBeInTheDocument()
  })

  it('informa quando não há sugestão (204/null)', async () => {
    getSavingsSuggestion.mockResolvedValue(null)

    renderizar()

    expect(await screen.findByText('Não há sugestão de economia calculada no momento.'))
      .toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Aceitar sugestão' })).not.toBeInTheDocument()
  })

  it('aceita a sugestão mostrando o valor antes de criar a meta', async () => {
    renderizar()
    await within(screen.getByRole('region', { name: 'Sugestão de economia' })).findByText(textoMoeda(450))

    fireEvent.click(screen.getByRole('button', { name: 'Aceitar sugestão' }))

    expect(screen.getByText(/Valor que será cadastrado:/)).toHaveTextContent(/450,00/)
    expect(screen.getByRole('button', { name: 'Confirmar meta' })).toBeInTheDocument()
    expect(confirmGoal).not.toHaveBeenCalled()
  })

  it('permite ajustar o valor antes da confirmação', async () => {
    renderizar()
    await within(screen.getByRole('region', { name: 'Sugestão de economia' })).findByText(textoMoeda(450))

    fireEvent.click(screen.getByRole('button', { name: 'Ajustar valor' }))
    const campo = screen.getByLabelText('Valor da meta')
    expect(campo).toHaveValue(formatCurrency(450))

    fireEvent.change(campo, { target: { value: '600' } })
    fireEvent.click(screen.getByRole('button', { name: 'Revisar valor' }))

    expect(screen.getByText(/Valor que será cadastrado:/)).toHaveTextContent(/600,00/)
    expect(confirmGoal).not.toHaveBeenCalled()
  })

  it('valida valores inválidos sem criar meta', async () => {
    renderizar()
    await within(screen.getByRole('region', { name: 'Sugestão de economia' })).findByText(textoMoeda(450))
    fireEvent.click(screen.getByRole('button', { name: 'Ajustar valor' }))

    const campo = screen.getByLabelText('Valor da meta')
    fireEvent.change(campo, { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Revisar valor' }))
    expect(screen.getByText('Informe o valor da meta.')).toBeInTheDocument()

    fireEvent.change(campo, { target: { value: '1,001' } })
    fireEvent.click(screen.getByRole('button', { name: 'Revisar valor' }))
    expect(screen.getByText('Informe um valor válido com até duas casas decimais.'))
      .toBeInTheDocument()

    expect(confirmGoal).not.toHaveBeenCalled()
  })

  it('cria a meta somente após confirmação explícita, enviando o valor exato', async () => {
    renderizar()
    await within(screen.getByRole('region', { name: 'Sugestão de economia' })).findByText(textoMoeda(450))
    fireEvent.click(screen.getByRole('button', { name: 'Aceitar sugestão' }))
    expect(confirmGoal).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar meta' }))

    await waitFor(() => expect(confirmGoal).toHaveBeenCalledWith({ targetAmount: 450 }))
    expect(await screen.findByText('Meta criada com o valor confirmado.')).toBeInTheDocument()
  })

  it('atualiza a lista de metas após a criação', async () => {
    renderizar()
    await screen.findByTestId('goals-lista')
    expect(listGoals).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Aceitar sugestão' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar meta' }))

    await waitFor(() => expect(listGoals).toHaveBeenCalledTimes(2))
    expect(await screen.findByText('Meta criada com o valor confirmado.')).toBeInTheDocument()
  })

  it('dispensa a sugestão sem chamar API nem persistir recusa', async () => {
    renderizar()
    await within(screen.getByRole('region', { name: 'Sugestão de economia' })).findByText(textoMoeda(450))

    fireEvent.click(screen.getByRole('button', { name: 'Dispensar' }))

    expect(await screen.findByText('Sugestão dispensada nesta sessão.')).toBeInTheDocument()
    expect(confirmGoal).not.toHaveBeenCalled()
    expect(getSavingsSuggestion).toHaveBeenCalledTimes(1)
  })

  it('exibe as metas existentes com valor e data', async () => {
    renderizar()

    const lista = await screen.findByTestId('goals-lista')
    const item = within(lista).getByRole('listitem')
    expect(within(item).getByText(textoMoeda(450))).toBeInTheDocument()
    expect(within(item).getByText(/Criada em 18\/11\/2026 10:00/)).toBeInTheDocument()
  })

  it('exibe estado vazio de metas sem tratar como erro', async () => {
    listGoals.mockResolvedValue([])

    renderizar()

    expect(await screen.findByText('Nenhuma meta cadastrada.')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('exibe erro e permite tentar novamente na sugestão', async () => {
    getSavingsSuggestion
      .mockRejectedValueOnce(new ApiError({
        status: 500, erro: 'Erro interno', messages: ['Não foi possível carregar a sugestão.'],
      }))
      .mockResolvedValue({ averageMonthlySurplus: 450 })

    renderizar()

    expect(await screen.findByText('Não foi possível carregar a sugestão.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(await within(screen.getByRole('region', { name: 'Sugestão de economia' })).findByText(textoMoeda(450))).toBeInTheDocument()
    await waitFor(() => expect(getSavingsSuggestion).toHaveBeenCalledTimes(2))
  })

  it('exibe erro e permite tentar novamente na listagem, sem afetar a sugestão', async () => {
    listGoals
      .mockRejectedValueOnce(new ApiError({
        status: 500, erro: 'Erro interno', messages: ['Não foi possível carregar as metas.'],
      }))
      .mockResolvedValue(METAS)

    renderizar()

    expect(await screen.findByText('Não foi possível carregar as metas.')).toBeInTheDocument()
    expect(await within(screen.getByRole('region', { name: 'Sugestão de economia' })).findByText(textoMoeda(450))).toBeInTheDocument()

    const botao = screen.getByRole('button', { name: 'Tentar novamente' })
    fireEvent.click(botao)

    expect(await screen.findByTestId('goals-lista')).toBeInTheDocument()
    await waitFor(() => expect(listGoals).toHaveBeenCalledTimes(2))
  })

  it('exibe erro ao criar meta e mantém a confirmação aberta', async () => {
    confirmGoal.mockRejectedValueOnce(new ApiError({
      status: 400, erro: 'Dados inválidos',
      messages: ['O valor-alvo deve ser positivo e ter no máximo duas casas decimais.'],
    }))

    renderizar()
    await within(screen.getByRole('region', { name: 'Sugestão de economia' })).findByText(textoMoeda(450))
    fireEvent.click(screen.getByRole('button', { name: 'Aceitar sugestão' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar meta' }))

    expect(await screen.findByText(
      'O valor-alvo deve ser positivo e ter no máximo duas casas decimais.',
    )).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirmar meta' })).toBeInTheDocument()
  })

  it('evita submissões duplicadas enquanto cria a meta', async () => {
    let resolver
    confirmGoal.mockImplementationOnce(() => new Promise((resolve) => { resolver = resolve }))

    renderizar()
    await within(screen.getByRole('region', { name: 'Sugestão de economia' })).findByText(textoMoeda(450))
    fireEvent.click(screen.getByRole('button', { name: 'Aceitar sugestão' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar meta' }))
    fireEvent.click(screen.getByRole('button', { name: 'Criando meta...' }))

    expect(confirmGoal).toHaveBeenCalledTimes(1)
    await act(async () => {
      resolver({ id: 'g2', targetAmount: 450, createdAt: '2026-11-19T10:00:00' })
    })
  })

  it('não introduz cálculos financeiros nem recomendações de RF-017', async () => {
    renderizar()

    expect(await within(screen.getByRole('region', { name: 'Sugestão de economia' })).findByText(textoMoeda(450))).toBeInTheDocument()
    expect(getCategoryVariations).not.toHaveBeenCalled()
    expect(screen.queryByText(/recomendação|conselho|endividamento/i)).not.toBeInTheDocument()
  })

  it('não exibe dados não previstos no contrato', async () => {
    renderizar()

    expect(await screen.findByTestId('goals-lista')).toBeInTheDocument()
    expect(screen.queryByText(/nome da meta|prazo|progresso|valor guardado|valor restante|em andamento|concluída/i))
      .not.toBeInTheDocument()
  })

  it('mantém a listagem funcional quando a sugestão falha', async () => {
    getSavingsSuggestion.mockRejectedValue(new ApiError({
      status: 500, erro: 'Erro interno', messages: ['Não foi possível carregar a sugestão.'],
    }))

    renderizar()

    expect(await screen.findByText('Não foi possível carregar a sugestão.')).toBeInTheDocument()
    expect(await screen.findByTestId('goals-lista')).toBeInTheDocument()
    expect(listGoals).toHaveBeenCalledTimes(1)
  })

  it('cancela a revisão sem criar meta', async () => {
    renderizar()
    await within(screen.getByRole('region', { name: 'Sugestão de economia' })).findByText(textoMoeda(450))

    fireEvent.click(screen.getByRole('button', { name: 'Ajustar valor' }))
    fireEvent.change(screen.getByLabelText('Valor da meta'), { target: { value: '600' } })
    fireEvent.click(screen.getByRole('button', { name: 'Revisar valor' }))
    expect(screen.getByText(/Valor que será cadastrado:/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))

    expect(screen.getByRole('button', { name: 'Aceitar sugestão' })).toBeInTheDocument()
    expect(screen.queryByText(/Valor que será cadastrado:/)).not.toBeInTheDocument()
    expect(confirmGoal).not.toHaveBeenCalled()
  })

  it('permite revisar o valor pressionando Enter no campo', async () => {
    renderizar()
    await within(screen.getByRole('region', { name: 'Sugestão de economia' })).findByText(textoMoeda(450))

    fireEvent.click(screen.getByRole('button', { name: 'Ajustar valor' }))
    const campo = screen.getByLabelText('Valor da meta')
    fireEvent.change(campo, { target: { value: '600' } })
    fireEvent.submit(campo.closest('form'))

    expect(screen.getByText(/Valor que será cadastrado:/)).toHaveTextContent(/600,00/)
    expect(confirmGoal).not.toHaveBeenCalled()
  })
})
