import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import HomeBreadcrumbLink from "../../shared/components/HomeBreadcrumbLink.jsx";
import { getErrorMessages } from "../../shared/api/errors.js";
import {
  formatCurrency,
  parseCurrencyInput,
} from "../../shared/format/currency.js";
import { formatDate } from "../../shared/format/date.js";
import StatusFilter from "../../shared/components/StatusFilter.jsx";
import { listPayableBills } from "./api/listPayableBills.js";
import { registerPayableBillPayment } from "./api/registerPayableBillPayment.js";
import { updatePayableBill } from "./api/updatePayableBill.js";
import { updatePayableBillRecurrence } from "./api/updatePayableBillRecurrence.js";
import { cancelPayableBill } from "./api/cancelPayableBill.js";
import { listPayableBillPayments } from "./api/listPayableBillPayments.js";
import "./PayableBillsPage.css";

const ROTULOS_STATUS = {
  PENDENTE: "Pendente",
  PAGA: "Paga",
  ATRASADA: "Atrasada",
  CANCELADA: "Cancelada",
};

const ROTULOS_RECORRENCIA = {
  SEM_RECORRENCIA: "Sem recorrência",
  MENSAL: "Mensal",
};

const METODOS_PAGAMENTO = [
  { value: "DINHEIRO", rotulo: "Dinheiro" },
  { value: "PIX", rotulo: "Pix" },
  { value: "CARTAO_DEBITO", rotulo: "Cartão de débito" },
  { value: "CARTAO_CREDITO", rotulo: "Cartão de crédito" },
  { value: "TRANSFERENCIA", rotulo: "Transferência" },
  { value: "OUTRO", rotulo: "Outro" },
];

const STATUS_QUITAVEIS = ["PENDENTE", "ATRASADA"];
const STATUS_EDITAVEIS = ["PENDENTE", "ATRASADA"];

const GRUPOS_STATUS = {
  PENDENTE: "pendentes",
  ATRASADA: "pendentes",
  PAGA: "concluidas",
  CANCELADA: "canceladas",
};

const HISTORICO_VISUALIZACOES = [
  { id: "concluidas", rotulo: "Pagas" },
  { id: "canceladas", rotulo: "Canceladas" },
];

const CATEGORIAS = [
  "MORADIA",
  "ALIMENTACAO",
  "TRANSPORTE",
  "SAUDE",
  "EDUCACAO",
  "LAZER",
  "CONTAS_CONSUMO",
  "ASSINATURAS",
  "IMPOSTOS",
  "OUTROS",
];

function rotuloStatus(status) {
  return ROTULOS_STATUS[status] ?? status ?? "";
}

function grupoStatus(status) {
  return GRUPOS_STATUS[status] ?? "pendentes";
}

function mensagemVazia(total) {
  if (total === 0) return "Nenhuma conta a pagar encontrada.";
  return "Nenhuma conta pendente encontrada.";
}

function mensagemVaziaHistorico(visualizacao) {
  if (visualizacao === "concluidas") return "Nenhuma conta paga encontrada.";
  return "Nenhuma conta cancelada encontrada.";
}

function rotuloRecorrencia(recurrence) {
  return ROTULOS_RECORRENCIA[recurrence] ?? recurrence ?? "";
}

function rotuloMetodoPagamento(method) {
  return METODOS_PAGAMENTO.find((metodo) => metodo.value === method)?.rotulo ?? method ?? "";
}

function validarPagamento({ paymentDate, paymentMethod, amount }) {
  const erros = {};

  if (!paymentDate) {
    erros.paymentDate = "A data do pagamento é obrigatória.";
  }

  if (!paymentMethod) {
    erros.paymentMethod = "O método de pagamento é obrigatório.";
  } else if (
    !METODOS_PAGAMENTO.some((metodo) => metodo.value === paymentMethod)
  ) {
    erros.paymentMethod = "Selecione um método de pagamento válido.";
  }

  if (String(amount).trim()) {
    const valor = parseCurrencyInput(amount);
    if (valor === null) {
      erros.amount = "Informe um valor válido com até duas casas decimais.";
    } else if (valor < 0.01) {
      erros.amount = "O valor pago deve ser maior que zero.";
    }
  }

  return erros;
}

function validarEdicao(formulario, modo) {
  const erros = {};
  const valor = parseCurrencyInput(formulario.amount);
  const descricao = String(formulario.description).trim();

  if (!descricao) {
    erros.description = "A descrição da conta é obrigatória.";
  } else if (descricao.length > 255) {
    erros.description = "A descrição deve ter no máximo 255 caracteres.";
  }

  if (!String(formulario.amount).trim()) {
    erros.amount = "Informe o valor da conta.";
  } else if (valor === null) {
    erros.amount = "Informe um valor válido com até duas casas decimais.";
  } else if (valor < 0.01) {
    erros.amount = "O valor da conta deve ser maior que zero.";
  }

  if (!formulario.category) {
    erros.category = "A categoria é obrigatória.";
  } else if (!CATEGORIAS.includes(formulario.category)) {
    erros.category = "Selecione uma categoria válida.";
  }

  if (modo === "conta" && !formulario.dueDate) {
    erros.dueDate = "A data de vencimento é obrigatória.";
  }

  if (modo === "recorrencia" && !formulario.nextDueDate) {
    erros.nextDueDate = "O próximo vencimento é obrigatório.";
  }

  return erros;
}

function ListaContas({ itens, sufixo, onEditar, onQuitar, onCancelar, onHistorico }) {
    return (
      <>
        <div className="payable-bills__table-scroll">
          <table
            className="payable-bills__table"
            data-testid={`payable-bills-tabela${sufixo}`}
          >
            <thead>
              <tr>
                <th scope="col">Descrição</th>
                <th scope="col" className="payable-bills__cell--amount">
                  Valor
                </th>
                <th scope="col">Vencimento</th>
                <th scope="col">Categoria</th>
                <th scope="col">Recorrência</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((conta) => (
                <tr key={conta.id}>
                  <td>{conta.description}</td>
                  <td className="payable-bills__cell--amount">
                    {formatCurrency(conta.amount)}
                  </td>
                  <td>{formatDate(conta.dueDate)}</td>
                  <td>{conta.category}</td>
                  <td>{rotuloRecorrencia(conta.recurrence)}</td>
                  <td>
                    <span
                      className={`payable-bills__status-tag payable-bills__status-tag--${conta.status}`}
                    >
                      {rotuloStatus(conta.status)}
                    </span>
                    <div className="payable-bills__row-actions">
                      {STATUS_EDITAVEIS.includes(conta.status) && (
                        <button
                          type="button"
                          className="payable-bills__edit-button"
                          onClick={() => onEditar(conta, "conta")}
                        >
                          Editar
                        </button>
                      )}
                      {conta.recurrence === "MENSAL" &&
                        conta.status !== "CANCELADA" && (
                          <button
                            type="button"
                            className="payable-bills__edit-button"
                            onClick={() =>
                              onEditar(conta, "recorrencia")
                            }
                          >
                            Editar recorrência
                          </button>
                        )}
                      {STATUS_QUITAVEIS.includes(conta.status) && (
                        <button
                          type="button"
                          className="payable-bills__pay-button"
                          onClick={() => onQuitar(conta)}
                        >
                          Quitar
                        </button>
                      )}
                      {STATUS_EDITAVEIS.includes(conta.status) && (
                        <button
                          type="button"
                          className="payable-bills__cancel-button"
                          onClick={() => onCancelar(conta)}
                        >
                          Cancelar conta
                        </button>
                      )}
                      <button
                        type="button"
                        className="payable-bills__history-button"
                        onClick={() => onHistorico(conta)}
                      >
                        Histórico
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul
          className="payable-bills__mobile-list"
          data-testid={`payable-bills-cards${sufixo}`}
        >
          {itens.map((conta) => (
            <li className="payable-bills__bill-card" key={conta.id}>
              <p className="payable-bills__bill-description">
                {conta.description}
              </p>
              <p className="payable-bills__bill-value">
                {formatCurrency(conta.amount)}
              </p>
              <dl className="payable-bills__bill-details">
                <dt>Vencimento</dt>
                <dd>{formatDate(conta.dueDate)}</dd>
                <dt>Categoria</dt>
                <dd>{conta.category}</dd>
                <dt>Recorrência</dt>
                <dd>{rotuloRecorrencia(conta.recurrence)}</dd>
                <dt>Status</dt>
                <dd>
                  <span
                    className={`payable-bills__status-tag payable-bills__status-tag--${conta.status}`}
                  >
                    {rotuloStatus(conta.status)}
                  </span>
                </dd>
              </dl>
              <div className="payable-bills__row-actions">
                {STATUS_EDITAVEIS.includes(conta.status) && (
                  <button
                    type="button"
                    className="payable-bills__edit-button payable-bills__edit-button--card"
                    onClick={() => onEditar(conta, "conta")}
                  >
                    Editar
                  </button>
                )}
                {conta.recurrence === "MENSAL" &&
                  conta.status !== "CANCELADA" && (
                    <button
                      type="button"
                      className="payable-bills__edit-button payable-bills__edit-button--card"
                      onClick={() => onEditar(conta, "recorrencia")}
                    >
                      Editar recorrência
                    </button>
                  )}
                {STATUS_QUITAVEIS.includes(conta.status) && (
                  <button
                    type="button"
                    className="payable-bills__pay-button payable-bills__pay-button--card"
                    onClick={() => onQuitar(conta)}
                  >
                    Quitar
                  </button>
                )}
                {STATUS_EDITAVEIS.includes(conta.status) && (
                  <button
                    type="button"
                    className="payable-bills__cancel-button payable-bills__cancel-button--card"
                    onClick={() => onCancelar(conta)}
                  >
                    Cancelar conta
                  </button>
                )}
                <button
                  type="button"
                  className="payable-bills__history-button payable-bills__edit-button--card"
                  onClick={() => onHistorico(conta)}
                >
                  Histórico
                </button>
              </div>
            </li>
          ))}
        </ul>
      </>
    )
  }

export default function PayableBillsPage() {
  const navigate = useNavigate();
  const [estado, setEstado] = useState("carregando");
  const [contas, setContas] = useState([]);
  const [historicoAberto, setHistoricoAberto] = useState(false);
  const [visualizacaoHistorico, setVisualizacaoHistorico] = useState("concluidas");
  const [mensagensErro, setMensagensErro] = useState([]);
  const [quitandoId, setQuitandoId] = useState(null);
  const [formPagamento, setFormPagamento] = useState({
    paymentDate: "",
    paymentMethod: "",
    amount: "",
  });
  const [errosPagamento, setErrosPagamento] = useState({});
  const [mensagensErroPagamento, setMensagensErroPagamento] = useState([]);
  const [mensagemSucessoPagamento, setMensagemSucessoPagamento] = useState("");
  const [pagando, setPagando] = useState(false);
  const pagandoRef = useRef(false);
  const [editandoId, setEditandoId] = useState(null);
  const [modoEdicao, setModoEdicao] = useState("conta");
  const [formEdicao, setFormEdicao] = useState({
    description: "",
    amount: "",
    dueDate: "",
    category: "",
    nextDueDate: "",
  });
  const [errosEdicao, setErrosEdicao] = useState({});
  const [mensagensErroEdicao, setMensagensErroEdicao] = useState([]);
  const [mensagemSucessoEdicao, setMensagemSucessoEdicao] = useState("");
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const salvandoEdicaoRef = useRef(false);
  const [confirmandoCancelamentoId, setConfirmandoCancelamentoId] = useState(null);
  const [cancelando, setCancelando] = useState(false);
  const [mensagensErroCancelamento, setMensagensErroCancelamento] = useState([]);
  const [mensagemSucessoCancelamento, setMensagemSucessoCancelamento] = useState("");
  const cancelandoRef = useRef(false);
  const [historicoId, setHistoricoId] = useState(null);
  const [estadoHistorico, setEstadoHistorico] = useState("carregando");
  const [pagamentos, setPagamentos] = useState([]);
  const [mensagensErroHistorico, setMensagensErroHistorico] = useState([]);
  const historicoRef = useRef(0);
  const requisicaoAtualRef = useRef(0);

  const carregar = useCallback(() => {
    const id = ++requisicaoAtualRef.current;

    setEstado("carregando");
    setMensagensErro([]);

    return listPayableBills()
      .then((resposta) => {
        if (id !== requisicaoAtualRef.current) return;
        setContas(Array.isArray(resposta?.bills) ? resposta.bills : []);
        setEstado("pronto");
      })
      .catch((erro) => {
        if (id !== requisicaoAtualRef.current) return;
        setMensagensErro(getErrorMessages(erro));
        setEstado("erro");
      });
  }, []);

  useEffect(() => {
    const timer = setTimeout(carregar, 0);
    return () => {
      clearTimeout(timer);
      requisicaoAtualRef.current += 1;
    };
  }, [carregar]);

  function abrirPagamento(conta) {
    setMensagemSucessoPagamento("");
    setMensagensErroPagamento([]);
    setErrosPagamento({});
    setQuitandoId(conta.id);
    setFormPagamento({ paymentDate: "", paymentMethod: "", amount: "" });
  }

  function cancelarPagamento() {
    setQuitandoId(null);
    setErrosPagamento({});
    setMensagensErroPagamento([]);
  }

  function atualizarCampoPagamento(evento) {
    const { name, value } = evento.target;
    setFormPagamento((anterior) => ({ ...anterior, [name]: value }));
  }

  function formatarValorPagamento() {
    const valor = parseCurrencyInput(formPagamento.amount);
    if (valor !== null && valor > 0) {
      setFormPagamento((anterior) => ({
        ...anterior,
        amount: formatCurrency(valor),
      }));
    }
  }

  async function handlePagamento(evento) {
    evento.preventDefault();
    if (pagandoRef.current || !quitandoId) return;

    const errosEncontrados = validarPagamento(formPagamento);
    setErrosPagamento(errosEncontrados);
    setMensagensErroPagamento([]);
    if (Object.keys(errosEncontrados).length > 0) return;

    pagandoRef.current = true;
    setPagando(true);

    const valor = formPagamento.amount.trim();
    const payload = {
      paymentDate: formPagamento.paymentDate,
      paymentMethod: formPagamento.paymentMethod,
      ...(valor ? { amount: parseCurrencyInput(valor) } : {}),
    };

    try {
      await registerPayableBillPayment(quitandoId, payload);
      setMensagemSucessoPagamento("Conta quitada.");
      setQuitandoId(null);
      carregar();
    } catch (erro) {
      setMensagensErroPagamento(getErrorMessages(erro));
    } finally {
      pagandoRef.current = false;
      setPagando(false);
    }
  }

  function abrirEdicao(conta, modo) {
    if (modo === "conta" && !STATUS_EDITAVEIS.includes(conta.status)) return;
    if (
      modo === "recorrencia" &&
      (conta.status === "CANCELADA" || conta.recurrence !== "MENSAL")
    )
      return;

    setMensagemSucessoPagamento("");
    setMensagemSucessoEdicao("");
    setMensagensErroEdicao([]);
    setErrosEdicao({});
    setModoEdicao(modo);
    setEditandoId(conta.id);
    setFormEdicao({
      description: conta.description ?? "",
      amount: formatCurrency(conta.amount),
      dueDate: conta.dueDate ?? "",
      category: conta.category ?? "",
      nextDueDate: "",
    });
  }

  function cancelarEdicao() {
    setEditandoId(null);
    setErrosEdicao({});
    setMensagensErroEdicao([]);
  }

  function atualizarCampoEdicao(evento) {
    const { name, value } = evento.target;
    setFormEdicao((anterior) => ({ ...anterior, [name]: value }));
  }

  function formatarValorEdicao() {
    const valor = parseCurrencyInput(formEdicao.amount);
    if (valor !== null && valor > 0) {
      setFormEdicao((anterior) => ({
        ...anterior,
        amount: formatCurrency(valor),
      }));
    }
  }

  async function handleSalvarEdicao(evento) {
    evento.preventDefault();
    if (salvandoEdicaoRef.current || !editandoId) return;

    const errosEncontrados = validarEdicao(formEdicao, modoEdicao);
    setErrosEdicao(errosEncontrados);
    setMensagensErroEdicao([]);
    if (Object.keys(errosEncontrados).length > 0) return;

    salvandoEdicaoRef.current = true;
    setSalvandoEdicao(true);

    const base = {
      description: formEdicao.description.trim(),
      amount: parseCurrencyInput(formEdicao.amount),
      category: formEdicao.category,
    };
    const payload =
      modoEdicao === "conta"
        ? { ...base, dueDate: formEdicao.dueDate }
        : { ...base, nextDueDate: formEdicao.nextDueDate };

    try {
      if (modoEdicao === "conta") {
        await updatePayableBill(editandoId, payload);
      } else {
        await updatePayableBillRecurrence(editandoId, payload);
      }
      setMensagemSucessoEdicao(
        modoEdicao === "conta"
          ? "Conta atualizada."
          : "Recorrência atualizada.",
      );
      setMensagemSucessoPagamento("");
      setEditandoId(null);
      carregar();
    } catch (erro) {
      setMensagensErroEdicao(getErrorMessages(erro));
    } finally {
      salvandoEdicaoRef.current = false;
      setSalvandoEdicao(false);
    }
  }

  function abrirCancelamento(conta) {
    if (!STATUS_EDITAVEIS.includes(conta.status)) return;
    setMensagemSucessoPagamento("");
    setMensagemSucessoEdicao("");
    setMensagemSucessoCancelamento("");
    setMensagensErroCancelamento([]);
    setConfirmandoCancelamentoId(conta.id);
  }

  function fecharCancelamento() {
    setConfirmandoCancelamentoId(null);
    setMensagensErroCancelamento([]);
  }

  async function confirmarCancelamento(conta, scope) {
    if (cancelandoRef.current || !conta) return;

    cancelandoRef.current = true;
    setCancelando(true);
    setMensagensErroCancelamento([]);

    try {
      await cancelPayableBill(conta.id, { scope });
      setMensagemSucessoCancelamento("Conta cancelada.");
      setConfirmandoCancelamentoId(null);
      carregar();
    } catch (erro) {
      setMensagensErroCancelamento(getErrorMessages(erro));
    } finally {
      cancelandoRef.current = false;
      setCancelando(false);
    }
  }

  function carregarHistorico(billId) {
    const id = ++historicoRef.current;
    setEstadoHistorico("carregando");
    setMensagensErroHistorico([]);

    return listPayableBillPayments(billId)
      .then((resposta) => {
        if (id !== historicoRef.current) return;
        setPagamentos(Array.isArray(resposta?.payments) ? resposta.payments : []);
        setEstadoHistorico("pronto");
      })
      .catch((erro) => {
        if (id !== historicoRef.current) return;
        setMensagensErroHistorico(getErrorMessages(erro));
        setEstadoHistorico("erro");
      });
  }

  function abrirHistorico(conta) {
    setMensagemSucessoPagamento("");
    setMensagemSucessoEdicao("");
    setMensagemSucessoCancelamento("");
    setHistoricoId(conta.id);
    setPagamentos([]);
    carregarHistorico(conta.id);
  }

  function fecharHistorico() {
    historicoRef.current += 1;
    setHistoricoId(null);
    setMensagensErroHistorico([]);
  }

  const contaDoHistorico = contas.find((conta) => conta.id === historicoId);
  const contaEmCancelamento = contas.find(
    (conta) => conta.id === confirmandoCancelamentoId,
  );
  const contaEmEdicao = contas.find((conta) => conta.id === editandoId);
  const contaEmPagamento = contas.find((conta) => conta.id === quitandoId);

  const atrasadas =
    estado === "pronto"
      ? contas.filter((conta) => conta.status === "ATRASADA").length
      : 0;

  const contadores = useMemo(() => ({
    pendentes: contas.filter((conta) => grupoStatus(conta.status) === "pendentes").length,
    concluidas: contas.filter((conta) => grupoStatus(conta.status) === "concluidas").length,
    canceladas: contas.filter((conta) => grupoStatus(conta.status) === "canceladas").length,
  }), [contas]);

  const indicadores = useMemo(() => {
    const pendentes = contas.filter((conta) => grupoStatus(conta.status) === 'pendentes')
    const vencidas = contas.filter((conta) => conta.status === 'ATRASADA')
    const soma = (itens) => itens.reduce((total, conta) => total + Number(conta.amount ?? 0), 0)

    return {
      emAberto: soma(pendentes),
      quantidadeAbertas: pendentes.length,
      vencidas: soma(vencidas),
      quantidadeVencidas: vencidas.length,
      proximos: pendentes.filter((conta) => conta.status === 'PENDENTE').length,
    }
  }, [contas])

  const contasPendentes = useMemo(
    () => contas.filter((conta) => grupoStatus(conta.status) === "pendentes"),
    [contas],
  );

  const itensHistorico = useMemo(
    () => contas.filter((conta) => grupoStatus(conta.status) === visualizacaoHistorico),
    [contas, visualizacaoHistorico],
  );

  function alternarHistorico() {
    if (historicoAberto) {
      setHistoricoAberto(false);
      setVisualizacaoHistorico("concluidas");
    } else {
      setHistoricoAberto(true);
    }
  }

  return (
    <main className="container payable-bills">
      <nav
        className="payable-bills__breadcrumb"
        aria-label="Trilha de navegação"
      >
        <HomeBreadcrumbLink />
        <span aria-hidden="true">/</span>
        <span aria-current="page">Contas a pagar</span>
      </nav>

      <header className="payable-bills__hero">
        <div className="payable-bills__intro">
          <p className="payable-bills__eyebrow">Planejamento financeiro</p>
          <h1 className="payable-bills__title">Contas a pagar</h1>
          <p className="payable-bills__subtitle">
            Acompanhe as contas previstas do grupo familiar.
          </p>
        </div>
        <button
          className="payable-bills__register"
          type="button"
          onClick={() => navigate("/payable-bills/new")}
        >
          Cadastrar conta
        </button>
      </header>

      {estado === 'pronto' && (
        <section className="payable-bills__indicators" aria-label="Indicadores de contas a pagar">
          <article className="payable-bills__indicator">
            <p className="payable-bills__indicator-label">Em aberto</p>
            <p className="payable-bills__indicator-value">{formatCurrency(indicadores.emAberto)}</p>
            <p className="payable-bills__indicator-detail">
              {indicadores.quantidadeAbertas} contas aguardando pagamento
            </p>
          </article>
          <article className="payable-bills__indicator payable-bills__indicator--alerta">
            <p className="payable-bills__indicator-label">Atrasadas</p>
            <p className="payable-bills__indicator-value">{formatCurrency(indicadores.vencidas)}</p>
            <p className="payable-bills__indicator-detail">
              {indicadores.quantidadeVencidas} contas vencidas
            </p>
          </article>
          <article className="payable-bills__indicator">
            <p className="payable-bills__indicator-label">Próximos vencimentos</p>
            <p className="payable-bills__indicator-value">{indicadores.proximos}</p>
            <p className="payable-bills__indicator-detail">Contas pendentes no período</p>
          </article>
        </section>
      )}

      {mensagemSucessoPagamento && (
        <p className="payable-bills__success" role="status">
          {mensagemSucessoPagamento}
        </p>
      )}

      {mensagemSucessoEdicao && (
        <p className="payable-bills__success" role="status">
          {mensagemSucessoEdicao}
        </p>
      )}

      {mensagemSucessoCancelamento && (
        <p className="payable-bills__success" role="status">
          {mensagemSucessoCancelamento}
        </p>
      )}

      {estado === "carregando" && (
        <p className="payable-bills__status" role="status">
          Carregando contas a pagar...
        </p>
      )}

      {estado === "erro" && (
        <div className="payable-bills__error" role="alert">
          {mensagensErro.map((mensagem, indice) => (
            <p key={indice}>{mensagem}</p>
          ))}
          <button
            type="button"
            className="payable-bills__retry"
            onClick={carregar}
          >
            Tentar novamente
          </button>
        </div>
      )}

      {estado === "pronto" && (
        <>
          {atrasadas > 0 && (
            <p className="payable-bills__alert" role="status">
              {atrasadas}{" "}
              {atrasadas === 1 ? "conta atrasada" : "contas atrasadas"}
            </p>
          )}

          <section className="payable-bills__card">
            <h2 className="payable-bills__card-title">
              Contas do grupo familiar
            </h2>

            {contasPendentes.length === 0 ? (
              <p className="payable-bills__empty">
                {mensagemVazia(contas.length)}
              </p>
            ) : (
              <ListaContas
                itens={contasPendentes}
                sufixo=""
                onEditar={abrirEdicao}
                onQuitar={abrirPagamento}
                onCancelar={abrirCancelamento}
                onHistorico={abrirHistorico}
              />
            )}
          </section>

          <button
            type="button"
            className="payable-bills__history-toggle"
            data-testid="payable-bills-historico-toggle"
            aria-label="Histórico de operações"
            aria-expanded={historicoAberto}
            aria-controls="payable-bills-historico"
            onClick={alternarHistorico}
          >
            Histórico
            <span className="payable-bills__history-count" aria-hidden="true">
              {contadores.concluidas + contadores.canceladas}
            </span>
          </button>

          {historicoAberto && (
            <section
              id="payable-bills-historico"
              className="payable-bills__history"
              aria-label="Histórico de contas"
            >
              <StatusFilter
                label="Filtrar histórico por status"
                options={HISTORICO_VISUALIZACOES.map((opcao) => ({
                  ...opcao,
                  quantidade: contadores[opcao.id],
                }))}
                value={visualizacaoHistorico}
                onChange={setVisualizacaoHistorico}
              />

              {itensHistorico.length === 0 ? (
                <p className="payable-bills__empty">
                  {mensagemVaziaHistorico(visualizacaoHistorico)}
                </p>
              ) : (
                <ListaContas
                  itens={itensHistorico}
                  sufixo="-historico"
                  onEditar={abrirEdicao}
                  onQuitar={abrirPagamento}
                  onCancelar={abrirCancelamento}
                  onHistorico={abrirHistorico}
                />
              )}
            </section>
          )}

          {contaDoHistorico && (
            <section
              className="payable-bills__pay-form"
              aria-label="Histórico de pagamentos"
            >
              <div className="payable-bills__history-head">
                <h3 className="payable-bills__pay-title">
                  Histórico de pagamentos
                </h3>
                <button
                  type="button"
                  className="payable-bills__confirm-cancel"
                  onClick={fecharHistorico}
                >
                  Fechar
                </button>
              </div>
              <p className="payable-bills__pay-detail">
                {contaDoHistorico.description} ·{" "}
                {formatCurrency(contaDoHistorico.amount)}
              </p>

              {estadoHistorico === "carregando" && (
                <p className="payable-bills__status" role="status">
                  Carregando histórico...
                </p>
              )}

              {estadoHistorico === "erro" && (
                <div className="payable-bills__error" role="alert">
                  {mensagensErroHistorico.map((mensagem, indice) => (
                    <p key={indice}>{mensagem}</p>
                  ))}
                  <button
                    type="button"
                    className="payable-bills__retry"
                    onClick={() => carregarHistorico(contaDoHistorico.id)}
                  >
                    Tentar novamente
                  </button>
                </div>
              )}

              {estadoHistorico === "pronto" && (
                <div data-testid="historico-pagamentos">
                  {pagamentos.length === 0 ? (
                    <p className="payable-bills__empty">
                      Nenhum pagamento registrado para esta conta.
                    </p>
                  ) : (
                    <ul className="payable-bills__history-list">
                      {pagamentos.map((pagamento) => (
                        <li
                          className="payable-bills__history-item"
                          key={pagamento.id}
                        >
                          <dl className="payable-bills__history-details">
                            <dt>Data do pagamento</dt>
                            <dd>{formatDate(pagamento.paymentDate)}</dd>
                            <dt>Valor pago</dt>
                            <dd>{formatCurrency(pagamento.amount)}</dd>
                            <dt>Forma de pagamento</dt>
                            <dd>{rotuloMetodoPagamento(pagamento.paymentMethod)}</dd>
                            <dt>Pago por</dt>
                            <dd>{pagamento.paidByName}</dd>
                          </dl>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </section>
          )}

          {contaEmCancelamento && (
            <div
              className="payable-bills__confirm"
              role="dialog"
              aria-modal="true"
              aria-labelledby="payable-cancel-title"
            >
              <p className="payable-bills__confirm-title" id="payable-cancel-title">
                Cancelar conta
              </p>
              <p className="payable-bills__confirm-text">
                {contaEmCancelamento.description} ·{" "}
                {formatCurrency(contaEmCancelamento.amount)}
              </p>
              <p className="payable-bills__confirm-text">
                Escolha o alcance do cancelamento:
              </p>

              {mensagensErroCancelamento.length > 0 && (
                <div className="payable-bills__error" role="alert">
                  {mensagensErroCancelamento.map((mensagem, indice) => (
                    <p key={indice}>{mensagem}</p>
                  ))}
                </div>
              )}

              <div className="payable-bills__confirm-actions">
                <button
                  type="button"
                  className="payable-bills__cancel-confirm"
                  disabled={cancelando}
                  onClick={() =>
                    confirmarCancelamento(contaEmCancelamento, "SOMENTE_OCORRENCIA")
                  }
                >
                  {cancelando
                    ? "Cancelando..."
                    : "Cancelar somente esta ocorrência"}
                </button>
                <button
                  type="button"
                  className="payable-bills__cancel-confirm"
                  disabled={cancelando}
                  onClick={() =>
                    confirmarCancelamento(contaEmCancelamento, "OCORRENCIA_E_FUTURAS")
                  }
                >
                  {cancelando
                    ? "Cancelando..."
                    : "Cancelar esta e futuras"}
                </button>
                <button
                  type="button"
                  className="payable-bills__confirm-cancel"
                  disabled={cancelando}
                  onClick={fecharCancelamento}
                >
                  Voltar
                </button>
              </div>
            </div>
          )}

          {contaEmEdicao && (
            <section
              className="payable-bills__pay-form"
              aria-label={
                modoEdicao === "conta"
                  ? "Editar conta"
                  : "Editar recorrência"
              }
            >
              <h3 className="payable-bills__pay-title">
                {modoEdicao === "conta"
                  ? "Editar conta"
                  : "Editar recorrência"}
              </h3>
              <p className="payable-bills__pay-detail">
                {contaEmEdicao.description}
              </p>

              <form onSubmit={handleSalvarEdicao} noValidate>
                <div className="payable-bills__pay-field">
                  <label htmlFor="edicao-description">Descrição</label>
                  <input
                    id="edicao-description"
                    name="description"
                    type="text"
                    value={formEdicao.description}
                    onChange={atualizarCampoEdicao}
                    aria-invalid={Boolean(errosEdicao.description)}
                    aria-describedby={
                      errosEdicao.description ? "edicao-erro-description" : undefined
                    }
                  />
                  {errosEdicao.description && (
                    <p
                      className="payable-bills__pay-error"
                      id="edicao-erro-description"
                      role="alert"
                    >
                      {errosEdicao.description}
                    </p>
                  )}
                </div>

                <div className="payable-bills__pay-field">
                  <label htmlFor="edicao-amount">Valor</label>
                  <input
                    id="edicao-amount"
                    name="amount"
                    type="text"
                    inputMode="decimal"
                    value={formEdicao.amount}
                    onChange={atualizarCampoEdicao}
                    onBlur={formatarValorEdicao}
                    aria-invalid={Boolean(errosEdicao.amount)}
                    aria-describedby={
                      errosEdicao.amount ? "edicao-erro-amount" : undefined
                    }
                  />
                  {errosEdicao.amount && (
                    <p
                      className="payable-bills__pay-error"
                      id="edicao-erro-amount"
                      role="alert"
                    >
                      {errosEdicao.amount}
                    </p>
                  )}
                </div>

                <div className="payable-bills__pay-field">
                  <label htmlFor="edicao-category">Categoria</label>
                  <select
                    id="edicao-category"
                    name="category"
                    value={formEdicao.category}
                    onChange={atualizarCampoEdicao}
                    aria-invalid={Boolean(errosEdicao.category)}
                    aria-describedby={
                      errosEdicao.category ? "edicao-erro-category" : undefined
                    }
                  >
                    <option value="">Selecione a categoria</option>
                    {CATEGORIAS.map((categoria) => (
                      <option key={categoria} value={categoria}>
                        {categoria}
                      </option>
                    ))}
                  </select>
                  {errosEdicao.category && (
                    <p
                      className="payable-bills__pay-error"
                      id="edicao-erro-category"
                      role="alert"
                    >
                      {errosEdicao.category}
                    </p>
                  )}
                </div>

                {modoEdicao === "conta" ? (
                  <div className="payable-bills__pay-field">
                    <label htmlFor="edicao-dueDate">Data de vencimento</label>
                    <input
                      id="edicao-dueDate"
                      name="dueDate"
                      type="date"
                      value={formEdicao.dueDate}
                      onChange={atualizarCampoEdicao}
                      aria-invalid={Boolean(errosEdicao.dueDate)}
                      aria-describedby={
                        errosEdicao.dueDate ? "edicao-erro-dueDate" : undefined
                      }
                    />
                    {errosEdicao.dueDate && (
                      <p
                        className="payable-bills__pay-error"
                        id="edicao-erro-dueDate"
                        role="alert"
                      >
                        {errosEdicao.dueDate}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="payable-bills__pay-field">
                    <label htmlFor="edicao-nextDueDate">
                      Próximo vencimento
                    </label>
                    <input
                      id="edicao-nextDueDate"
                      name="nextDueDate"
                      type="date"
                      value={formEdicao.nextDueDate}
                      onChange={atualizarCampoEdicao}
                      aria-invalid={Boolean(errosEdicao.nextDueDate)}
                      aria-describedby={
                        errosEdicao.nextDueDate
                          ? "edicao-erro-nextDueDate"
                          : undefined
                      }
                    />
                    {errosEdicao.nextDueDate && (
                      <p
                        className="payable-bills__pay-error"
                        id="edicao-erro-nextDueDate"
                        role="alert"
                      >
                        {errosEdicao.nextDueDate}
                      </p>
                    )}
                  </div>
                )}

                {mensagensErroEdicao.length > 0 && (
                  <div className="payable-bills__error" role="alert">
                    {mensagensErroEdicao.map((mensagem, indice) => (
                      <p key={indice}>{mensagem}</p>
                    ))}
                  </div>
                )}

                <div className="payable-bills__pay-actions">
                  <button
                    type="submit"
                    className="payable-bills__pay-confirm"
                    disabled={salvandoEdicao}
                  >
                    {salvandoEdicao ? "Salvando..." : "Salvar"}
                  </button>
                  <button
                    type="button"
                    className="payable-bills__pay-cancel"
                    onClick={cancelarEdicao}
                    disabled={salvandoEdicao}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </section>
          )}

          {contaEmPagamento && (
            <section
              className="payable-bills__pay-form"
              aria-label="Quitar conta"
            >
              <h3 className="payable-bills__pay-title">Quitar conta</h3>
              <p className="payable-bills__pay-detail">
                {contaEmPagamento.description} ·{" "}
                {formatCurrency(contaEmPagamento.amount)}
              </p>

              <form onSubmit={handlePagamento} noValidate>
                <div className="payable-bills__pay-field">
                  <label htmlFor="pagamento-data">Data do pagamento</label>
                  <input
                    id="pagamento-data"
                    name="paymentDate"
                    type="date"
                    value={formPagamento.paymentDate}
                    onChange={atualizarCampoPagamento}
                    aria-invalid={Boolean(errosPagamento.paymentDate)}
                    aria-describedby={
                      errosPagamento.paymentDate
                        ? "erro-pagamento-data"
                        : undefined
                    }
                  />
                  {errosPagamento.paymentDate && (
                    <p
                      className="payable-bills__pay-error"
                      id="erro-pagamento-data"
                      role="alert"
                    >
                      {errosPagamento.paymentDate}
                    </p>
                  )}
                </div>

                <div className="payable-bills__pay-field">
                  <label htmlFor="pagamento-metodo">Forma de pagamento</label>
                  <select
                    id="pagamento-metodo"
                    name="paymentMethod"
                    value={formPagamento.paymentMethod}
                    onChange={atualizarCampoPagamento}
                    aria-invalid={Boolean(errosPagamento.paymentMethod)}
                    aria-describedby={
                      errosPagamento.paymentMethod
                        ? "erro-pagamento-metodo"
                        : undefined
                    }
                  >
                    <option value="">Selecione a forma de pagamento</option>
                    {METODOS_PAGAMENTO.map((metodo) => (
                      <option key={metodo.value} value={metodo.value}>
                        {metodo.rotulo}
                      </option>
                    ))}
                  </select>
                  {errosPagamento.paymentMethod && (
                    <p
                      className="payable-bills__pay-error"
                      id="erro-pagamento-metodo"
                      role="alert"
                    >
                      {errosPagamento.paymentMethod}
                    </p>
                  )}
                </div>

                <div className="payable-bills__pay-field">
                  <label htmlFor="pagamento-valor">Valor (opcional)</label>
                  <input
                    id="pagamento-valor"
                    name="amount"
                    type="text"
                    inputMode="decimal"
                    placeholder="Deixe em branco para pagar o valor integral"
                    value={formPagamento.amount}
                    onChange={atualizarCampoPagamento}
                    onBlur={formatarValorPagamento}
                    aria-invalid={Boolean(errosPagamento.amount)}
                    aria-describedby={
                      errosPagamento.amount ? "erro-pagamento-valor" : undefined
                    }
                  />
                  {errosPagamento.amount && (
                    <p
                      className="payable-bills__pay-error"
                      id="erro-pagamento-valor"
                      role="alert"
                    >
                      {errosPagamento.amount}
                    </p>
                  )}
                </div>

                {mensagensErroPagamento.length > 0 && (
                  <div className="payable-bills__error" role="alert">
                    {mensagensErroPagamento.map((mensagem, indice) => (
                      <p key={indice}>{mensagem}</p>
                    ))}
                  </div>
                )}

                <div className="payable-bills__pay-actions">
                  <button
                    type="submit"
                    className="payable-bills__pay-confirm"
                    disabled={pagando}
                  >
                    {pagando ? "Quitando..." : "Confirmar pagamento"}
                  </button>
                  <button
                    type="button"
                    className="payable-bills__pay-cancel"
                    onClick={cancelarPagamento}
                    disabled={pagando}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </section>
          )}
        </>
      )}

      <footer className="payable-bills__page-footer">Aurora</footer>
    </main>
  );
}
