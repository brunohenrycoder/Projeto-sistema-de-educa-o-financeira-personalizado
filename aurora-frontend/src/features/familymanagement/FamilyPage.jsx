import { useCallback, useEffect, useRef, useState } from 'react'
import { getErrorMessages } from '../../shared/api/errors.js'
import { useAuth } from '../../shared/auth/useAuth.js'
import { formatDate } from '../../shared/format/date.js'
import { inviteDependent } from './api/inviteDependent.js'
import { listMembers } from './api/listMembers.js'
import { removeMember } from './api/removeMember.js'
import { updateMember } from './api/updateMember.js'
import './FamilyPage.css'

const FRASE_APOIO = 'Clareza para hoje. Cuidado com o amanhã.'

function rotuloPerfil(role) {
  if (role === 'PRINCIPAL') return 'Responsável'
  if (role === 'DEPENDENTE') return 'Dependente'
  return role || ''
}

function validarEmail(valor) {
  const email = valor.trim()
  if (!email) return 'Informe o e-mail do dependente.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Informe um e-mail válido.'
  return ''
}

function validarMembro({ name, email }) {
  const erros = {}
  const nome = name.trim()
  const emailNormalizado = email.trim()

  if (!nome) {
    erros.name = 'Informe o nome.'
  } else if (nome.length < 3 || nome.length > 100) {
    erros.name = 'O nome deve ter entre 3 e 100 caracteres.'
  }

  if (!emailNormalizado) {
    erros.email = 'Informe o e-mail.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalizado)) {
    erros.email = 'Informe um e-mail válido.'
  }

  return erros
}

export default function FamilyPage() {
  const { user } = useAuth()
  const usuarioId = user?.userId

  const [estado, setEstado] = useState('carregando')
  const [membros, setMembros] = useState([])
  const [mensagensErro, setMensagensErro] = useState([])
  const [conviteAberto, setConviteAberto] = useState(true)
  const [emailConvite, setEmailConvite] = useState('')
  const [erroEmail, setErroEmail] = useState('')
  const [mensagensErroConvite, setMensagensErroConvite] = useState([])
  const [mensagemSucessoConvite, setMensagemSucessoConvite] = useState('')
  const [enviandoConvite, setEnviandoConvite] = useState(false)
  const enviandoConviteRef = useRef(false)

  const [editandoId, setEditandoId] = useState(null)
  const [formEdicao, setFormEdicao] = useState({ name: '', email: '' })
  const [errosEdicao, setErrosEdicao] = useState({})
  const [mensagensErroEdicao, setMensagensErroEdicao] = useState([])
  const [salvandoEdicao, setSalvandoEdicao] = useState(false)
  const salvandoEdicaoRef = useRef(false)
  const [mensagemSucessoEdicao, setMensagemSucessoEdicao] = useState('')

  const [confirmandoRemocaoId, setConfirmandoRemocaoId] = useState(null)
  const [removendoId, setRemovendoId] = useState(null)
  const removendoRef = useRef(false)
  const [mensagemSucessoRemocao, setMensagemSucessoRemocao] = useState('')
  const [mensagensErroRemocao, setMensagensErroRemocao] = useState([])
  const cancelarRemocaoRef = useRef(null)

  const carregar = useCallback(() => {
    setEstado('carregando')
    setMensagensErro([])

    listMembers()
      .then((resposta) => {
        setMembros(Array.isArray(resposta) ? resposta : [])
        setEstado('pronto')
      })
      .catch((erro) => {
        setMensagensErro(getErrorMessages(erro))
        setEstado('erro')
      })
  }, [])

  useEffect(() => {
    // Agenda a busca fora do corpo do efeito para não disparar atualizações
    // de estado síncronas (regra react-hooks/set-state-in-effect).
    const timer = setTimeout(carregar, 0)
    return () => clearTimeout(timer)
  }, [carregar])

  async function handleConvidar(evento) {
    evento.preventDefault()
    if (enviandoConviteRef.current) return

    const erro = validarEmail(emailConvite)
    setErroEmail(erro)
    setMensagensErroConvite([])
    setMensagemSucessoConvite('')
    if (erro) return

    enviandoConviteRef.current = true
    setEnviandoConvite(true)

    try {
      const resposta = await inviteDependent({ email: emailConvite.trim() })
      setEmailConvite('')
      setMensagemSucessoConvite(
        `Convite enviado para ${resposta?.invitedEmail ?? emailConvite.trim()}.`,
      )
    } catch (erroApi) {
      setMensagensErroConvite(getErrorMessages(erroApi))
    } finally {
      enviandoConviteRef.current = false
      setEnviandoConvite(false)
    }
  }

  function abrirEdicao(membro) {
    setEditandoId(membro.id)
    setFormEdicao({ name: membro.name ?? '', email: membro.email ?? '' })
    setErrosEdicao({})
    setMensagensErroEdicao([])
    setMensagemSucessoEdicao('')
  }

  function cancelarEdicao() {
    setEditandoId(null)
    setFormEdicao({ name: '', email: '' })
    setErrosEdicao({})
    setMensagensErroEdicao([])
  }

  async function handleSalvarEdicao(evento) {
    evento.preventDefault()
    if (salvandoEdicaoRef.current) return

    const erros = validarMembro(formEdicao)
    setErrosEdicao(erros)
    setMensagensErroEdicao([])
    setMensagemSucessoEdicao('')
    if (Object.keys(erros).length > 0) return

    salvandoEdicaoRef.current = true
    setSalvandoEdicao(true)

    try {
      const resposta = await updateMember(editandoId, {
        name: formEdicao.name.trim(),
        email: formEdicao.email.trim(),
      })
      setMembros((anterior) =>
        anterior.map((membro) => (membro.id === editandoId ? resposta : membro)),
      )
      setMensagemSucessoEdicao('Dados do membro atualizados.')
      setEditandoId(null)
      setFormEdicao({ name: '', email: '' })
    } catch (erroApi) {
      setMensagensErroEdicao(getErrorMessages(erroApi))
    } finally {
      salvandoEdicaoRef.current = false
      setSalvandoEdicao(false)
    }
  }

  useEffect(() => {
    if (confirmandoRemocaoId) {
      cancelarRemocaoRef.current?.focus()
    }
  }, [confirmandoRemocaoId])

  function abrirConfirmacaoRemocao(membro) {
    setConfirmandoRemocaoId(membro.id)
    setMensagensErroRemocao([])
    setMensagemSucessoRemocao('')
  }

  function cancelarRemocao() {
    setConfirmandoRemocaoId(null)
    setMensagensErroRemocao([])
  }

  async function confirmarRemocao(membro) {
    if (removendoRef.current) return

    removendoRef.current = true
    setRemovendoId(membro.id)
    setMensagensErroRemocao([])
    setMensagemSucessoRemocao('')

    try {
      await removeMember(membro.id)
      setMembros((anterior) => anterior.filter((item) => item.id !== membro.id))
      setMensagemSucessoRemocao(`${membro.name} foi removido do grupo familiar.`)
      setConfirmandoRemocaoId(null)
    } catch (erroApi) {
      setMensagensErroRemocao(getErrorMessages(erroApi))
    } finally {
      removendoRef.current = false
      setRemovendoId(null)
    }
  }

  return (
    <main className="container family">
      <header className="family__head">
        <p className="family__eyebrow">Organização da família</p>
        <h1 className="family__title">Gerenciamento familiar</h1>
        <p className="family__subtitle">Administre os integrantes do seu grupo familiar.</p>
        <button
          type="button"
          className="family__register"
          onClick={() => setConviteAberto((aberto) => !aberto)}
          aria-expanded={conviteAberto}
          aria-controls="family-invite-form"
        >
          Convidar membro
        </button>
      </header>

      <section className="family__group-card">
        <div>
          <h2 className="family__group-label">Grupo familiar</h2>
          <p className="family__group-name">Família</p>
          <p className="family__group-hint">Grupo criado automaticamente no cadastro do responsável.</p>
        </div>
        <span className="family__group-count">
          {membros.length} {membros.length === 1 ? 'participante' : 'participantes'}
        </span>
      </section>

      <section
        className="family__invite"
        id="family-invite-form"
        aria-labelledby="family-invite-title"
        hidden={!conviteAberto}
      >
        <h2 className="family__section-title" id="family-invite-title">Convidar dependente</h2>
        <form className="family__form" onSubmit={handleConvidar} noValidate>
          <div className="family__field">
            <label htmlFor="family-invite-email">E-mail do dependente</label>
            <input
              id="family-invite-email"
              name="email"
              type="email"
              autoComplete="email"
              value={emailConvite}
              onChange={(evento) => setEmailConvite(evento.target.value)}
              aria-invalid={Boolean(erroEmail)}
              aria-describedby={erroEmail ? 'family-invite-email-error' : undefined}
              disabled={enviandoConvite}
            />
            {erroEmail && (
              <span id="family-invite-email-error" className="family__field-error" role="alert">
                {erroEmail}
              </span>
            )}
          </div>

          {mensagensErroConvite.length > 0 && (
            <div className="family__api-errors" role="alert">
              <ul>
                {mensagensErroConvite.map((mensagem, indice) => (
                  <li key={`${indice}-${mensagem}`}>{mensagem}</li>
                ))}
              </ul>
            </div>
          )}

          {mensagemSucessoConvite && (
            <p className="family__success" role="status">{mensagemSucessoConvite}</p>
          )}

          <button type="submit" className="family__submit" disabled={enviandoConvite}>
            {enviandoConvite ? 'Enviando...' : 'Enviar convite'}
          </button>
        </form>
      </section>

      <section className="family__members" aria-labelledby="family-members-title">
        <h2 className="family__section-title" id="family-members-title">Membros do grupo</h2>

        {estado === 'carregando' && (
          <p className="family__status" role="status">Carregando membros...</p>
        )}

        {estado === 'erro' && (
          <div className="family__error" role="alert">
            <ul>
              {mensagensErro.map((mensagem, indice) => (
                <li key={`${indice}-${mensagem}`}>{mensagem}</li>
              ))}
            </ul>
            <button type="button" className="family__retry" onClick={carregar}>
              Tentar novamente
            </button>
          </div>
        )}

        {estado === 'pronto' && membros.length === 0 && (
          <p className="family__status">Nenhum membro encontrado no grupo familiar.</p>
        )}

        {mensagemSucessoEdicao && (
          <p className="family__success" role="status">{mensagemSucessoEdicao}</p>
        )}

        {mensagemSucessoRemocao && (
          <p className="family__success" role="status">{mensagemSucessoRemocao}</p>
        )}

        {estado === 'pronto' && membros.length > 0 && (
          <ul className="family__list">
            {membros.map((membro) => (
              <li className="family__member" key={membro.id}>
                {editandoId === membro.id ? (
                  <form className="family__edit-form" onSubmit={handleSalvarEdicao} noValidate>
                    <div className="family__field">
                      <label htmlFor={`edit-name-${membro.id}`}>Nome</label>
                      <input
                        id={`edit-name-${membro.id}`}
                        name="name"
                        type="text"
                        autoComplete="name"
                        value={formEdicao.name}
                        onChange={(evento) =>
                          setFormEdicao((anterior) => ({ ...anterior, name: evento.target.value }))
                        }
                        aria-invalid={Boolean(errosEdicao.name)}
                        aria-describedby={errosEdicao.name ? `edit-name-error-${membro.id}` : undefined}
                        disabled={salvandoEdicao}
                      />
                      {errosEdicao.name && (
                        <span id={`edit-name-error-${membro.id}`} className="family__field-error" role="alert">
                          {errosEdicao.name}
                        </span>
                      )}
                    </div>

                    <div className="family__field">
                      <label htmlFor={`edit-email-${membro.id}`}>E-mail</label>
                      <input
                        id={`edit-email-${membro.id}`}
                        name="email"
                        type="email"
                        autoComplete="email"
                        value={formEdicao.email}
                        onChange={(evento) =>
                          setFormEdicao((anterior) => ({ ...anterior, email: evento.target.value }))
                        }
                        aria-invalid={Boolean(errosEdicao.email)}
                        aria-describedby={errosEdicao.email ? `edit-email-error-${membro.id}` : undefined}
                        disabled={salvandoEdicao}
                      />
                      {errosEdicao.email && (
                        <span id={`edit-email-error-${membro.id}`} className="family__field-error" role="alert">
                          {errosEdicao.email}
                        </span>
                      )}
                    </div>

                    {mensagensErroEdicao.length > 0 && (
                      <div className="family__api-errors" role="alert">
                        <ul>
                          {mensagensErroEdicao.map((mensagem, indice) => (
                            <li key={`${indice}-${mensagem}`}>{mensagem}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="family__edit-actions">
                      <button type="submit" className="family__submit" disabled={salvandoEdicao}>
                        {salvandoEdicao ? 'Salvando...' : 'Salvar'}
                      </button>
                      <button
                        type="button"
                        className="family__cancel"
                        onClick={cancelarEdicao}
                        disabled={salvandoEdicao}
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <p className="family__member-name">{membro.name}</p>
                    <p className="family__member-email">{membro.email}</p>
                    <p className="family__member-meta">
                      {rotuloPerfil(membro.role)}
                      {membro.status ? ` · ${membro.status}` : ''}
                      {formatDate(membro.createdAt) ? ` · desde ${formatDate(membro.createdAt)}` : ''}
                    </p>

                    {confirmandoRemocaoId === membro.id ? (
                      <div
                        className="family__confirm"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={`confirm-title-${membro.id}`}
                      >
                        <p className="family__confirm-title" id={`confirm-title-${membro.id}`}>
                          Remover {membro.name}?
                        </p>
                        <p className="family__confirm-text">
                          Esta ação remove o membro do grupo familiar e encerra o acesso dele.
                        </p>

                        {mensagensErroRemocao.length > 0 && (
                          <div className="family__api-errors" role="alert">
                            <ul>
                              {mensagensErroRemocao.map((mensagem, indice) => (
                                <li key={`${indice}-${mensagem}`}>{mensagem}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="family__edit-actions">
                          <button
                            type="button"
                            className="family__remove-confirm"
                            onClick={() => confirmarRemocao(membro)}
                            disabled={removendoId === membro.id}
                          >
                            {removendoId === membro.id ? 'Removendo...' : 'Confirmar remoção'}
                          </button>
                          <button
                            type="button"
                            className="family__cancel"
                            ref={cancelarRemocaoRef}
                            onClick={cancelarRemocao}
                            disabled={removendoId === membro.id}
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="family__member-actions">
                        <button
                          type="button"
                          className="family__edit-button"
                          onClick={() => abrirEdicao(membro)}
                        >
                          Editar
                        </button>
                        {membro.id !== usuarioId && (
                          <button
                            type="button"
                            className="family__remove-button"
                            onClick={() => abrirConfirmacaoRemocao(membro)}
                          >
                            Remover
                          </button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="family__profiles">
        <h2 className="family__section-title">Sobre os perfis</h2>
        <p>
          O Principal administra o grupo familiar. Dependentes participam com acesso individual
          e podem gerenciar suas próprias despesas conforme as permissões do perfil.
        </p>
      </section>

      <p className="family__quote">{FRASE_APOIO}</p>
    </main>
  )
}
