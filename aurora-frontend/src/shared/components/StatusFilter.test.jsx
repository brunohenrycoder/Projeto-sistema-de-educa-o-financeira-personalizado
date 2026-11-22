import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import StatusFilter from './StatusFilter.jsx'

const OPCOES = [
  { id: 'pendentes', rotulo: 'Pendentes', quantidade: 2 },
  { id: 'concluidas', rotulo: 'Concluídas', quantidade: 1 },
  { id: 'canceladas', rotulo: 'Canceladas', quantidade: 0 },
]

afterEach(() => {
  cleanup()
})

describe('StatusFilter', () => {
  it('exibe as opções com seus contadores e a seleção atual', () => {
    render(
      <StatusFilter
        label="Visualizar por status"
        options={OPCOES}
        value="pendentes"
        onChange={vi.fn()}
      />,
    )

    const grupo = screen.getByRole('group', { name: 'Visualizar por status' })
    expect(grupo).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pendentes' }))
      .toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Concluídas' }))
      .toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Pendentes' })
      .querySelector('.status-filter__count')).toHaveTextContent('2')
  })

  it('notifica a mudança de visualização por teclado ou clique', () => {
    const onChange = vi.fn()
    render(
      <StatusFilter
        label="Visualizar por status"
        options={OPCOES}
        value="pendentes"
        onChange={onChange}
      />,
    )

    const botao = screen.getByRole('button', { name: 'Canceladas' })
    botao.focus()
    expect(document.activeElement).toBe(botao)

    fireEvent.click(botao)
    expect(onChange).toHaveBeenCalledWith('canceladas')
  })
})
