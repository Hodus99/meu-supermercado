/* ============================================================
   NEXUS PDV - script.js
   Versão com: busca CNPJ, alertas personalizados,
   hierarquia de cargos e cadastro de empresas
   ============================================================ */

/* --- Variáveis de Estado Global --- */
let usuariosCadastrados = JSON.parse(localStorage.getItem("usuarios_nexus")) || [];
let produtos = JSON.parse(localStorage.getItem("produtos_pdv")) || [
    { id: "1", nome: "Arroz", descricao: "Arroz integral", preco: 5.00, estoque: 20 },
    { id: "2", nome: "Feijão", descricao: "Feijão preto", preco: 7.50, estoque: 20 },
    { id: "3", nome: "Macarrão", descricao: "Macarrão parafuso", preco: 4.00, estoque: 20 },
];

let ultimaVendaRealizada = null;
let operadorLogado = JSON.parse(localStorage.getItem("operador_atual")) || null;
let historicoVendas = JSON.parse(localStorage.getItem("vendas")) || [];
let carrinho = [];
let totalVenda = 0;
let acaoPendente = null;
let fornecedores = JSON.parse(localStorage.getItem("fornecedores_nexus")) || [];
let empresas = JSON.parse(localStorage.getItem("empresas_nexus")) || [];

function salvarFornecedores() {
    localStorage.setItem("fornecedores_nexus", JSON.stringify(fornecedores));
}

function salvarEmpresas() {
    localStorage.setItem("empresas_nexus", JSON.stringify(empresas));
}

/* ============================================================
   SISTEMA DE ALERTAS PERSONALIZADOS
   Substitui alert() e confirm() do navegador
   ============================================================ */

function nexusAlerta(opcoes) {
    return new Promise((resolve) => {
        const modal    = document.getElementById("modal-nexus-alerta");
        const icone    = document.getElementById("alerta-icone");
        const titulo   = document.getElementById("alerta-titulo");
        const mensagem = document.getElementById("alerta-mensagem");
        const botoes   = document.getElementById("alerta-botoes");

        icone.innerText    = opcoes.icone    || "ℹ️";
        titulo.innerText   = opcoes.titulo   || "AVISO";
        mensagem.innerText = opcoes.mensagem || "";
        botoes.innerHTML   = "";

        const botoesConfig = opcoes.botoes || [{ texto: "OK", valor: true, estilo: "primary" }];

        botoesConfig.forEach(btn => {
            const el = document.createElement("button");
            el.innerText = btn.texto;
            el.style.cssText = btn.estilo === "primary"
                ? "background:#1d3557;color:white;padding:12px 30px;border:none;border-radius:8px;cursor:pointer;font-weight:bold;font-family:'Montserrat',sans-serif;min-width:100px;"
                : "background:#eee;color:#333;padding:12px 30px;border:none;border-radius:8px;cursor:pointer;font-weight:bold;font-family:'Montserrat',sans-serif;min-width:100px;";
            el.onclick = () => {
                modal.style.display = "none";
                resolve(btn.valor);
            };
            botoes.appendChild(el);
        });

        modal.style.display = "flex";
    });
}

/* Atalhos prontos */
function nexusOk(mensagem, titulo = "AVISO", icone = "ℹ️") {
    return nexusAlerta({ icone, titulo, mensagem, botoes: [{ texto: "OK", valor: true, estilo: "primary" }] });
}

function nexusSucesso(mensagem, titulo = "SUCESSO") {
    return nexusAlerta({ icone: "✅", titulo, mensagem, botoes: [{ texto: "OK", valor: true, estilo: "primary" }] });
}

function nexusErro(mensagem, titulo = "ERRO") {
    return nexusAlerta({ icone: "❌", titulo, mensagem, botoes: [{ texto: "OK", valor: true, estilo: "primary" }] });
}

function nexusConfirmar(mensagem, titulo = "CONFIRMAR") {
    return nexusAlerta({
        icone: "⚠️",
        titulo,
        mensagem,
        botoes: [
            { texto: "CANCELAR", valor: false, estilo: "secondary" },
            { texto: "CONFIRMAR", valor: true,  estilo: "primary"   }
        ]
    });
}

/* ============================================================
   BUSCA E CADASTRO DE PRODUTOS
   ============================================================ */

function buscarProduto() {
    const termo      = document.getElementById("codigoBusca").value;
    const divResult  = document.getElementById("resultado");
    const divCadastro = document.getElementById("areaCadastro");

    if (!divResult || !divCadastro) return;

    if (termo === "") {
        divResult.innerHTML = "";
        divResult.style.display = "none";
        divCadastro.style.display = "none";
        return;
    }

    const encontrados = produtos.filter(p => p.id.startsWith(termo));

    if (encontrados.length > 0) {
        divResult.style.display = "block";
        divResult.innerHTML = encontrados.map(p => `
            <div style="background:white;padding:15px;border-radius:12px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;box-shadow:0 2px 10px rgba(0,0,0,0.05);">
                <div>
                    <strong style="color:#1d3557;">${p.nome}</strong> (ID: ${p.id})<br>
                    <small>R$ ${p.preco.toFixed(2)} | Estoque: ${p.estoque}</small>
                </div>
                <button onclick="adicionarAoCarrinho('${p.id}')" style="background:#1d3557;color:white;border-radius:6px;cursor:pointer;border:none;font-weight:bold;padding:5px 15px;">+</button>
            </div>
        `).join("");
    } else {
        divResult.style.display = "block";
        divResult.innerHTML = "<span style='color:#c0392b;font-weight:bold;'>Produto não encontrado</span>";
        divCadastro.style.display = "block";
    }
}

function salvarNovoProduto() {
    const idNovo    = document.getElementById("codigoBusca").value;
    const nomeNovo  = document.getElementById("novoNome").value;
    const descNovo  = document.getElementById("novaDesc").value;
    const precoNovo = parseFloat(document.getElementById("novoPreco").value);

    if (nomeNovo && precoNovo) {
        produtos.push({ id: idNovo, nome: nomeNovo, descricao: descNovo, preco: precoNovo, estoque: 10 });
        localStorage.setItem("produtos_pdv", JSON.stringify(produtos));
        nexusSucesso("Produto cadastrado com sucesso!");
        document.getElementById("novoNome").value = "";
        document.getElementById("novaDesc").value = "";
        document.getElementById("novoPreco").value = "";
        document.getElementById("areaCadastro").style.display = "none";
        buscarProduto();
    } else {
        nexusErro("Por favor, preencha o nome e o preço do produto.");
    }
}

/* ============================================================
   GERENCIAMENTO DO CARRINHO
   ============================================================ */

function adicionarAoCarrinho(id) {
    const produto = produtos.find(p => p.id === id);

    if (!produto.estoque || produto.estoque <= 0) {
        nexusErro(`O produto "${produto.nome}" está esgotado!`, "ESTOQUE ESGOTADO");
        return;
    }
}

   let produtoAguardandoQtd = null;

function pedirQuantidadeProduto(produto) {
console.log("O botão foi clicado! Produto recebido:", produto);
    produtoAguardandoQtd = produto;
    
    document.getElementById("qtd-modal-titulo").innerText = "Adicionar " + produto.nome;
    document.getElementById("qtd-modal-mensagem").innerText = "Estoque disponível: " + produto.estoque;
    document.getElementById("qtd-modal-input").value = 1;
    
    // Abre o modal na tela
    document.getElementById("modal-quantidade").style.display = "flex";
    
    // Foca no input
    document.getElementById("qtd-modal-input").focus();
}

function fecharModalQuantidade() {
    document.getElementById("modal-quantidade").style.display = "none";
    produtoAguardandoQtd = null; // Limpa o produto da memória
}

function confirmarQuantidade() {
    // Pega o valor digitado no input do modal
    let qtdDigitada = document.getElementById("qtd-modal-input").value;
    let quantidade = parseInt(qtdDigitada);

    // Validação inicial
    if (isNaN(quantidade) || quantidade <= 0) {
        nexusErro("Por favor, informe uma quantidade válida!", "VALOR INCORRETO");
        return;
    }

    // Pega o produto que deixamos guardado na etapa 1
    const produto = produtoAguardandoQtd;

    // A SUA VALIDAÇÃO DE ESTOQUE PERMANECE AQUI
    if (quantidade > produto.estoque) {
        nexusErro("Quantidade superior ao estoque disponível!", "ESTOQUE INSUFICIENTE");
        return;
    }

    // A SUA LÓGICA DO CARRINHO PERMANECE AQUI
    const itemExistente = carrinho.find(item => item.id === produto.id);
    if (itemExistente) {
        itemExistente.quantidade += quantidade;
        itemExistente.subtotal = itemExistente.quantidade * itemExistente.precoUnitario;
    } else {
        carrinho.push({
            id: produto.id,
            nome: produto.nome,
            quantidade: quantidade,
            precoUnitario: produto.preco,
            subtotal: produto.preco * quantidade
        });
    }

    // Atualiza a tela do caixa/PDV com os novos dados do carrinho
            atualizarCarrinhoVisual();
    

    // Esconde o modal de volta
    fecharModalQuantidade();
}

function atualizarCarrinhoVisual() {
    const listaCarrinho = document.getElementById("itens-carrinho");
    if (!listaCarrinho) return;
    listaCarrinho.innerHTML = "";
    totalVenda = 0;

    carrinho.forEach((item, index) => {
        totalVenda += item.subtotal;
        listaCarrinho.innerHTML += `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;border-bottom:1px solid #eee;padding-bottom:5px;">
                <span><strong>${item.quantidade}x</strong> ${item.nome}</span>
                <div style="display:flex;gap:5px;align-items:center;">
                    <span style="margin-right:10px;">R$ ${item.subtotal.toFixed(2)}</span>
                    <button onclick="solicitarAlteracao(${index},'edit')" style="padding:2px 5px;background:#f1c40f;border:none;border-radius:3px;cursor:pointer;">✏️</button>
                    <button onclick="solicitarAlteracao(${index},'delete')" style="padding:2px 5px;background:#e63946;border:none;border-radius:3px;cursor:pointer;color:white;">🗑️</button>
                </div>
            </div>`;
    });

    const valTotal = document.getElementById("valor-total");
    if (valTotal) valTotal.innerText = totalVenda.toFixed(2);

    if (carrinho.length === 0) {
        listaCarrinho.innerHTML = "<p style='color:#888;'>O carrinho está vazio.</p>";
        totalVenda = 0;
        if (valTotal) valTotal.innerText = "0.00";
    }
}

function solicitarAlteracao(index, tipo) {
    const operador = JSON.parse(localStorage.getItem("operador_atual"));
    if (operador && (operador.role === "admin" || operador.role === "ADMIN" || operador.role === "admin_master" || operador.role === "admin_gerente")) {
        executarAcao(index, tipo);
    } else {
        acaoPendente = { index, tipo };
        const modalAuth = document.getElementById("modal-autorizacao");
        if (modalAuth) modalAuth.style.display = "flex";
        const inputAuthId = document.getElementById("auth-id-admin");
        if (inputAuthId) inputAuthId.focus();
    }
}

const btnConfirmarAuth = document.getElementById("confirmar-auth");
if (btnConfirmarAuth) {
    btnConfirmarAuth.onclick = function () {
        const idDigitada    = document.getElementById("auth-id-admin").value;
        const senhaDigitada = document.getElementById("auth-senha-admin").value;

        const lista1 = JSON.parse(localStorage.getItem("usuarios"))       || [];
        const lista2 = JSON.parse(localStorage.getItem("usuarios_nexus")) || [];
        const todos  = [...lista1, ...lista2];

        const supervisor = todos.find(u =>
            u.id === idDigitada &&
            u.senha === senhaDigitada &&
            (u.role === "admin" || u.role === "ADMIN" || u.role === "admin_master" || u.role === "admin_gerente")
        );

        if (supervisor) {
            nexusSucesso(`Autorizado por: ${supervisor.nome}`, "AUTORIZADO").then(() => {
                executarAcao(acaoPendente.index, acaoPendente.tipo);
            });
            fecharModalAuth();
        } else {
            nexusErro("ID ou Senha de Administrador inválidos.", "ACESSO NEGADO");
            document.getElementById("auth-id-admin").value  = "";
            document.getElementById("auth-senha-admin").value = "";
        }
    };
}

function executarAcao(index, tipo) {
    if (tipo === "delete") {
        carrinho.splice(index, 1);
    } else if (tipo === "edit") {
        let novaQtd = prompt("Digite a nova quantidade total:");
        if (novaQtd && novaQtd > 0) {
            carrinho[index].quantidade = parseInt(novaQtd);
            carrinho[index].subtotal   = carrinho[index].quantidade * carrinho[index].precoUnitario;
        }
    }
    atualizarCarrinhoVisual();
}

function fecharModalAuth() {
    const modal = document.getElementById("modal-autorizacao");
    if (modal) modal.style.display = "none";
    const id    = document.getElementById("auth-id-admin");
    const senha = document.getElementById("auth-senha-admin");
    if (id)    id.value    = "";
    if (senha) senha.value = "";
}

function limparCarrinho() {
    totalVenda = 0;
    carrinho   = [];
    atualizarCarrinhoVisual();
}

function finalizarVenda() {
    if (carrinho.length === 0) {
        nexusErro("O carrinho está vazio!", "CARRINHO VAZIO");
        return;
    }
    const modalTotal  = document.getElementById("modal-total-venda");
    const valorPago   = document.getElementById("valor-pago-cliente");
    const modalPagto  = document.getElementById("modal-pagamento");
    if (modalTotal) modalTotal.innerText = totalVenda.toFixed(2);
    if (valorPago)  valorPago.value      = totalVenda.toFixed(2);
    if (modalPagto) modalPagto.style.display = "flex";
    calcularTroco();
}

function finalizarVendaComBaixa() {
    const valorDigitado = parseFloat(document.getElementById("valor-pago-cliente").value) || 0;

    if (valorDigitado < totalVenda) {
        nexusErro("O valor pago não pode ser menor que o total da venda!", "VALOR INSUFICIENTE");
        return;
    }

    const venda = {
        id: Date.now(),
        data: new Date().toLocaleString(),
        operador: operadorLogado ? operadorLogado.nome : "Sistema",
        itens: JSON.parse(JSON.stringify(carrinho)),
        total: totalVenda,
        valorPago: valorDigitado,
        troco: valorDigitado - totalVenda,
        formaPagto: document.querySelector('input[name="forma-pagto"]:checked')?.value || "Não informado"
    };

    carrinho.forEach(item => {
        const produto = produtos.find(p => p.id === item.id);
        if (produto) {
            produto.estoque -= item.quantidade;
            if (produto.estoque < 0) produto.estoque = 0;
        }
    });

    localStorage.setItem("produtos_pdv", JSON.stringify(produtos));
    historicoVendas.push(venda);
    localStorage.setItem("vendas", JSON.stringify(historicoVendas));

    nexusSucesso("Venda registrada com sucesso!", "VENDA FINALIZADA").then(() => {
        nexusConfirmar("Deseja imprimir o cupom desta venda?", "IMPRIMIR CUPOM").then(confirmar => {
            if (confirmar) gerarNotaParaImpressao(venda);
        });
    });

    carrinho    = [];
    totalVenda  = 0;
    atualizarCarrinhoVisual();

    const modalPagto = document.getElementById("modal-pagamento");
    if (modalPagto) modalPagto.style.display = "none";
}

function selecionarFormaPagamento(tipo) {
    const secaoTroco = document.getElementById("secao-troco");
    if (secaoTroco) secaoTroco.style.display = tipo === "Dinheiro" ? "block" : "none";
    if (tipo === "Pix") gerarQRCodePix();
}

function gerarQRCodePix() {
    const valor = totalVenda.toFixed(2).replace(".", ",");
    nexusOk(`Valor: R$ ${valor}\n\nEscaneie o QR Code no monitor do cliente.`, "💠 SISTEMA PIX");
}

function gerarNotaParaImpressao(venda) {
    const div = document.createElement("div");
    div.id = "area-impressao-nota";
    const itensHTML = venda.itens.map(i => `
        <div style="display:flex;justify-content:space-between;font-size:14px;font-family:'Courier New',monospace;">
            <span>${i.quantidade}x ${i.nome}</span>
            <span>R$ ${i.subtotal.toFixed(2)}</span>
        </div>
    `).join("");
    div.innerHTML = `
        <div style="width:300px;padding:20px;font-family:'Courier New',monospace;border:1px solid #000;background:white;color:black;">
            <center>
                <h2 style="font-family:'Michroma',sans-serif!important;font-weight:400;text-transform:uppercase;margin:0;color:black;letter-spacing:2px;">NEXUS PDV</h2>
                <p style="font-size:12px;margin:5px 0;">SISTEMA DE GESTÃO</p>
            </center>
            <hr style="border-top:1px dashed #000;">
            <p style="font-size:11px;margin:0;">DATA: ${venda.data}</p>
            <p style="font-size:11px;margin:0;">OP: ${venda.operador}</p>
            <p style="font-size:11px;margin:0;">ID: ${venda.id}</p>
            <hr style="border-top:1px dashed #000;">
            ${itensHTML}
            <hr style="border-top:1px dashed #000;">
            <div style="display:flex;justify-content:space-between;font-weight:bold;font-size:16px;">
                <span>TOTAL:</span><span>R$ ${venda.total.toFixed(2)}</span>
            </div>
            <div style="font-size:13px;margin-top:5px;">
                <p style="margin:2px 0;">FORMA: ${venda.formaPagto}</p>
                <p style="margin:2px 0;">PAGO: R$ ${venda.valorPago.toFixed(2)}</p>
                <p style="margin:2px 0;">TROCO: R$ ${venda.troco.toFixed(2)}</p>
            </div>
            <br>
            <center><p style="font-size:10px;">*** DOCUMENTO NÃO FISCAL ***</p></center>
        </div>`;
    document.body.appendChild(div);
    window.print();
    document.body.removeChild(div);
}

function fecharModalPagamento() {
    const modal = document.getElementById("modal-pagamento");
    if (modal) modal.style.display = "none";
}

function calcularTroco() {
    const valorPago  = parseFloat(document.getElementById("valor-pago-cliente").value) || 0;
    const troco      = valorPago - totalVenda;
    const campoTroco = document.getElementById("valor-troco");
    if (campoTroco) campoTroco.innerText = troco > 0 ? troco.toFixed(2).replace(".", ",") : "0,00";
}

/* ============================================================
   LOGIN E SESSÃO
   ============================================================ */

async function fazerLogin() {
    const inputUser = document.getElementById("user-login");
    const inputPass = document.getElementById("pass-login");
    if (!inputUser || !inputPass) return;

    const userDigitado  = inputUser.value.trim();
    const senhaDigitada = inputPass.value.trim();

    try {
        const resposta = await fetch("http://localhost:3000/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ login: userDigitado, senha: senhaDigitada })
        });
        const dados = await resposta.json();

        if (dados.sucesso) {
            operadorLogado = dados.usuario;
            localStorage.setItem("operador_atual", JSON.stringify(dados.usuario));
            nexusSucesso(`Bem-vindo, ${dados.usuario.nome}!`, "ACESSO AUTORIZADO").then(() => {
                document.getElementById("login-backdrop")?.classList.add("escondido");
                document.getElementById("dashboard-admin")?.classList.remove("escondido");
                atualizarDadosDashboard();
                controlarBotaoPainel();
            });
        } else {
            nexusErro(dados.mensagem, "ACESSO NEGADO");
        }
    } catch (erro) {
        console.error("Erro ao conectar com a API:", erro);
        nexusErro("Não foi possível conectar ao servidor.\nVerifique se o backend (node server.js) está rodando.", "ERRO DE CONEXÃO");
    }
}

function verificarLoginSalvo() {
    const salvo = localStorage.getItem("operador_atual");
    if (salvo) {
        operadorLogado = JSON.parse(salvo);
        document.getElementById("login-backdrop")?.classList.add("escondido");
        document.getElementById("dashboard-admin")?.classList.remove("escondido");
        atualizarDadosDashboard();
        controlarBotaoPainel();
    }
}

function controlarBotaoPainel() {
    const btnVoltar = document.getElementById("btn-voltar-dash");
    if (!btnVoltar) return;
    const isAdmin = operadorLogado && (
        operadorLogado.role === "admin" ||
        operadorLogado.role === "admin_master" ||
        operadorLogado.role === "admin_gerente"
    );
    isAdmin ? btnVoltar.classList.remove("escondido") : btnVoltar.classList.add("escondido");
}

function voltarAoDashboard() {
    document.getElementById("dashboard-admin")?.classList.remove("escondido");
    document.getElementById("container-principal")?.classList.add("escondido");
    document.getElementById("login-backdrop")?.classList.add("escondido");
}

function fazerLogout() {
    localStorage.removeItem("operador_atual");
    location.reload();
}

function irParaVendas() {
    document.getElementById("dashboard-admin")?.classList.add("escondido");
    document.getElementById("container-principal")?.classList.remove("escondido");
}

function irParaDashboard() {
    document.getElementById("container-principal")?.classList.add("escondido");
    document.getElementById("dashboard-admin")?.classList.remove("escondido");
    atualizarDadosDashboard();
}

function atualizarDadosDashboard() {
    const totalFaturamento  = historicoVendas.reduce((acc, v) => acc + v.total, 0);
    const totalPedidos      = historicoVendas.length;
    const itensCriticos     = produtos.filter(p => p.estoque <= 5).length;

    const ef = document.getElementById("dash-faturamento");
    const eq = document.getElementById("dash-qtd-vendas");
    const ec = document.getElementById("dash-estoque-critico");
    if (ef) ef.innerText = totalFaturamento.toFixed(2);
    if (eq) eq.innerText = totalPedidos;
    if (ec) ec.innerText = itensCriticos;
}

/* ============================================================
   MENU LATERAL
   ============================================================ */

function toggleMenu() {
    const painel = document.getElementById("painel-lateral");
    if (!painel) return;
    painel.classList.add("menu-aberto");
    document.querySelectorAll("#btn-menu-sanduiche span").forEach(s => s.style.background = "#ffffff");

    if (operadorLogado) {
        const elemNome  = document.getElementById("nome-menu");
        const elemCargo = document.getElementById("cargo-menu");
        const abaAdmin  = document.getElementById("aba-admin");
        if (elemNome)  elemNome.innerText  = operadorLogado.nome;
        if (elemCargo) elemCargo.innerText = formatarCargo(operadorLogado.role);
        const isAdmin = operadorLogado.role === "admin" || operadorLogado.role === "ADMIN" ||
                        operadorLogado.role === "admin_master" || operadorLogado.role === "admin_gerente";
        if (abaAdmin && isAdmin) abaAdmin.classList.remove("escondido");
    }
}

function fecharMenuLateral() {
    document.getElementById("painel-lateral")?.classList.remove("menu-aberto");
    document.querySelectorAll("#btn-menu-sanduiche span").forEach(s => s.style.background = "#1d3557");
}

function formatarCargo(role) {
    const cargos = {
        "admin":              "ADMINISTRADOR",
        "ADMIN":              "ADMINISTRADOR",
        "admin_master":       "MASTER",
        "admin_gerente":      "GERENTE",
        "operador_vendedor":  "VENDEDOR",
        "operador_estoquista":"ESTOQUISTA",
        "operador_financeiro":"FINANCEIRO"
    };
    return cargos[role] || role.toUpperCase();
}

function abrirGerenciamentoUsuarios() {
    fecharMenuLateral();
    abrirModalCadastroUsuarios();
}

/* ============================================================
   RELATÓRIOS
   ============================================================ */

function gerarRelatorioVendas() {
    const isAdmin = operadorLogado && (
        operadorLogado.role === "admin" || operadorLogado.role === "ADMIN" ||
        operadorLogado.role === "admin_master" || operadorLogado.role === "admin_gerente"
    );
    if (!isAdmin) { nexusErro("Apenas administradores podem visualizar o relatório.", "ACESSO NEGADO"); return; }
    if (historicoVendas.length === 0) { nexusOk("Não há vendas registradas.", "SEM DADOS"); return; }

    let totalGeral = historicoVendas.reduce((acc, v) => acc + v.total, 0);
    const div = document.createElement("div");
    div.id = "area-relatorio-impressao";
    let html = `
        <div style="font-family:'Montserrat',sans-serif;padding:20px;color:black;max-width:800px;margin:0 auto;">
            <center>
                <h1 style="font-family:'Michroma',sans-serif;margin-bottom:5px;font-size:24px;">NEXUS PDV</h1>
                <h3 style="margin-top:0;letter-spacing:2px;">RELATÓRIO DE VENDAS</h3>
            </center>
            <hr style="border:1px solid #000;margin:20px 0;">`;
    historicoVendas.forEach(v => {
        html += `
            <div style="padding:12px 0;width:100%;">
                <div style="display:flex;justify-content:space-between;font-weight:800;">
                    <span>ID: #${v.id}</span><span>TOTAL: R$ ${v.total.toFixed(2)}</span>
                </div>
                <div style="font-size:12px;color:#333;">
                    <span>👤 OP: ${v.operador} | 📅 DATA: ${v.data}</span>
                </div>
            </div>`;
    });
    html += `
            <div style="margin-top:30px;border:2px solid #000;padding:20px;text-align:right;">
                <span style="font-size:20px;font-weight:900;">TOTAL: R$ ${totalGeral.toFixed(2)}</span>
            </div>
        </div>`;
    div.innerHTML = html;
    document.body.appendChild(div);
    window.print();
    document.body.removeChild(div);
}

function abrirRelatorioFaturamento() {
    const tR = document.getElementById("titulo-relatorio");
    const fR = document.getElementById("filtros-relatorio");
    if (tR) tR.innerText = "FATURAMENTO POR OPERADOR";
    if (fR) {
        fR.innerHTML = `
            <div class="container-filtros-relatorio">
                <input type="date" id="data-inicio">
                <span>até</span>
                <input type="date" id="data-fim">
                <select id="filtro-op">
                    <option value="todos">Todos Operadores</option>
                    ${[...new Set(historicoVendas.map(v => v.operador))].map(op => `<option value="${op}">${op}</option>`).join("")}
                </select>
                <button onclick="gerarTabelaFaturamento()">FILTRAR</button>
            </div>`;
    }
    gerarTabelaFaturamento();
}

function gerarTabelaFaturamento() {
    const dI  = document.getElementById("data-inicio")?.value;
    const dF  = document.getElementById("data-fim")?.value;
    const op  = document.getElementById("filtro-op")?.value;
    const fat = historicoVendas.reduce((acc, venda) => {
        const dataVenda = venda.data.split(",")[0].split("/").reverse().join("-");
        if (dI && dataVenda < dI) return acc;
        if (dF && dataVenda > dF) return acc;
        if (op !== "todos" && venda.operador !== op) return acc;
        acc[venda.operador] = (acc[venda.operador] || 0) + (parseFloat(venda.total) || 0);
        return acc;
    }, {});
    let html = `<table class='tabela-relatorio'><thead><tr><th>Operador</th><th>Total Acumulado</th></tr></thead><tbody>`;
    for (let o in fat) {
        html += `<tr><td><strong>${o}</strong></td><td>R$ ${fat[o].toFixed(2).replace(".", ",")}</td></tr>`;
    }
    html += "</tbody></table>";
    mostrarModalRelatorio(html);
}

function abrirRelatorioItensVendidos() {
    const tR = document.getElementById("titulo-relatorio");
    const fR = document.getElementById("filtros-relatorio");
    if (tR) tR.innerText = "DIAGNÓSTICO DE REPOSIÇÃO";
    if (fR) fR.innerHTML = "";
    const contagem = {};
    historicoVendas.forEach(venda => {
        venda.itens.forEach(item => {
            contagem[item.nome] = (contagem[item.nome] || 0) + (parseFloat(item.quantidade) || 0);
        });
    });
    let html = `<table class='tabela-relatorio'><thead><tr><th>Produto</th><th>Vendidos</th><th>Estoque Atual</th><th>Status</th></tr></thead><tbody>`;
    for (let produto in contagem) {
        const prodEstoque = produtos.find(p => p.nome === produto);
        const estoqueAtual = prodEstoque ? prodEstoque.estoque : 0;
        const vendidos     = contagem[produto];
        let status = "<span style='color:green;font-weight:bold;'>✅ OK</span>";
        if (estoqueAtual <= 0)           status = "<span style='color:red;font-weight:bold;'>🚨 CRÍTICO (ZERADO)</span>";
        else if (estoqueAtual < vendidos) status = "<span style='color:orange;font-weight:bold;'>⚠️ REPOR EM BREVE</span>";
        html += `<tr><td>${produto}</td><td>${vendidos} un</td><td>${estoqueAtual} un</td><td>${status}</td></tr>`;
    }
    html += "</tbody></table>";
    mostrarModalRelatorio(html);
}

function abrirRelatorioVendasDetalhado() {
    const tR = document.getElementById("titulo-relatorio");
    const fR = document.getElementById("filtros-relatorio");
    if (tR) tR.innerText = "HISTÓRICO DETALHADO DE VENDAS";
    if (fR) fR.innerHTML = "";
    let html = `<table class='tabela-relatorio'><thead><tr><th>Data/Hora</th><th>Total</th><th>Forma Pgto</th><th>Troco</th></tr></thead><tbody>`;
    [...historicoVendas].reverse().forEach(venda => {
        html += `<tr>
            <td>${venda.data}</td>
            <td>R$ ${parseFloat(venda.total).toFixed(2).replace(".", ",")}</td>
            <td>${venda.formaPagto}</td>
            <td>R$ ${parseFloat(venda.troco || 0).toFixed(2).replace(".", ",")}</td>
        </tr>`;
    });
    html += "</tbody></table>";
    mostrarModalRelatorio(html);
}

function mostrarModalRelatorio(conteudo) {
    const modal     = document.getElementById("modal-relatorios-dash");
    const container = document.getElementById("conteudo-relatorio");
    if (modal && container) {
        container.innerHTML = conteudo;
        modal.style.display = "flex";
    }
}

/* ============================================================
   ESTOQUE
   ============================================================ */

function abrirEstoque() {
    const modal = document.getElementById("modal-estoque");
    const lista = document.getElementById("lista-estoque");
    if (!modal || !lista) return;
    modal.style.display = "flex";
    lista.innerHTML = "";
    const isAdmin   = operadorLogado && (
        operadorLogado.role === "admin" || operadorLogado.role === "ADMIN" ||
        operadorLogado.role === "admin_master" || operadorLogado.role === "admin_gerente"
    );
    const rodape = document.getElementById("rodape-estoque-admin");
    if (rodape) rodape.style.display = isAdmin ? "flex" : "none";
    produtos.forEach(prod => {
        const tr = document.createElement("tr");
        const statusClass = prod.estoque <= 0 ? "status-vazio" : (prod.estoque <= 5 ? "status-baixo" : "status-bom");
        const statusTexto = prod.estoque <= 0 ? "Esgotado" : (prod.estoque <= 5 ? "Baixo" : "Ok");
        tr.innerHTML = `
            <td>#${prod.id}</td>
            <td style="font-weight:bold;">${prod.nome}</td>
            <td>R$ ${prod.preco.toFixed(2)}</td>
            <td>${prod.estoque} un</td>
            <td><span class="status-estoque ${statusClass}">${statusTexto}</span></td>
            ${isAdmin ? `<td>
                <button style="padding:5px 10px;background:#f1c40f;" onclick="editarProduto('${prod.id}')">✏️</button>
                <button style="padding:5px 10px;background:#e63946;" onclick="removerProduto('${prod.id}')">🗑️</button>
            </td>` : ""}`;
        lista.appendChild(tr);
    });
}

function fecharModalEstoque() {
    const modal = document.getElementById("modal-estoque");
    if (modal) modal.style.display = "none";
}

function filtrarEstoque() {
    const busca = document.getElementById("busca-estoque").value.toLowerCase();
    // BUG 2 CORRIGIDO: era "linea"
    document.querySelectorAll("#lista-estoque tr").forEach(linha => {
        linha.style.display = linha.innerText.toLowerCase().includes(busca) ? "" : "none";
    });
}

function abrirNovoProduto() {
    document.getElementById("titulo-form-produto").innerText = "Cadastrar Novo Produto";
    document.getElementById("edit-index").value = "";
    limparFormProduto();
    document.getElementById("modal-form-produto").style.display = "flex";
}

function editarProduto(id) {
    const produto = produtos.find(p => p.id === id);
    if (!produto) return;
    document.getElementById("titulo-form-produto").innerText  = "Editar Produto";
    document.getElementById("edit-index").value               = id;
    document.getElementById("prod-id-form").value             = produto.id;
    document.getElementById("prod-nome-form").value           = produto.nome;
    document.getElementById("prod-preco-form").value          = produto.preco;
    document.getElementById("prod-estoque-form").value        = produto.estoque;
    document.getElementById("modal-form-produto").style.display = "flex";
}

function salvarProdutoNexus() {
    const idOriginal = document.getElementById("edit-index").value;
    const novoDados  = {
        id:      document.getElementById("prod-id-form").value,
        nome:    document.getElementById("prod-nome-form").value,
        preco:   parseFloat(document.getElementById("prod-preco-form").value),
        estoque: parseInt(document.getElementById("prod-estoque-form").value)
    };
    if (idOriginal === "") {
        produtos.push(novoDados);
    } else {
        const index = produtos.findIndex(p => p.id === idOriginal);
        produtos[index] = novoDados;
    }
    localStorage.setItem("produtos_pdv", JSON.stringify(produtos));
    fecharFormProduto();
    abrirEstoque();
    nexusSucesso("Produto salvo com sucesso!");
}

function fecharFormProduto() {
    const modal = document.getElementById("modal-form-produto");
    if (modal) modal.style.display = "none";
}

function limparFormProduto() {
    document.querySelectorAll(".form-produto-content input").forEach(i => i.value = "");
}

function removerProduto(id) {
    nexusConfirmar("Deseja excluir este produto permanentemente?", "EXCLUIR PRODUTO").then(confirmado => {
        if (confirmado) {
            produtos = produtos.filter(p => p.id !== id);
            localStorage.setItem("produtos_pdv", JSON.stringify(produtos));
            abrirEstoque();
        }
    });
}

/* ============================================================
   FORNECEDORES
   ============================================================ */

function abrirModalFornecedores() {
    const modal = document.getElementById("modal-fornecedores");
    if (modal) { modal.style.display = "flex"; renderizarFornecedores(); }
}

function fecharModalFornecedores() {
    const modal = document.getElementById("modal-fornecedores");
    if (modal) modal.style.display = "none";
}

function cadastrarFornecedor() {
    const nome      = document.getElementById("forn-nome").value;
    const zap       = document.getElementById("forn-zap").value;
    const categoria = document.getElementById("forn-categoria").value;
    if (!nome || !zap) { nexusErro("Nome e WhatsApp são obrigatórios!", "CAMPOS OBRIGATÓRIOS"); return; }
    fornecedores.push({ id: Date.now(), nome, zap: zap.replace(/\D/g, ""), categoria });
    salvarFornecedores();
    document.getElementById("forn-nome").value = "";
    document.getElementById("forn-zap").value  = "";
    renderizarFornecedores();
}

function renderizarFornecedores() {
    const container = document.getElementById("container-lista-fornecedores");
    if (!container) return;
    container.innerHTML = "";
    if (fornecedores.length === 0) {
        container.innerHTML = "<p style='grid-column:1/-1;text-align:center;color:#999;'>Nenhum fornecedor cadastrado.</p>";
        return;
    }
    fornecedores.forEach(f => {
        container.innerHTML += `
            <div class="card-fornecedor">
                <strong style="color:#1d3557;font-size:1.1rem;text-transform:uppercase;">${f.nome}</strong>
                <p style="font-size:0.85rem;color:#555;margin:5px 0;">${f.categoria}</p>
                <a href="https://wa.me/55${f.zap}" target="_blank" class="btn-whatsapp-forn">CHAMA NO ZAP</a>
            </div>`;
    });
}

/* ============================================================
   CONTROLE DE EQUIPE
   ============================================================ */

function abrirModalCadastroUsuarios() {
    const modal = document.getElementById("modal-cadastro-usuarios");
    if (modal) {
        modal.style.display = "flex";
        popularSelectEmpresas("cad-empresa");
    }
}

function fecharModalCadastroUsuarios() {
    const modal = document.getElementById("modal-cadastro-usuarios");
    if (modal) modal.style.display = "none";
}

function salvarNovoOperador() {
    const nome    = document.getElementById("cad-nome-completo").value.trim();
    const user    = document.getElementById("cad-username").value.trim();
    const pass    = document.getElementById("cad-password").value.trim();
    const cargo   = document.getElementById("cad-cargo").value;
    const empresa = document.getElementById("cad-empresa").value;

    if (!nome || !user || !pass) {
        nexusErro("Por favor, preencha todos os campos obrigatórios!", "CAMPOS OBRIGATÓRIOS");
        return;
    }

    let usuariosSistema = JSON.parse(localStorage.getItem("usuarios_nexus")) || [];
    if (usuariosSistema.find(u => u.login === user || u.username === user)) {
        nexusErro("Este nome de usuário já está em uso!", "USUÁRIO DUPLICADO");
        return;
    }

    const idGerado = (usuariosSistema.length + 2).toString().padStart(3, "0");
    usuariosSistema.push({ id: idGerado, nome, login: user, username: user, senha: pass, role: cargo, empresa_id: empresa });
    localStorage.setItem("usuarios_nexus", JSON.stringify(usuariosSistema));

    nexusSucesso(`Operador "${nome}" cadastrado com sucesso!\nID: ${idGerado}`, "CADASTRO REALIZADO").then(() => {
        fecharModalCadastroUsuarios();
    });
}

/* ============================================================
   EMPRESAS — BUSCA DE CNPJ (BrasilAPI)
   ============================================================ */

function mascararCNPJ(input) {
    let v = input.value.replace(/\D/g, "").substring(0, 14);
    v = v.replace(/^(\d{2})(\d)/, "$1.$2");
    v = v.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3");
    v = v.replace(/\.(\d{3})(\d)/, ".$1/$2");
    v = v.replace(/(\d{4})(\d)/, "$1-$2");
    input.value = v;

    const campo   = document.getElementById("input-cnpj");
    const icone   = document.getElementById("cnpj-status-icon");
    const feedback = document.getElementById("cnpj-feedback");
    const soDigitos = v.replace(/\D/g, "");

    if (soDigitos.length === 0) {
        campo.style.borderColor  = "#ddd";
        icone.innerText          = "";
        feedback.innerText       = "";
        feedback.style.color     = "#555";
    } else if (soDigitos.length < 14) {
        campo.style.borderColor  = "#f39c12";
        icone.innerText          = "✏️";
        feedback.innerText       = "Continue digitando...";
        feedback.style.color     = "#f39c12";
    } else if (validarCNPJ(soDigitos)) {
        campo.style.borderColor  = "#2ecc71";
        icone.innerText          = "✅";
        feedback.innerText       = "CNPJ válido — clique em BUSCAR";
        feedback.style.color     = "#2ecc71";
    } else {
        campo.style.borderColor  = "#e74c3c";
        icone.innerText          = "❌";
        feedback.innerText       = "CNPJ inválido — verifique os números";
        feedback.style.color     = "#e74c3c";
    }
}

function validarCNPJ(cnpj) {
    if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;
    const calc = (cnpj, peso) => {
        let soma = 0;
        for (let i = 0; i < peso.length; i++) soma += parseInt(cnpj[i]) * peso[i];
        const resto = soma % 11;
        return resto < 2 ? 0 : 11 - resto;
    };
    const d1 = calc(cnpj, [5,4,3,2,9,8,7,6,5,4,3,2]);
    const d2 = calc(cnpj, [6,5,4,3,2,9,8,7,6,5,4,3,2]);
    return parseInt(cnpj[12]) === d1 && parseInt(cnpj[13]) === d2;
}

async function buscarCNPJ() {
    const campo     = document.getElementById("input-cnpj");
    const btn       = document.getElementById("btn-buscar-cnpj");
    const feedback  = document.getElementById("cnpj-feedback");
    const cnpjLimpo = campo.value.replace(/\D/g, "");

    if (cnpjLimpo.length !== 14) {
        nexusErro("Digite um CNPJ completo com 14 dígitos.", "CNPJ INCOMPLETO");
        return;
    }
    if (!validarCNPJ(cnpjLimpo)) {
        nexusErro("O CNPJ digitado é inválido.\nVerifique os números e tente novamente.", "CNPJ INVÁLIDO");
        campo.style.borderColor = "#e74c3c";
        return;
    }

    btn.innerText   = "⏳ BUSCANDO...";
    btn.disabled    = true;
    feedback.innerText  = "Consultando a Receita Federal...";
    feedback.style.color = "#1d3557";

    try {
        const resposta = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);

        if (!resposta.ok) {
            throw new Error("CNPJ não encontrado na base de dados.");
        }

        const dados = await resposta.json();

        // Preenche os campos automaticamente
        document.getElementById("emp-razao-social").value  = dados.razao_social        || "";
        document.getElementById("emp-nome-fantasia").value = dados.nome_fantasia        || dados.razao_social || "";
        document.getElementById("emp-situacao").value      = dados.descricao_situacao_cadastral || "";
        document.getElementById("emp-cnae").value          = dados.cnae_fiscal_descricao ? `${dados.cnae_fiscal} — ${dados.cnae_fiscal_descricao}` : "";
        document.getElementById("emp-telefone").value      = dados.ddd_telefone_1       ? `(${dados.ddd_telefone_1}) ${dados.telefone_1}` : "";
        document.getElementById("emp-email").value         = dados.email                || "";

        const end = [
            dados.logradouro, dados.numero, dados.complemento,
            dados.bairro, dados.municipio, dados.uf, dados.cep
        ].filter(Boolean).join(", ");
        document.getElementById("emp-endereco").value = end;

        feedback.innerText   = "✅ Dados preenchidos com sucesso!";
        feedback.style.color = "#2ecc71";

    } catch (erro) {
        nexusErro(`Não foi possível encontrar dados para este CNPJ.\n${erro.message}`, "CNPJ NÃO ENCONTRADO");
        campo.style.borderColor = "#e74c3c";
        document.getElementById("cnpj-status-icon").innerText = "❌";
        feedback.innerText   = "CNPJ não localizado na Receita Federal.";
        feedback.style.color = "#e74c3c";
    } finally {
        btn.innerText  = "🔍 BUSCAR";
        btn.disabled   = false;
    }
}

function limparFormEmpresa() {
    document.getElementById("input-cnpj").value       = "";
    document.getElementById("emp-razao-social").value = "";
    document.getElementById("emp-nome-fantasia").value = "";
    document.getElementById("emp-situacao").value      = "";
    document.getElementById("emp-cnae").value          = "";
    document.getElementById("emp-telefone").value      = "";
    document.getElementById("emp-email").value         = "";
    document.getElementById("emp-endereco").value      = "";
    document.getElementById("emp-tipo").value          = "matriz";
    document.getElementById("emp-matriz-vinculo").value = "";

    const campo    = document.getElementById("input-cnpj");
    const icone    = document.getElementById("cnpj-status-icon");
    const feedback = document.getElementById("cnpj-feedback");
    campo.style.borderColor = "#ddd";
    icone.innerText          = "";
    feedback.innerText       = "";
}

function abrirModalEmpresas() {
    const modal = document.getElementById("modal-empresas");
    if (modal) {
        modal.style.display = "flex";
        popularSelectMatrizes();
        renderizarEmpresas();
    }
}

function fecharModalEmpresas() {
    const modal = document.getElementById("modal-empresas");
    if (modal) modal.style.display = "none";
    limparFormEmpresa();
}

function popularSelectMatrizes() {
    const select = document.getElementById("emp-matriz-vinculo");
    if (!select) return;
    select.innerHTML = "<option value=''>— Apenas para filiais —</option>";
    empresas.filter(e => e.tipo === "matriz").forEach(e => {
        select.innerHTML += `<option value="${e.id}">${e.razao_social || e.nome_fantasia}</option>`;
    });
}

function popularSelectEmpresas(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    select.innerHTML = "<option value=''>— Selecionar empresa —</option>";
    empresas.forEach(e => {
        select.innerHTML += `<option value="${e.id}">[${e.tipo.toUpperCase()}] ${e.razao_social || e.nome_fantasia}</option>`;
    });
}

function salvarEmpresa() {
    const cnpj        = document.getElementById("input-cnpj").value.replace(/\D/g, "");
    const razaoSocial = document.getElementById("emp-razao-social").value.trim();
    const nomeFant    = document.getElementById("emp-nome-fantasia").value.trim();
    const tipo        = document.getElementById("emp-tipo").value;
    const matrizId    = document.getElementById("emp-matriz-vinculo").value;

    if (!cnpj || !razaoSocial) {
        nexusErro("Busque um CNPJ válido antes de salvar.", "DADOS INCOMPLETOS");
        return;
    }
    if (!validarCNPJ(cnpj)) {
        nexusErro("O CNPJ informado é inválido.", "CNPJ INVÁLIDO");
        return;
    }
    if (empresas.find(e => e.cnpj === cnpj)) {
        nexusErro("Esta empresa já está cadastrada.", "CNPJ DUPLICADO");
        return;
    }

    const novaEmpresa = {
        id:           Date.now().toString(),
        cnpj,
        razao_social: razaoSocial,
        nome_fantasia: nomeFant || razaoSocial,
        situacao:     document.getElementById("emp-situacao").value,
        cnae:         document.getElementById("emp-cnae").value,
        telefone:     document.getElementById("emp-telefone").value,
        email:        document.getElementById("emp-email").value,
        endereco:     document.getElementById("emp-endereco").value,
        tipo,
        matriz_id:    tipo === "filial" ? matrizId : null
    };

    empresas.push(novaEmpresa);
    salvarEmpresas();

    nexusSucesso(`Empresa "${novaEmpresa.nome_fantasia}" cadastrada com sucesso!`, "EMPRESA CADASTRADA").then(() => {
        limparFormEmpresa();
        renderizarEmpresas();
        popularSelectMatrizes();
    });
}

function renderizarEmpresas() {
    const container = document.getElementById("container-lista-empresas");
    if (!container) return;
    container.innerHTML = "";

    if (empresas.length === 0) {
        container.innerHTML = "<p style='color:#999;font-size:0.9rem;'>Nenhuma empresa cadastrada ainda.</p>";
        return;
    }

    empresas.forEach(e => {
        const isMatriz    = e.tipo === "matriz";
        const corBorda    = isMatriz ? "#1d3557" : "#457b9d";
        const iconeEmpresa = isMatriz ? "🏛️" : "🏪";
        const matrizNome  = e.matriz_id ? (empresas.find(m => m.id === e.matriz_id)?.nome_fantasia || "—") : "—";

        container.innerHTML += `
            <div style="background:#fdfdfd;border-left:5px solid ${corBorda};border-radius:10px;padding:15px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
                    <span style="font-size:1.4rem;">${iconeEmpresa}</span>
                    <span style="font-size:0.7rem;background:${isMatriz ? "#1d3557" : "#457b9d"};color:white;padding:3px 8px;border-radius:10px;font-weight:bold;">${e.tipo.toUpperCase()}</span>
                </div>
                <strong style="color:#1d3557;font-size:1rem;text-transform:uppercase;">${e.nome_fantasia}</strong>
                <p style="font-size:0.75rem;color:#777;margin:3px 0;">${e.razao_social}</p>
                <p style="font-size:0.75rem;color:#555;margin:3px 0;">CNPJ: ${e.cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5")}</p>
                ${!isMatriz ? `<p style="font-size:0.75rem;color:#888;margin:3px 0;">Matriz: ${matrizNome}</p>` : ""}
                <p style="font-size:0.75rem;color:${e.situacao === 'ATIVA' ? 'green' : 'orange'};font-weight:bold;margin-top:6px;">${e.situacao || "—"}</p>
                <button onclick="removerEmpresa('${e.id}')" style="margin-top:10px;background:#e74c3c;color:white;border:none;padding:5px 12px;border-radius:5px;cursor:pointer;font-size:0.75rem;">🗑️ Remover</button>
            </div>`;
    });
}

function removerEmpresa(id) {
    nexusConfirmar("Deseja remover esta empresa do sistema?", "REMOVER EMPRESA").then(confirmado => {
        if (confirmado) {
            empresas = empresas.filter(e => e.id !== id);
            salvarEmpresas();
            renderizarEmpresas();
            popularSelectMatrizes();
        }
    });
}

/* ============================================================
   FROTA
   ============================================================ */

function abrirModalFrota() {
    document.getElementById("modal-frota").style.display = "flex";
    buscarVeiculos();
}

function fecharModalFrota() {
    document.getElementById("modal-frota").style.display = "none";
    document.getElementById("frota-modelo").value    = "";
    document.getElementById("frota-placa").value     = "";
    document.getElementById("frota-motorista").value = "";
    document.getElementById("frota-gasolina").value  = "";
}

async function buscarVeiculos() {
    try {
        const resposta = await fetch("http://localhost:3000/api/veiculos");
        const veiculos = await resposta.json();
        const container = document.getElementById("container-lista-frota");
        container.innerHTML = "";
        if (veiculos.length === 0) {
            container.innerHTML = `<p style="color:#888;grid-column:1/-1;">Nenhum veículo cadastrado na frota.</p>`;
            return;
        }
        veiculos.forEach(v => {
            let cor = "#2ecc71";
            if (v.combustivel_atual <= 25) cor = "#e74c3c";
            else if (v.combustivel_atual <= 50) cor = "#f39c12";
            const card = document.createElement("div");
            card.style = "background:#fdfdfd;border:1px solid #e1e8ed;border-left:5px solid #1d3557;padding:15px;border-radius:6px;box-shadow:0 2px 5px rgba(0,0,0,0.05);";
            card.innerHTML = `
                <strong style="font-size:1.1rem;color:#1d3557;text-transform:uppercase;">${v.modelo}</strong>
                <span style="display:block;font-size:0.8rem;color:#7f8c8d;font-weight:bold;margin-bottom:8px;">Placa: ${v.placa}</span>
                <div style="margin-bottom:6px;font-size:0.9rem;"><strong>👤 Condutor:</strong> <span style="color:#555;">${v.motorista_dia || "Não designado"}</span></div>
                <div style="font-size:0.9rem;display:flex;align-items:center;gap:8px;">
                    <strong>⛽ Combustível:</strong>
                    <span style="color:${cor};font-weight:bold;">${parseFloat(v.combustivel_atual)}%</span>
                </div>
                <div style="margin-top:10px;">
                    <button onclick="carregarDadosEdicao('${v.modelo}','${v.placa}','${v.motorista_dia}',${v.combustivel_atual})" style="background:#34495e;color:white;border:none;padding:5px 10px;border-radius:4px;cursor:pointer;font-size:0.75rem;">Editar</button>
                </div>`;
            container.appendChild(card);
        });
    } catch (erro) {
        console.error("Erro ao processar frota:", erro);
    }
}

async function salvarVeiculo() {
    const modelo    = document.getElementById("frota-modelo").value.trim();
    const placa     = document.getElementById("frota-placa").value.trim().toUpperCase();
    const motorista = document.getElementById("frota-motorista").value.trim() || "Não designado";
    const gasolina  = document.getElementById("frota-gasolina").value.trim() || "100";
    if (!modelo || !placa) { nexusErro("Preencha pelo menos o Modelo e a Placa!", "CAMPOS OBRIGATÓRIOS"); return; }
    try {
        const resposta = await fetch("http://localhost:3000/api/veiculos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ modelo, placa, motorista_dia: motorista, combustivel_atual: parseFloat(gasolina) })
        });
        const dados = await resposta.json();
        if (dados.sucesso) {
            buscarVeiculos();
            document.getElementById("frota-modelo").value    = "";
            document.getElementById("frota-placa").value     = "";
            document.getElementById("frota-motorista").value = "";
            document.getElementById("frota-gasolina").value  = "";
        }
    } catch (erro) {
        nexusErro("Erro ao conectar com o servidor.", "ERRO DE CONEXÃO");
    }
}

function carregarDadosEdicao(modelo, placa, motorista, gasolina) {
    document.getElementById("frota-modelo").value    = modelo;
    document.getElementById("frota-placa").value     = placa;
    document.getElementById("frota-motorista").value = motorista === "Não designado" ? "" : motorista;
    document.getElementById("frota-gasolina").value  = gasolina;
}

/* ============================================================
   FORMULÁRIO DE CADASTRO NA TELA DE LOGIN
   ============================================================ */

function alternarFormularios(tipo) {
    const formLogin   = document.getElementById("form-login");
    const formCadastro = document.getElementById("form-cadastro");
    if (tipo === "cadastro") {
        if (formLogin)    formLogin.style.display    = "none";
        if (formCadastro) formCadastro.style.display = "block";
    } else {
        if (formLogin)    formLogin.style.display    = "block";
        if (formCadastro) formCadastro.style.display = "none";
    }
}

function cadastrarNovoUsuario() {
    const nome  = document.getElementById("novo-nome-usuario").value.trim();
    const user  = document.getElementById("novo-usuario").value.trim();
    const pass  = document.getElementById("nova-senha").value.trim();
    const cargo = document.getElementById("novo-cargo-usuario").value;
    if (!nome || !user || !pass) { nexusErro("Por favor, preencha todos os campos!", "CAMPOS OBRIGATÓRIOS"); return; }
    let usuariosSistema = JSON.parse(localStorage.getItem("usuarios_nexus")) || [];
    if (usuariosSistema.find(u => u.login === user)) { nexusErro("Este nome de usuário já está em uso!", "USUÁRIO DUPLICADO"); return; }
    const idGerado = (usuariosSistema.length + 2).toString().padStart(3, "0");
    usuariosSistema.push({ id: idGerado, nome, login: user, username: user, senha: pass, role: cargo });
    localStorage.setItem("usuarios_nexus", JSON.stringify(usuariosSistema));
    nexusSucesso(`Usuário "${nome}" cadastrado!\nID: ${idGerado}`, "CADASTRO REALIZADO").then(() => {
        alternarFormularios("login");
    });
}

/* ============================================================
   LISTENERS GLOBAIS E INICIALIZAÇÃO
   ============================================================ */

document.addEventListener("keydown", function (event) {
    if (event.key === "F2") { event.preventDefault(); finalizarVenda(); }
});

function atualizarRelogio() {
    const p = document.getElementById("relogio-brasilia");
    if (p) p.innerText = new Date().toLocaleString("pt-BR");
}

function correcaoGeralAcesso() {
    // BUG 3 CORRIGIDO: senha removida do código
    // Crie seu usuário master diretamente no PostgreSQL:
    // INSERT INTO usuarios (nome, login, senha, role)
    // VALUES ('Yran Sousa Paixão', 'yran_nexus', 'SUA_SENHA_AQUI', 'admin_master')
    // ON CONFLICT (login) DO NOTHING;
    console.log("NEXUS PDV iniciado. Autenticação via banco de dados PostgreSQL.");
}

window.addEventListener("DOMContentLoaded", () => {
    atualizarRelogio();
    correcaoGeralAcesso();
    verificarLoginSalvo();
    setInterval(atualizarRelogio, 1000);
});
