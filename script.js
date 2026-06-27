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

function salvarFornecedores() {
    localStorage.setItem("fornecedores_nexus", JSON.stringify(fornecedores));
}

/* --- Funções de Busca e Cadastro de Produtos --- */
function buscarProduto() {
    const termo = document.getElementById("codigoBusca").value;
    const divResultado = document.getElementById("resultado");
    const divCadastro = document.getElementById("areaCadastro");

    if (!divResultado || !divCadastro) return;

    if (termo === "") {
        divResultado.innerHTML = "";
        divResultado.style.display = "none";
        divCadastro.style.display = "none";
        return;
    }

    const encontrados = produtos.filter(p => p.id.startsWith(termo));

    if (encontrados.length > 0) {
        divResultado.style.display = "block"; 
        divResultado.innerHTML = encontrados.map(p => `
            <div style="background: white; padding: 15px; border-radius: 12px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
                <div>
                    <strong style="color: #1d3557;">${p.nome}</strong> (ID: ${p.id})<br>
                    <small>R$ ${p.preco.toFixed(2)} | Estoque: ${p.estoque}</small>
                </div>
                <button onclick="adicionarAoCarrinho('${p.id}')" style="background: #1d3557; color: white; border-radius: 6px; cursor: pointer; border: none; font-weight: bold; padding: 5px 15px;">+</button>
            </div>
        `).join("");
    } else {
        divResultado.style.display = "block";
        divResultado.innerHTML = "<span style='color: #c0392b; font-weight: bold;'>Produto não encontrado</span>";
        divCadastro.style.display = "block";
    }
}

function salvarNovoProduto() {
    const idNovo = document.getElementById("codigoBusca").value;
    const nomeNovo = document.getElementById("novoNome").value;
    const descricaoNovo = document.getElementById("novaDesc").value;
    const precoNovo = parseFloat(document.getElementById("novoPreco").value);

    if (nomeNovo && precoNovo) {
        produtos.push({
            id: idNovo,
            nome: nomeNovo,
            descricao: descricaoNovo,
            preco: precoNovo,
            estoque: 10
        });
        
        localStorage.setItem("produtos_pdv", JSON.stringify(produtos));
        alert("Produto cadastrado com sucesso!");

        document.getElementById("novoNome").value = "";
        document.getElementById("novaDesc").value = "";
        document.getElementById("novoPreco").value = "";
        document.getElementById('areaCadastro').style.display = "none";
        buscarProduto();
    } else {
        alert("Por favor, preencha o nome e o preço do produto.");
    }
}

/* --- Gerenciamento do Carrinho --- */
function adicionarAoCarrinho(id) {
    const produto = produtos.find(p => p.id === id);
    
    if (!produto.estoque || produto.estoque <= 0) {
        alert(`O produto ${produto.nome} está esgotado!`);
        return;
    }

    let qtd = prompt(`Quantas unidades de ${produto.nome} deseja adicionar?`, "1");

    if (qtd !== null && qtd > 0) {
        let quantidade = parseInt(qtd);

        if (quantidade > produto.estoque) {
            alert("Quantidade superior ao estoque disponível!");
            return;
        }

        const itemExistente = carrinho.find(item => item.id === id);
        if (itemExistente) {
            // ✅ BUG 1 CORRIGIDO: era "grandmother", agora é "quantidade"
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

        atualizarCarrinhoVisual();
    }
}

function atualizarCarrinhoVisual() {
    const listaCarrinho = document.getElementById("itens-carrinho");
    if (!listaCarrinho) return;
    listaCarrinho.innerHTML = "";
    
    totalVenda = 0; 

    carrinho.forEach((item, index) => {
        totalVenda += item.subtotal;
        
        listaCarrinho.innerHTML += `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 5px;">
                <span><strong>${item.quantidade}x</strong> ${item.nome}</span>
                <div style="display: flex; gap: 5px; align-items: center;">
                    <span style="margin-right: 10px;">R$ ${item.subtotal.toFixed(2)}</span>
                    <button onclick="solicitarAlteracao(${index}, 'edit')" style="padding: 2px 5px; background: #f1c40f; border: none; border-radius: 3px; cursor: pointer;">✏️</button>
                    <button onclick="solicitarAlteracao(${index}, 'delete')" style="padding: 2px 5px; background: #e63946; border: none; border-radius: 3px; cursor: pointer; color: white;">🗑️</button>
                </div>
            </div>`;
    });

    const valTotal = document.getElementById("valor-total");
    if (valTotal) valTotal.innerText = totalVenda.toFixed(2);
    
    if (carrinho.length === 0) {
        listaCarrinho.innerHTML = "<p style='color: #888;'>O carrinho está vazio.</p>";
        totalVenda = 0;
        if (valTotal) valTotal.innerText = "0.00";
    }
}

function solicitarAlteracao(index, tipo) {
    const operador = JSON.parse(localStorage.getItem("operador_atual"));
    
    if (operador && (operador.role === "admin" || operador.role === "ADMIN")) {
        executarAcao(index, tipo);
    } else {
        acaoPendente = { index, tipo };
        const modalAuth = document.getElementById("modal-autorizacao");
        if (modalAuth) modalAuth.style.display = "flex";
        const inputAuthId = document.getElementById("auth-id-admin");
        if (inputAuthId) inputAuthId.focus();
    }
}

/* --- Configuração do clique de autorização --- */
const btnConfirmarAuth = document.getElementById("confirmar-auth");
if (btnConfirmarAuth) {
    btnConfirmarAuth.onclick = function() {
        const idDigitada = document.getElementById("auth-id-admin").value;
        const senhaDigitada = document.getElementById("auth-senha-admin").value;
        
        const lista1 = JSON.parse(localStorage.getItem("usuarios")) || [];
        const lista2 = JSON.parse(localStorage.getItem("usuarios_nexus")) || [];
        const todosUsuarios = [...lista1, ...lista2];

        const supervisor = todosUsuarios.find(u => 
            u.id === idDigitada && 
            u.senha === senhaDigitada && 
            (u.role === "admin" || u.role === "ADMIN")
        );

        if (supervisor) {
            alert(`Autorizado por: ${supervisor.nome}`);
            executarAcao(acaoPendente.index, acaoPendente.tipo);
            fecharModalAuth();
        } else {
            alert("ID ou Senha de Administrador inválida!");
            document.getElementById("auth-id-admin").value = "";
            document.getElementById("auth-senha-admin").value = "";
        }
    };
}

function executarAcao(index, tipo) {
    if (tipo === 'delete') {
        carrinho.splice(index, 1);
    } else if (tipo === 'edit') {
        let novaQtd = prompt("Digite a nova quantidade total:");
        if (novaQtd && novaQtd > 0) {
            carrinho[index].quantidade = parseInt(novaQtd);
            carrinho[index].subtotal = carrinho[index].quantidade * carrinho[index].precoUnitario;
        }
    }
    atualizarCarrinhoVisual();
}

function fecharModalAuth() {
    const modal = document.getElementById("modal-autorizacao");
    if (modal) modal.style.display = "none";
    const idAdmin = document.getElementById("auth-id-admin");
    const senhaAdmin = document.getElementById("auth-senha-admin");
    if (idAdmin) idAdmin.value = "";
    if (senhaAdmin) senhaAdmin.value = "";
}

function limparCarrinho() {
    totalVenda = 0;
    carrinho = [];
    atualizarCarrinhoVisual();
}

function finalizarVenda() {
    if (carrinho.length === 0) {
        alert("O carrinho está vazio!");
        return;
    }

    const modalTotal = document.getElementById("modal-total-venda");
    const valorPago = document.getElementById("valor-pago-cliente");
    const modalPagto = document.getElementById("modal-pagamento");

    if (modalTotal) modalTotal.innerText = totalVenda.toFixed(2);
    if (valorPago) valorPago.value = totalVenda.toFixed(2);
    if (modalPagto) modalPagto.style.display = "flex";

    calcularTroco();
}

function finalizarVendaComBaixa() {
    const valorDigitado = parseFloat(document.getElementById("valor-pago-cliente").value) || 0;

    if (valorDigitado < totalVenda) {
        alert("O valor pago não pode ser menor que o total da venda!");
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

    alert("Venda finalizada com sucesso!");

    const desejaImprimir = confirm("Deseja imprimir o cupom desta venda?");
    if (desejaImprimir) {
        gerarNotaParaImpressao(venda);
    }

    carrinho = [];
    totalVenda = 0;
    atualizarCarrinhoVisual();
    
    const modalPagto = document.getElementById("modal-pagamento");
    if (modalPagto) modalPagto.style.display = "none";
}

function selecionarFormaPagamento(tipo) {
    const secaoTroco = document.getElementById("secao-troco");
    if (secaoTroco) {
        secaoTroco.style.display = tipo === 'Dinheiro' ? "block" : "none";
    }

    if (tipo === 'Pix') {
        gerarQRCodePix();
    }
}

function gerarQRCodePix() {
    const valorParaPix = totalVenda.toFixed(2).replace(".", ",");
    alert(`💠 SISTEMA PIX\nValor: R$ ${valorParaPix}\n\nEscaneie o QR Code no monitor do cliente.`);
}

function gerarNotaParaImpressao(venda) {
    const divImpressao = document.createElement("div");
    divImpressao.id = "area-impressao-nota";
    
    const itensHTML = venda.itens.map(i => `
        <div style="display: flex; justify-content: space-between; font-size: 14px; font-family: 'Courier New', monospace;">
            <span>${i.quantidade}x ${i.nome}</span>
            <span>R$ ${i.subtotal.toFixed(2)}</span>
        </div>
    `).join("");

    divImpressao.innerHTML = `
        <div style="width: 300px; padding: 20px; font-family: 'Courier New', monospace; border: 1px solid #000; background: white; color: black;">
            <center>
                <h2 style="font-family: 'Michroma', sans-serif !important; font-weight: 400; text-transform: uppercase; margin: 0; color: black; letter-spacing: 2px;">NEXUS PDV</h2>
                <p style="font-size: 12px; margin: 5px 0;">SISTEMA DE GESTÃO</p>
            </center>
            <hr style="border-top: 1px dashed #000;">
            <p style="font-size: 11px; margin: 0;">DATA: ${venda.data}</p>
            <p style="font-size: 11px; margin: 0;">OP: ${venda.operador}</p>
            <p style="font-size: 11px; margin: 0;">ID: ${venda.id}</p>
            <hr style="border-top: 1px dashed #000;">
            ${itensHTML}
            <hr style="border-top: 1px dashed #000;">
            <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 16px;">
                <span>TOTAL:</span> <span>R$ ${venda.total.toFixed(2)}</span>
            </div>
            <div style="font-size: 13px; margin-top: 5px;">
                <p style="margin: 2px 0;">FORMA: ${venda.formaPagto}</p>
                <p style="margin: 2px 0;">PAGO: R$ ${venda.valorPago.toFixed(2)}</p>
                <p style="margin: 2px 0;">TROCO: R$ ${venda.troco.toFixed(2)}</p>
            </div>
            <br>
            <center><p style="font-size: 10px;">*** DOCUMENTO NÃO FISCAL ***</p></center>
        </div>
    `;

    document.body.appendChild(divImpressao);
    window.print(); 
    document.body.removeChild(divImpressao); 
}

function fecharModalPagamento() {
    const modal = document.getElementById("modal-pagamento");
    if (modal) modal.style.display = "none";
}

function calcularTroco() {
    const valorPago = parseFloat(document.getElementById("valor-pago-cliente").value) || 0;
    const troco = valorPago - totalVenda;
    const campoTroco = document.getElementById("valor-troco");

    if (campoTroco) {
        campoTroco.innerText = troco > 0 ? troco.toFixed(2).replace(".", ",") : "0,00";
    }
}

/* --- Sistema de Login Conectado ao PostgreSQL (Via API) --- */
async function fazerLogin() {
    const inputUser = document.getElementById("user-login");
    const inputPass = document.getElementById("pass-login");

    if (!inputUser || !inputPass) return;

    const userDigitado = inputUser.value.trim();
    const senhaDigitada = inputPass.value.trim();

    try {
        const resposta = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ login: userDigitado, senha: senhaDigitada })
        });

        const dados = await resposta.json();

        if (dados.sucesso) {
            operadorLogado = dados.usuario;
            localStorage.setItem("operador_atual", JSON.stringify(dados.usuario));
            
            alert("Acesso autorizado! Bem-vindo, " + dados.usuario.nome);
            
            const backdrop = document.getElementById("login-backdrop");
            const dash = document.getElementById("dashboard-admin");
            
            if (backdrop) backdrop.classList.add("escondido");
            if (dash) dash.classList.remove("escondido");
            
            atualizarDadosDashboard();
            controlarBotaoPainel();
        } else {
            alert(dados.mensagem);
        }
    } catch (erro) {
        console.error('Erro ao conectar com a API:', erro);
        alert('Não foi possível conectar ao servidor. Certifique-se de que o backend (node server.js) está rodando no terminal.');
    }
}

function verificarLoginSalvo() {
    const salvo = localStorage.getItem("operador_atual");
    if (salvo) {
        operadorLogado = JSON.parse(salvo);
        const backdrop = document.getElementById("login-backdrop");
        const dash = document.getElementById("dashboard-admin");
        
        if (backdrop) backdrop.classList.add("escondido");
        if (dash) dash.classList.remove("escondido");
        
        atualizarDadosDashboard();
        controlarBotaoPainel();
    }
}

/* --- Controle de Navegação do Painel do Administrador --- */
function controlarBotaoPainel() {
    const btnVoltar = document.getElementById("btn-voltar-dash");
    if (!btnVoltar) return;

    if (operadorLogado && operadorLogado.role === "admin") {
        btnVoltar.classList.remove("escondido");
    } else {
        btnVoltar.classList.add("escondido");
    }
}

function voltarAoDashboard() {
    const dash = document.getElementById("dashboard-admin");
    const vendas = document.getElementById("container-principal");
    const backdrop = document.getElementById("login-backdrop");

    if (dash) dash.classList.remove("escondido");
    if (vendas) vendas.classList.add("escondido");
    if (backdrop) backdrop.classList.add("escondido");
}

function fazerLogout() {
    localStorage.removeItem("operador_atual");
    location.reload();
}

function irParaVendas() {
    const dash = document.getElementById("dashboard-admin");
    const vendas = document.getElementById("container-principal");

    if (dash) dash.classList.add("escondido");
    if (vendas) vendas.classList.remove("escondido");
}

function irParaDashboard() {
    const principal = document.getElementById("container-principal");
    const dash = document.getElementById("dashboard-admin");

    if (principal) principal.classList.add("escondido");
    if (dash) dash.classList.remove("escondido");
    
    atualizarDadosDashboard();
}

function atualizarDadosDashboard() {
    const totalFaturamento = historicoVendas.reduce((acc, v) => acc + v.total, 0);
    const totalPedidos = historicoVendas.length;
    const itensCriticos = produtos.filter(p => p.estoque <= 5).length;

    const elemFaturamento = document.getElementById("dash-faturamento");
    const elemQtdVendas = document.getElementById("dash-qtd-vendas");
    const elemEstoqueCritico = document.getElementById("dash-estoque-critico");

    if (elemFaturamento) elemFaturamento.innerText = totalFaturamento.toFixed(2);
    if (elemQtdVendas) elemQtdVendas.innerText = totalPedidos;
    if (elemEstoqueCritico) elemEstoqueCritico.innerText = itensCriticos;
}

/* --- Menu Lateral --- */
function toggleMenu() {
    const painel = document.getElementById("painel-lateral");
    const spans = document.querySelectorAll("#btn-menu-sanduiche span");
    
    if (!painel) return;
    painel.classList.add("menu-aberto");
    spans.forEach(s => s.style.background = "#ffffff");

    if (operadorLogado) {
        const elemNome = document.getElementById("nome-menu");
        const elemCargo = document.getElementById("cargo-menu");
        const abaAdmin = document.getElementById("aba-admin");

        if (elemNome) elemNome.innerText = operadorLogado.nome;
        if (elemCargo) elemCargo.innerText = operadorLogado.role.toUpperCase();
        
        if (abaAdmin && (operadorLogado.role === "admin" || operadorLogado.role === "ADMIN")) {
            abaAdmin.classList.remove("escondido");
        }
    }
}

function fecharMenuLateral() {
    const painel = document.getElementById("painel-lateral");
    if (painel) painel.classList.remove("menu-aberto");
    document.querySelectorAll("#btn-menu-sanduiche span").forEach(s => s.style.background = "#1d3557");
}

/* --- Relatórios --- */
function gerarRelatorioVendas() {
    if (!operadorLogado || (operadorLogado.role !== "admin" && operadorLogado.role !== "ADMIN")) {
        alert("Acesso negado! Apenas administradores podem visualizar o relatório.");
        return;
    }
    if (historicoVendas.length === 0) {
        alert("Não há vendas registradas.");
        return;
    }

    let totalCaixaGeral = historicoVendas.reduce((acc, venda) => acc + venda.total, 0);
    const divRelatorio = document.createElement("div");
    divRelatorio.id = "area-relatorio-impressao";
    
    let htmlRelatorio = `
        <div style="font-family: 'Montserrat', sans-serif; padding: 20px; color: black; max-width: 800px; margin: 0 auto;">
            <center>
                <h1 style="font-family: 'Michroma', sans-serif; margin-bottom: 5px; font-size: 24px;">NEXUS PDV</h1>
                <h3 style="margin-top: 0; letter-spacing: 2px;">RELATÓRIO DE VENDAS</h3>
            </center>
            <hr style="border: 1px solid #000; margin: 20px 0;">
    `;

    historicoVendas.forEach((v) => {
        htmlRelatorio += `
            <div class="venda-item" style="padding: 12px 0; width: 100%;">
                <div style="display: flex; justify-content: space-between; font-weight: 800;">
                    <span>ID: #${v.id}</span>
                    <span>TOTAL: R$ ${v.total.toFixed(2)}</span>
                </div>
                <div style="font-size: 12px; color: #333;">
                    <span>👤 OP: ${v.operador} | 📅 DATA: ${v.data}</span>
                </div>
            </div>
        `;
    });

    htmlRelatorio += `
            <div style="margin-top: 30px; border: 2px solid #000; padding: 20px; text-align: right;">
                <span style="font-size: 20px; font-weight: 900;">TOTAL: R$ ${totalCaixaGeral.toFixed(2)}</span>
            </div>
        </div>
    `;

    divRelatorio.innerHTML = htmlRelatorio;
    document.body.appendChild(divRelatorio);
    window.print();
    document.body.removeChild(divRelatorio);
}

function abrirRelatorioFaturamento() {
    const tRelatorio = document.getElementById("titulo-relatorio");
    const fRelatorio = document.getElementById("filtros-relatorio");

    if (tRelatorio) tRelatorio.innerText = "FATURAMENTO POR OPERADOR";
    if (fRelatorio) {
        fRelatorio.innerHTML = `
            <div class="container-filtros-relatorio">
                <input type="date" id="data-inicio">
                <span>até</span>
                <input type="date" id="data-fim">
                <select id="filtro-op">
                    <option value="todos">Todos Operadores</option>
                    ${[...new Set(historicoVendas.map(v => v.operador))].map(op => `<option value="${op}">${op}</option>`).join('')}
                </select>
                <button onclick="gerarTabelaFaturamento()">FILTRAR</button>
            </div>
        `;
    }
    gerarTabelaFaturamento();
}

function gerarTabelaFaturamento() {
    const dInicio = document.getElementById("data-inicio")?.value;
    const dFim = document.getElementById("data-fim")?.value;
    const opSelecionado = document.getElementById("filtro-op")?.value;

    const faturamentoPorOperador = historicoVendas.reduce((acc, venda) => {
        const dataVenda = venda.data.split(',')[0].split('/').reverse().join('-'); 
        if (dInicio && dataVenda < dInicio) return acc;
        if (dFim && dataVenda > dFim) return acc;
        if (opSelecionado !== "todos" && venda.operador !== opSelecionado) return acc;
        
        acc[venda.operador] = (acc[venda.operador] || 0) + (parseFloat(venda.total) || 0);
        return acc;
    }, {});

    let html = `<table class='tabela-relatorio'><thead><tr><th>Operador</th><th>Total Acumulado</th></tr></thead><tbody>`;
    for (let op in faturamentoPorOperador) {
        html += `<tr><td><strong>${op}</strong></td><td>R$ ${faturamentoPorOperador[op].toFixed(2).replace(".", ",")}</td></tr>`;
    }
    html += "</tbody></table>";
    mostrarModalRelatorio(html);
}

function abrirRelatorioItensVendidos() {
    const tRelatorio = document.getElementById("titulo-relatorio");
    const fRelatorio = document.getElementById("filtros-relatorio");

    if (tRelatorio) tRelatorio.innerText = "DIAGNÓSTICO DE REPOSIÇÃO";
    if (fRelatorio) fRelatorio.innerHTML = ""; 

    const contagemItens = {};
    historicoVendas.forEach(venda => {
        venda.itens.forEach(item => {
            contagemItens[item.nome] = (contagemItens[item.nome] || 0) + (parseFloat(item.quantidade) || 0);
        });
    });

    let html = `<table class='tabela-relatorio'><thead><tr><th>Produto</th><th>Vendidos</th><th>Estoque Atual</th><th>Status</th></tr></thead><tbody>`;
    for (let produto in contagemItens) {
        const prodNoEstoque = produtos.find(p => p.nome === produto);
        const estoqueAtual = prodNoEstoque ? prodNoEstoque.estoque : 0;
        const vendidos = contagemItens[produto];

        let status = "<span style='color: green; font-weight: bold;'>✅ OK</span>";
        if (estoqueAtual <= 0) {
            status = "<span style='color: red; font-weight: bold;'>🚨 CRÍTICO (ZERADO)</span>";
        } else if (estoqueAtual < vendidos) {
            status = "<span style='color: orange; font-weight: bold;'>⚠️ REPOR EM BREVE</span>";
        }

        html += `<tr><td>${produto}</td><td>${vendidos} un</td><td>${estoqueAtual} un</td><td>${status}</td></tr>`;
    }
    html += "</tbody></table>";
    mostrarModalRelatorio(html);
}

function abrirRelatorioVendasDetalhado() {
    const tRelatorio = document.getElementById("titulo-relatorio");
    const fRelatorio = document.getElementById("filtros-relatorio");

    if (tRelatorio) tRelatorio.innerText = "HISTÓRICO DETALHADO DE VENDAS";
    if (fRelatorio) fRelatorio.innerHTML = ""; 

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
    const modal = document.getElementById("modal-relatorios-dash");
    const container = document.getElementById("conteudo-relatorio");
    if (modal && container) {
        container.innerHTML = conteudo;
        modal.style.display = "flex";
    }
}

function fecharModalRelatorios() {
    const modal = document.getElementById("modal-relatorios-dash");
    if (modal) modal.style.display = "none";
}

/* --- Gerenciamento de Estoque --- */
function abrirEstoque() {
    const modal = document.getElementById("modal-estoque");
    const lista = document.getElementById("lista-estoque");
    if (!modal || !lista) return;

    modal.style.display = "flex";
    lista.innerHTML = ""; 

    const isAdmin = operadorLogado && (operadorLogado.role === "admin" || operadorLogado.role === "ADMIN");
    const rodapeAdmin = document.getElementById("rodape-estoque-admin");
    if (rodapeAdmin) rodapeAdmin.style.display = isAdmin ? "flex" : "none";

    produtos.forEach((prod) => {
        const tr = document.createElement("tr");
        let statusClass = prod.estoque <= 0 ? "status-vazio" : (prod.estoque <= 5 ? "status-baixo" : "status-bom");
        let statusTexto = prod.estoque <= 0 ? "Esgotado" : (prod.estoque <= 5 ? "Baixo" : "Ok");

        tr.innerHTML = `
            <td>#${prod.id}</td>
            <td style="font-weight: bold;">${prod.nome}</td>
            <td>R$ ${prod.preco.toFixed(2)}</td>
            <td>${prod.estoque} un</td>
            <td><span class="status-estoque ${statusClass}">${statusTexto}</span></td>
            ${isAdmin ? `<td>
                <button style="padding: 5px 10px; background: #f1c40f;" onclick="editarProduto('${prod.id}')">✏️</button>
                <button style="padding: 5px 10px; background: #e63946;" onclick="removerProduto('${prod.id}')">🗑️</button>
            </td>` : ''}
        `;
        lista.appendChild(tr);
    });
}

function fecharModalEstoque() { 
    const modal = document.getElementById("modal-estoque");
    if (modal) modal.style.display = "none"; 
}

function filtrarEstoque() {
    const busca = document.getElementById("busca-estoque").value.toLowerCase();
    // ✅ BUG 2 CORRIGIDO: era "linea", agora é "linha"
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
    document.getElementById("titulo-form-produto").innerText = "Editar Produto";
    document.getElementById("edit-index").value = id;
    document.getElementById("prod-id-form").value = produto.id;
    document.getElementById("prod-nome-form").value = produto.nome;
    document.getElementById("prod-preco-form").value = produto.preco;
    document.getElementById("prod-estoque-form").value = produto.estoque;
    document.getElementById("modal-form-produto").style.display = "flex";
}

function salvarProdutoNexus() {
    const idOriginal = document.getElementById("edit-index").value;
    const novoDados = {
        id: document.getElementById("prod-id-form").value,
        nome: document.getElementById("prod-nome-form").value,
        preco: parseFloat(document.getElementById("prod-preco-form").value),
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
    alert("Produto salvo!");
}

function fecharFormProduto() { 
    const modal = document.getElementById("modal-form-produto");
    if (modal) modal.style.display = "none"; 
}

function limparFormProduto() { 
    document.querySelectorAll(".form-produto-content input").forEach(i => i.value = ""); 
}

function removerProduto(id) {
    if (confirm("Deseja excluir este produto?")) {
        produtos = produtos.filter(p => p.id !== id);
        localStorage.setItem("produtos_pdv", JSON.stringify(produtos));
        abrirEstoque();
    }
}

/* --- Fornecedores --- */
function abrirModalFornecedores() {
    const modal = document.getElementById("modal-fornecedores");
    if (modal) {
        modal.style.display = "flex";
        renderizarFornecedores();
    }
}

function fecharModalFornecedores() { 
    const modal = document.getElementById("modal-fornecedores");
    if (modal) modal.style.display = "none"; 
}

function cadastrarFornecedor() {
    const nome = document.getElementById("forn-nome").value;
    const zap = document.getElementById("forn-zap").value;
    const categoria = document.getElementById("forn-categoria").value;

    if (!nome || !zap) {
        alert("Nome e WhatsApp são obrigatórios!");
        return;
    }

    const novoFornecedor = {
        id: Date.now(),
        nome: nome,
        zap: zap.replace(/\D/g, ""),
        categoria: categoria
    };

    fornecedores.push(novoFornecedor);
    salvarFornecedores();
    
    document.getElementById("forn-nome").value = "";
    document.getElementById("forn-zap").value = "";
    renderizarFornecedores();
}

function renderizarFornecedores() {
    const container = document.getElementById("container-lista-fornecedores");
    if (!container) return;
    container.innerHTML = ""; 

    if (fornecedores.length === 0) {
        container.innerHTML = "<p style='grid-column: 1/-1; text-align:center; color:#999;'>Nenhum fornecedor cadastrado.</p>";
        return;
    }

    fornecedores.forEach(f => {
        container.innerHTML += `
            <div class="card-fornecedor">
                <strong style="color:#1d3557; font-size: 1.1rem; text-transform: uppercase;">${f.nome}</strong>
                <p style="font-size:0.85rem; color:#555; margin:5px 0;">${f.categoria}</p>
                <a href="https://wa.me/55${f.zap}" target="_blank" class="btn-whatsapp-forn">
                   CHAMA NO ZAP
                </a>
            </div>
        `;
    });
}

/* --- Controle de Equipe --- */
function abrirModalCadastroUsuarios() { 
    const modal = document.getElementById('modal-cadastro-usuarios');
    if (modal) modal.style.display = 'flex'; 
}

function fecharModalCadastroUsuarios() { 
    const modal = document.getElementById('modal-cadastro-usuarios');
    if (modal) modal.style.display = 'none'; 
}

function salvarNovoOperador() {
    const nome = document.getElementById('cad-nome-completo').value.trim();
    const user = document.getElementById('cad-username').value.trim();
    const pass = document.getElementById('cad-password').value.trim();
    const cargo = document.getElementById('cad-cargo').value;

    if (!nome || !user || !pass) {
        alert("Por favor, preencha todos os campos!");
        return;
    }

    let usuariosSistema = JSON.parse(localStorage.getItem("usuarios_nexus")) || [];

    if (usuariosSistema.find(u => u.login === user || u.username === user)) {
        alert("Este nome de usuário já está em uso!");
        return;
    }

    let novoIdNum = usuariosSistema.length + 2; 
    const idGerado = novoIdNum.toString().padStart(3, '0');

    const novoUsuario = {
        id: idGerado,
        nome: nome,
        login: user,
        username: user,
        senha: pass,
        role: cargo
    };

    usuariosSistema.push(novoUsuario);
    localStorage.setItem("usuarios_nexus", JSON.stringify(usuariosSistema));

    alert(`Operador ${nome} cadastrado com sucesso! ID: ${idGerado}`);
    fecharModalCadastroUsuarios();
}

/* --- Listeners Globais --- */
document.addEventListener('keydown', function(event) {
    if (event.key === "F2") {
        event.preventDefault();
        finalizarVenda();
    }
});

function atualizarRelogio() {
    const pRelogio = document.getElementById("relogio-brasilia");
    if (pRelogio) pRelogio.innerText = new Date().toLocaleString('pt-BR');
}

function correcaoGeralAcesso() {
    // ✅ BUG 3 CORRIGIDO: senha removida do código-fonte
    // O usuário administrador master deve ser criado diretamente no banco de dados.
    // Execute este comando SQL uma vez no seu PostgreSQL para criar seu acesso:
    //
    // INSERT INTO usuarios (nome, login, senha, role)
    // VALUES ('Yran Sousa Paixão', 'yran_nexus', 'SUA_SENHA_AQUI', 'admin')
    // ON CONFLICT (login) DO NOTHING;
    //
    console.log("NEXUS PDV iniciado. Autenticação via banco de dados PostgreSQL.");
}

/* --- Inicialização Segura Baseada no Ciclo de Vida --- */
window.addEventListener('DOMContentLoaded', () => {
    atualizarRelogio();
    correcaoGeralAcesso();
    verificarLoginSalvo();
    
    setInterval(atualizarRelogio, 1000);
});

/* --- Módulo de Controle de Frota (Integração PostgreSQL) --- */
function abrirModalFrota() {
    document.getElementById("modal-frota").style.display = "flex";
    buscarVeiculos();
}

function fecharModalFrota() {
    document.getElementById("modal-frota").style.display = "none";
    document.getElementById("frota-modelo").value = "";
    document.getElementById("frota-placa").value = "";
    document.getElementById("frota-motorista").value = "";
    document.getElementById("frota-gasolina").value = "";
}

async function buscarVeiculos() {
    try {
        const resposta = await fetch('http://localhost:3000/api/veiculos');
        const veiculos = await resposta.json();
        
        const container = document.getElementById("container-lista-frota");
        container.innerHTML = "";

        if (veiculos.length === 0) {
            container.innerHTML = `<p style="color: #888; grid-column: 1/-1;">Nenhum veículo cadastrado na frota.</p>`;
            return;
        }

        veiculos.forEach(v => {
            let corCombustivel = "#2ecc71";
            if (v.combustivel_atual <= 25) corCombustivel = "#e74c3c";
            else if (v.combustivel_atual <= 50) corCombustivel = "#f39c12";

            const card = document.createElement("div");
            card.style = "background: #fdfdfd; border: 1px solid #e1e8ed; border-left: 5px solid #1d3557; padding: 15px; border-radius: 6px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); position: relative;";
            card.innerHTML = `
                <strong style="font-size: 1.1rem; color: #1d3557; text-transform: uppercase;">${v.modelo}</strong>
                <span style="display: block; font-size: 0.8rem; color: #7f8c8d; font-weight: bold; margin-bottom: 8px;">Placa: ${v.placa}</span>
                <div style="margin-bottom: 6px; font-size: 0.9rem;">
                    <strong>👤 Condutor:</strong> <span style="color:#555;">${v.motorista_dia || 'Não designado'}</span>
                </div>
                <div style="font-size: 0.9rem; display: flex; align-items: center; gap: 8px;">
                    <strong>⛽ Combustível:</strong> 
                    <span style="color: ${corCombustivel}; font-weight: bold;">${parseFloat(v.combustivel_atual)}%</span>
                </div>
                <div style="margin-top: 10px; display: flex; gap: 5px;">
                    <button onclick="carregarDadosEdicao('${v.modelo}', '${v.placa}', '${v.motorista_dia}', ${v.combustivel_atual})" style="background: #34495e; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 0.75rem;">Editar</button>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (erro) {
        console.error("Erro ao processar frota:", erro);
    }
}

async function salvarVeiculo() {
    const modelo = document.getElementById("frota-modelo").value.trim();
    const placa = document.getElementById("frota-placa").value.trim().toUpperCase();
    const motorista = document.getElementById("frota-motorista").value.trim() || "Não designado";
    const gasolina = document.getElementById("frota-gasolina").value.trim() || "100";

    if (!modelo || !placa) {
        alert("Por favor, preencha pelo menos o Modelo e a Placa do veículo!");
        return;
    }

    try {
        const resposta = await fetch('http://localhost:3000/api/veiculos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                modelo: modelo,
                placa: placa,
                motorista_dia: motorista,
                combustivel_atual: parseFloat(gasolina)
            })
        });

        const dados = await resposta.json();
        if (dados.sucesso) {
            buscarVeiculos();
            document.getElementById("frota-modelo").value = "";
            document.getElementById("frota-placa").value = "";
            document.getElementById("frota-motorista").value = "";
            document.getElementById("frota-gasolina").value = "";
        }
    } catch (erro) {
        console.error("Erro ao salvar dados da frota:", erro);
        alert("Erro ao conectar com o servidor.");
    }
}

function carregarDadosEdicao(modelo, placa, motorista, gasolina) {
    document.getElementById("frota-modelo").value = modelo;
    document.getElementById("frota-placa").value = placa;
    document.getElementById("frota-motorista").value = motorista === "Não designado" ? "" : motorista;
    document.getElementById("frota-gasolina").value = gasolina;
}

/* --- Formulário de Cadastro na Tela de Login --- */
function alternarFormularios(tipo) {
    const formLogin = document.getElementById("form-login");
    const formCadastro = document.getElementById("form-cadastro");
    if (tipo === 'cadastro') {
        if (formLogin) formLogin.style.display = "none";
        if (formCadastro) formCadastro.style.display = "block";
    } else {
        if (formLogin) formLogin.style.display = "block";
        if (formCadastro) formCadastro.style.display = "none";
    }
}

function cadastrarNovoUsuario() {
    const nome = document.getElementById("novo-nome-usuario").value.trim();
    const user = document.getElementById("novo-usuario").value.trim();
    const pass = document.getElementById("nova-senha").value.trim();
    const cargo = document.getElementById("novo-cargo-usuario").value;

    if (!nome || !user || !pass) {
        alert("Por favor, preencha todos os campos!");
        return;
    }

    let usuariosSistema = JSON.parse(localStorage.getItem("usuarios_nexus")) || [];

    if (usuariosSistema.find(u => u.login === user)) {
        alert("Este nome de usuário já está em uso!");
        return;
    }

    const idGerado = (usuariosSistema.length + 2).toString().padStart(3, '0');

    usuariosSistema.push({
        id: idGerado,
        nome: nome,
        login: user,
        username: user,
        senha: pass,
        role: cargo
    });

    localStorage.setItem("usuarios_nexus", JSON.stringify(usuariosSistema));
    alert(`Usuário ${nome} cadastrado! ID: ${idGerado}`);
    alternarFormularios('login');
}