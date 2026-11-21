import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../../shared/auth/AuthContext.jsx'

vi.mock('./api/listMembers.js', () => ({ listMembers: vi.fn() }))
vi.mock('./api/inviteDependent.js', () => ({ inviteDependent: vi.fn() }))
vi.mock('./api/updateMember.js', () => ({ updateMember: vi.fn() }))
vi.mock('./api/removeMember.js', () => ({ removeMember: vi.fn() }))

import { ApiError } from '../../shared/api/errors.js'
import { inviteDependent } from './api/inviteDependent.js'
import { listMembers } from './api/listMembers.js'
import { removeMember } from './api/removeMember.js'
import { updateMember } from './api/updateMember.js'
import FamilyPage from './FamilyPage.jsx'

const MEMBROS = [
  {
    id: 'u1',
    name: 'Ana Silva',
    email: 'ana@example.com',
    role: 'PRINCIPAL',
    status: 'ATIVO',
    createdAt: '2026-11-18T10:00:00',
  },
  {
    id: 'u2',
    name: 'Pedro Silva',
    email: 'filho@example.com',
    role: 'DEPENDENTE',
    status: 'ATIVO',
    createdAt: '2026-11-18T10:30:00',
  },
]

const SESSION_KEY = 'aurora.session'

function sessaoPrincipal() {
  return JSON.stringify({
    accessToken: 'jwt-de-teste',
    tokenType: 'Bearer',
    expiresIn: 3600,
    expiresAt: Date.now() + 3_600_000,
    userId: 'u1',
    familyGroupId: 'f1',
    name: 'Ana Silva',
    email: 'ana@example.com',
    role: 'PRINCIPAL',
  })
}

function renderizar() {
  return render(
    <AuthProvider>
      <FamilyPage />
    </AuthProvider>,
  )
}

const CONVITE_RESPOSTA = {
  inviteId: 'i1',
  familyGroupId: 'f1',
  invitedEmail: 'filho@example.com',
  status: 'PENDENTE',
  createdAt: '2026-11-18T10:00:00',
  expiresAt: '2026-11-20T10:00:00',
}

const MEMBRO_ATUALIZADO = {
  id: 'u2',
  name: 'Pedro Atualizado',
  email: 'pedro@example.com',
  role: 'DEPENDENTE',
  status: 'ATIVO',
  createdAt: '2026-11-18T10:30:00',
}

beforeEach(() => {
  vi.clearAllMocks()
  sessionStorage.setItem(SESSION_KEY, sessaoPrincipal())
  listMembers.mockResolvedValue(MEMBROS)
  inviteDependent.mockResolvedValue(CONVITE_RESPOSTA)
  updateMember.mockResolvedValue(MEMBRO_ATUALIZADO)
  removeMember.mockResolvedValue(null)
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  sessionStorage.clear()
})

describe('FamilyPage', () => {
  it('exibe carregamento enquanto busca os membros', async () => {
    listMembers.mockImplementation(() => new Promise(() => {}))

    renderizar()

    expect(screen.getByRole('status')).toHaveTextContent('Carregando membros...')
    await waitFor(() => expect(listMembers).toHaveBeenCalledTimes(1))
  })

  it('exibe os membros retornados pelo backend conforme o contrato', async () => {
    listMembers.mockResolvedValue(MEMBROS)

    renderizar()

    expect(await screen.findByText('Ana Silva')).toBeInTheDocument()
    expect(screen.getByText('ana@example.com')).toBeInTheDocument()
    expect(screen.getByText('Pedro Silva')).toBeInTheDocument()
    expect(screen.getByText('filho@example.com')).toBeInTheDocument()
    expect(screen.getByText(/Responsável/)).toBeInTheDocument()
    expect(screen.getByText(/Dependente · ATIVO · desde 18\/11\/2026/)).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('exibe mensagem quando não há membros', async () => {
    listMembers.mockResolvedValue([])

    renderizar()

    expect(await screen.findByText('Nenhum membro encontrado no grupo familiar.')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('exibe as mensagens da API e permite tentar novamente', async () => {
    listMembers
      .mockRejectedValueOnce(new ApiError({
        status: 403,
        erro: 'Acesso negado',
        messages: ['Somente o principal pode administrar o grupo familiar.'],
        caminho: '/api/familymanagement/members',
      }))
      .mockResolvedValueOnce(MEMBROS)

    renderizar()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Somente o principal pode administrar o grupo familiar.',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    expect(await screen.findByText('Ana Silva')).toBeInTheDocument()
    expect(listMembers).toHaveBeenCalledTimes(2)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  describe('convite de dependente', () => {
    function preencherEmail(valor) {
      fireEvent.change(screen.getByLabelText('E-mail do dependente'), {
        target: { value: valor },
      })
    }

    function enviar() {
      fireEvent.click(screen.getByRole('button', { name: 'Enviar convite' }))
    }

    it('exibe o formulário de convite', () => {
      renderizar()

      expect(screen.getByRole('heading', { name: 'Convidar dependente' })).toBeInTheDocument()
      expect(screen.getByLabelText('E-mail do dependente')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Enviar convite' })).toBeInTheDocument()
    })

    it('exige o e-mail sem chamar o serviço', async () => {
      renderizar()

      enviar()

      expect(await screen.findByText('Informe o e-mail do dependente.')).toBeInTheDocument()
      expect(inviteDependent).not.toHaveBeenCalled()
    })

    it('rejeita e-mail inválido sem chamar o serviço', async () => {
      renderizar()

      preencherEmail('invalido')
      enviar()

      expect(await screen.findByText('Informe um e-mail válido.')).toBeInTheDocument()
      expect(inviteDependent).not.toHaveBeenCalled()
    })

    it('envia o convite com o e-mail informado e exibe feedback de sucesso', async () => {
      renderizar()

      preencherEmail('filho@example.com')
      enviar()

      await waitFor(() => expect(inviteDependent).toHaveBeenCalledWith({ email: 'filho@example.com' }))
      expect(await screen.findByRole('status')).toHaveTextContent(
        'Convite enviado para filho@example.com.',
      )
    })

    it('limpa o campo de e-mail após o sucesso', async () => {
      renderizar()

      preencherEmail('filho@example.com')
      enviar()

      await screen.findByText('Convite enviado para filho@example.com.')
      expect(screen.getByLabelText('E-mail do dependente')).toHaveValue('')
    })

    it('exibe as mensagens de erro da API', async () => {
      inviteDependent.mockRejectedValue(new ApiError({
        status: 409,
        erro: 'Conflito de dados',
        messages: ['Já existe um usuário cadastrado com este e-mail.'],
        caminho: '/api/familymanagement/invite',
      }))
      renderizar()

      preencherEmail('filho@example.com')
      enviar()

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Já existe um usuário cadastrado com este e-mail.',
      )
      expect(screen.queryByText(/Convite enviado/)).not.toBeInTheDocument()
    })

    it('desabilita o botão e previne envio duplicado durante o carregamento', async () => {
      let resolver
      inviteDependent.mockImplementation(() => new Promise((resolve) => { resolver = resolve }))
      renderizar()

      preencherEmail('filho@example.com')
      enviar()
      // O botão agora é "Enviando..."; um segundo clique não deve gerar nova chamada.
      fireEvent.click(screen.getByRole('button', { name: 'Enviando...' }))

      await waitFor(() => expect(inviteDependent).toHaveBeenCalledTimes(1))
      expect(screen.getByRole('button', { name: 'Enviando...' })).toBeDisabled()

      resolver(CONVITE_RESPOSTA)
      await screen.findByText('Convite enviado para filho@example.com.')
      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Enviar convite' })).toBeEnabled(),
      )
    })

    it('mantém a listagem de membros funcionando com o formulário presente', async () => {
      renderizar()

      expect(await screen.findByText('Ana Silva')).toBeInTheDocument()
      expect(screen.getByText('Pedro Silva')).toBeInTheDocument()
      expect(listMembers).toHaveBeenCalledTimes(1)
    })
  })

  describe('edição de membro', () => {
    async function abrirEdicaoPedro() {
      const botoes = await screen.findAllByRole('button', { name: 'Editar' })
      fireEvent.click(botoes[1])
    }

    it('exibe a ação de editar para os membros listados', async () => {
      renderizar()

      const botoes = await screen.findAllByRole('button', { name: 'Editar' })
      expect(botoes).toHaveLength(2)
    })

    it('abre o formulário com os dados atuais do membro', async () => {
      renderizar()

      await abrirEdicaoPedro()

      expect(screen.getByLabelText('Nome')).toHaveValue('Pedro Silva')
      expect(screen.getByLabelText('E-mail')).toHaveValue('filho@example.com')
    })

    it('valida nome e e-mail obrigatórios', async () => {
      renderizar()
      await abrirEdicaoPedro()

      fireEvent.change(screen.getByLabelText('Nome'), { target: { value: '' } })
      fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: '' } })
      fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

      expect(await screen.findByText('Informe o nome.')).toBeInTheDocument()
      expect(screen.getByText('Informe o e-mail.')).toBeInTheDocument()
      expect(updateMember).not.toHaveBeenCalled()
    })

    it('valida o formato do e-mail', async () => {
      renderizar()
      await abrirEdicaoPedro()

      fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'invalido' } })
      fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

      expect(await screen.findByText('Informe um e-mail válido.')).toBeInTheDocument()
      expect(updateMember).not.toHaveBeenCalled()
    })

    it('cancela a edição sem chamar o serviço', async () => {
      renderizar()
      await abrirEdicaoPedro()

      fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

      expect(screen.queryByLabelText('Nome')).not.toBeInTheDocument()
      expect(screen.getByText('Pedro Silva')).toBeInTheDocument()
      expect(updateMember).not.toHaveBeenCalled()
    })

    it('envia os dados válidos com o ID correto e atualiza a listagem', async () => {
      renderizar()
      await abrirEdicaoPedro()

      fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Pedro Atualizado' } })
      fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'pedro@example.com' } })
      fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

      await waitFor(() =>
        expect(updateMember).toHaveBeenCalledWith('u2', {
          name: 'Pedro Atualizado',
          email: 'pedro@example.com',
        }),
      )
      expect(await screen.findByText('Dados do membro atualizados.')).toBeInTheDocument()
      expect(screen.getByText('Pedro Atualizado')).toBeInTheDocument()
      expect(screen.getByText('pedro@example.com')).toBeInTheDocument()
      expect(screen.queryByText('Pedro Silva')).not.toBeInTheDocument()
      expect(screen.queryByLabelText('Nome')).not.toBeInTheDocument()
      expect(listMembers).toHaveBeenCalledTimes(1)
    })

    it('exibe as mensagens de erro da API e mantém o modo de edição', async () => {
      updateMember.mockRejectedValue(new ApiError({
        status: 404,
        erro: 'Integrante não encontrado',
        messages: ['Integrante não encontrado no grupo familiar.'],
        caminho: '/api/familymanagement/members/u2',
      }))
      renderizar()
      await abrirEdicaoPedro()

      fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Integrante não encontrado no grupo familiar.',
      )
      expect(screen.getByLabelText('Nome')).toBeInTheDocument()
      expect(screen.queryByText('Dados do membro atualizados.')).not.toBeInTheDocument()
    })

    it('previne envio duplicado durante o carregamento', async () => {
      let resolver
      updateMember.mockImplementation(() => new Promise((resolve) => { resolver = resolve }))
      renderizar()
      await abrirEdicaoPedro()
      fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

      await waitFor(() => expect(updateMember).toHaveBeenCalledTimes(1))
      fireEvent.click(screen.getByRole('button', { name: 'Salvando...' }))
      expect(updateMember).toHaveBeenCalledTimes(1)
      expect(screen.getByRole('button', { name: 'Salvando...' })).toBeDisabled()

      resolver(MEMBRO_ATUALIZADO)
      await screen.findByText('Dados do membro atualizados.')
      await waitFor(() => expect(screen.getByText('Pedro Atualizado')).toBeInTheDocument())
    })
  })

  describe('remoção de membro', () => {
    async function abrirConfirmacaoPedro() {
      const botoes = await screen.findAllByRole('button', { name: 'Remover' })
      fireEvent.click(botoes[0])
    }

    it('exibe a ação Remover apenas para membros elegíveis', async () => {
      renderizar()

      const botoes = await screen.findAllByRole('button', { name: 'Remover' })
      expect(botoes).toHaveLength(1)
      expect(screen.getAllByRole('button', { name: 'Editar' })).toHaveLength(2)
    })

    it('abre a confirmação identificando o membro', async () => {
      renderizar()
      await abrirConfirmacaoPedro()

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Remover Pedro Silva?')).toBeInTheDocument()
    })

    it('cancela a remoção sem chamar o serviço', async () => {
      renderizar()
      await abrirConfirmacaoPedro()

      fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(screen.getByText('Pedro Silva')).toBeInTheDocument()
      expect(removeMember).not.toHaveBeenCalled()
    })

    it('confirma a remoção com o ID correto e retira o membro da listagem', async () => {
      renderizar()
      await abrirConfirmacaoPedro()

      fireEvent.click(screen.getByRole('button', { name: 'Confirmar remoção' }))

      await waitFor(() => expect(removeMember).toHaveBeenCalledWith('u2'))
      expect(await screen.findByText('Pedro Silva foi removido do grupo familiar.')).toBeInTheDocument()
      expect(screen.queryByText('Pedro Silva')).not.toBeInTheDocument()
      expect(screen.getByText('Ana Silva')).toBeInTheDocument()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(listMembers).toHaveBeenCalledTimes(1)
    })

    it('apresenta estado de carregamento e previne solicitações duplicadas', async () => {
      let resolver
      removeMember.mockImplementation(() => new Promise((resolve) => { resolver = resolve }))
      renderizar()
      await abrirConfirmacaoPedro()
      fireEvent.click(screen.getByRole('button', { name: 'Confirmar remoção' }))

      await waitFor(() => expect(removeMember).toHaveBeenCalledTimes(1))
      fireEvent.click(screen.getByRole('button', { name: 'Removendo...' }))
      expect(removeMember).toHaveBeenCalledTimes(1)
      expect(screen.getByRole('button', { name: 'Removendo...' })).toBeDisabled()

      resolver(null)
      await screen.findByText('Pedro Silva foi removido do grupo familiar.')
      expect(screen.queryByText('Pedro Silva')).not.toBeInTheDocument()
    })

    it('exibe as mensagens de erro da API sem remover o membro da listagem', async () => {
      removeMember.mockRejectedValue(new ApiError({
        status: 404,
        erro: 'Integrante não encontrado',
        messages: ['Integrante não encontrado no grupo familiar.'],
        caminho: '/api/familymanagement/members/u2',
      }))
      renderizar()
      await abrirConfirmacaoPedro()

      fireEvent.click(screen.getByRole('button', { name: 'Confirmar remoção' }))

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Integrante não encontrado no grupo familiar.',
      )
      expect(screen.getByText('Pedro Silva')).toBeInTheDocument()
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.queryByText(/foi removido do grupo/)).not.toBeInTheDocument()
    })

    it('mantém listagem, convite e edição funcionando após a remoção', async () => {
      renderizar()
      await abrirConfirmacaoPedro()
      fireEvent.click(screen.getByRole('button', { name: 'Confirmar remoção' }))
      await screen.findByText('Pedro Silva foi removido do grupo familiar.')

      expect(screen.getByText('Ana Silva')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Enviar convite' })).toBeInTheDocument()
      fireEvent.change(screen.getByLabelText('E-mail do dependente'), {
        target: { value: 'novo@example.com' },
      })
      fireEvent.click(screen.getByRole('button', { name: 'Enviar convite' }))
      await waitFor(() => expect(inviteDependent).toHaveBeenCalled())

      const editar = screen.getAllByRole('button', { name: 'Editar' })
      fireEvent.click(editar[0])
      expect(screen.getByLabelText('Nome')).toBeInTheDocument()
    })
  })
})
