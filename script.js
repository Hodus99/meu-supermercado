/* --- Variáveis de Estado Global --- */
let usuariosCadastrados = JSON.parse(localStorage.getItem("usuarios")) || [];
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

// Inicializa o array de fornecedores buscando do localStorage ou vazio
let fornecedores = JSON.parse(localStorage.getItem("fornecedores_nexus")) || [];

// Função para salvar sempre que houver alteração
function salvarFornecedores() {
    localStorage.setItem("fornecedores_nexus", JSON.stringify(fornecedores));
}

/* --- Funções de Busca e Cadastro de Produtos --- */
function buscarProduto() {
    const termo = document.getElementById("codigoBusca").value;
    const divResultado = document.getElementById("resultado");
    const divCadastro = document.getElementById("areaCadastro");

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
            estoque: 10 // Valor padrão inicial
        });
        
        localStorage.setItem("produtos_pdv", JSON.stringify(produtos)); // Corrigido para produtos_pdv
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

        // Verifica se o item já existe no carrinho para somar a quantidade em vez de duplicar
        const itemExistente = carrinho.find(item => item.id === id);
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

        atualizarCarrinhoVisual(); // Chama a nova função de desenho
    }
}

// NOVA FUNÇÃO: Desenha o carrinho e calcula o total
function atualizarCarrinhoVisual() {
    const listaCarrinho = document.getElementById("itens-carrinho");
    listaCarrinho.innerHTML = "";
    
    // IMPORTANTE: Sem o "let" para usar a variável global
    totalVenda = 0; 

    carrinho.forEach((item, index) => {
        totalVenda += item.subtotal;
        
        // Aqui adicionamos os botões de EDITAR e EXCLUIR
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

    document.getElementById("valor-total").innerText = totalVenda.toFixed(2);
    
    if (carrinho.length === 0) {
        listaCarrinho.innerHTML = "<p style='color: #888;'>O carrinho está vazio.</p>";
        totalVenda = 0;
        document.getElementById("valor-total").innerText = "0.00";
    }
}

// LOGICA DE SEGURANÇA PARA ALTERAR ITENS
function solicitarAlteracao(index, tipo) {
    const operador = JSON.parse(localStorage.getItem("operador_atual"));
    
    // Se o próprio Yran (Admin) estiver logado, libera sem pedir senha
    if (operador && operador.role === "admin") {
        executarAcao(index, tipo);
    } else {
        // Se for operador (teste), abre o modal de autorização
        acaoPendente = { index, tipo };
        document.getElementById("modal-autorizacao").style.display = "flex";
        document.getElementById("auth-id-admin").focus();
    }
}

// BOTÃO DE CONFIRMAR DO MODAL DE SENHA
// BOTÃO CONFIRMAR DO MODAL DE SENHA
// BOTÃO CONFIRMAR DO MODAL DE AUTORIZAÇÃO
document.getElementById("confirmar-auth").onclick = function() {
    const idDigitada = document.getElementById("auth-id-admin").value;
    const senhaDigitada = document.getElementById("auth-senha-admin").value;
    
    // Tenta buscar em qualquer uma das chaves possíveis
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
    document.getElementById("modal-autorizacao").style.display = "none";
    document.getElementById("auth-id-admin").value = "";
    document.getElementById("auth-senha-admin").value = "";
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

    // USA DIRETAMENTE A VARIÁVEL GLOBAL CORRETA
    document.getElementById("modal-total-venda").innerText = totalVenda.toFixed(2);
    document.getElementById("valor-pago-cliente").value = totalVenda.toFixed(2);

    document.getElementById("modal-pagamento").style.display = "flex";

    calcularTroco();
}

function finalizarVendaComBaixa() {
    const valorDigitado = parseFloat(document.getElementById("valor-pago-cliente").value) || 0;

    // 🔒 Validação de pagamento
    if (valorDigitado < totalVenda) {
        alert("O valor pago não pode ser menor que o total da venda!");
        return;
    }

    // 🧾 MONTA OBJETO DA VENDA
    const venda = {
        id: Date.now(),
        data: new Date().toLocaleString(),
        operador: typeof operadorLogado !== 'undefined' && operadorLogado ? operadorLogado.nome : "Sistema",
        itens: JSON.parse(JSON.stringify(carrinho)),
        total: totalVenda,
        valorPago: valorDigitado,
        troco: valorDigitado - totalVenda,
        formaPagto: document.querySelector('input[name="forma-pagto"]:checked')?.value || "Não informado"
    };

    // 📦 ATUALIZA ESTOQUE
    carrinho.forEach(item => {
        const produto = produtos.find(p => p.id === item.id);
        if (produto) {
            produto.estoque -= item.quantidade;
            if (produto.estoque < 0) produto.estoque = 0;
        }
    });

    localStorage.setItem("produtos_pdv", JSON.stringify(produtos));

    // 💾 SALVA HISTÓRICO
    historicoVendas.push(venda);
    localStorage.setItem("vendas", JSON.stringify(historicoVendas));

    // ✅ MENSAGEM DE SUCESSO E PERGUNTA DE IMPRESSÃO
    alert("Venda finalizada com sucesso!");

    // 🖨️ O CÓDIGO QUE VOCÊ PEDIU:
    const desejaImprimir = confirm("Deseja imprimir o cupom desta venda?");
    if (desejaImprimir) {
        gerarNotaParaImpressao(venda); // Preenche a área de impressão
        window.print();               // Dispara o comando de impressão do navegador
    }

    // 🧹 LIMPA CARRINHO E FECHA MODAL
    carrinho = [];
    totalVenda = 0;
    if (typeof atualizarCarrinhoVisual === "function") {
        atualizarCarrinhoVisual();
    }
    
    document.getElementById("modal-pagamento").style.display = "none";
}

// Gerencia o que acontece quando o usuário escolhe a forma de pagamento
function selecionarFormaPagamento(tipo) {
    const secaoTroco = document.getElementById("secao-troco");
    
    // 1. Controle de Visibilidade do Troco
    if (tipo === 'Dinheiro') {
        secaoTroco.style.display = "block"; // Mostra campo de valor pago
    } else {
        secaoTroco.style.display = "none";  // Esconde em Cartão/Pix
    }

    // 2. Lógica de PIX
    if (tipo === 'Pix') {
        gerarQRCodePix();
    }
}

// Função para simular o QR Code (Pode ser um alerta ou abrir uma imagem)
function gerarQRCodePix() {
    const valorParaPix = totalVenda.toFixed(2).replace(".", ",");
    alert(`💠 SISTEMA PIX\nValor: R$ ${valorParaPix}\n\nEscaneie o QR Code no monitor do cliente.`);
    // Aqui no futuro você pode dar um .style.display = "block" em uma <img> de QR Code
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

// Fecha o modal quando clica em "Voltar"
function fecharModalPagamento() {
    document.getElementById("modal-pagamento").style.display = "none";
}

// Calcula o troco em tempo real enquanto o operador digita
function calcularTroco() {
    const valorPago = parseFloat(document.getElementById("valor-pago-cliente").value) || 0;
    const troco = valorPago - totalVenda;

    const campoTroco = document.getElementById("valor-troco");

    if (campoTroco) {
        campoTroco.innerText = troco > 0 
            ? troco.toFixed(2).replace(".", ",") 
            : "0,00";
    }
}

// Esconde ou mostra o campo de troco (ex: se for Cartão, não precisa de troco)
function toggleCampoTroco(mostrar) {
    const secaoTroco = document.getElementById("secao-troco");
    if (secaoTroco) {
        secaoTroco.style.display = mostrar ? "block" : "none";
    }
}

/* --- Sistema de Login e Usuários --- */
function alternarFormularios(tipo) {
    const formLogin = document.getElementById("form-login");
    const formCadastro = document.getElementById("form-cadastro");

    if (tipo === "cadastro") {
        // Esconde o login e mostra o cadastro
        formLogin.style.display = "none";
        formCadastro.style.display = "block";
        
        // Limpa os campos de cadastro para não vir com dados antigos
        document.getElementById("novo-nome-usuario").value = "";
        document.getElementById("novo-usuario").value = "";
        document.getElementById("nova-senha").value = "";
    } else {
        // Volta para o login
        formLogin.style.display = "block";
        formCadastro.style.display = "none";
    }
}

function cadastrarNovoUsuario() {
    const nomeCompleto = document.getElementById("novo-nome-usuario").value;
    const usuarioLogin = document.getElementById("novo-usuario").value;
    const senhaAcesso = document.getElementById("nova-senha").value;

    if (nomeCompleto && usuarioLogin && senhaAcesso) {
        // 1. Verifica se o login já existe para não duplicar
        const existe = usuariosCadastrados.find(u => u.username === usuarioLogin);
        if (existe) {
            alert("Este nome de usuário já está em uso!");
            return;
        }

        // 2. LÓGICA DE ID AUTOMÁTICO (001, 002, 003...)
        // Pegamos o maior ID atual, transformamos em número e somamos +1
        let novoIdNum = 1;
        if (usuariosCadastrados.length > 0) {
            const ids = usuariosCadastrados.map(u => parseInt(u.id) || 0);
            novoIdNum = Math.max(...ids) + 1;
        }
        // O padStart(3, '0') garante que o número 1 vire "001"
        const idGerado = novoIdNum.toString().padStart(3, '0');

        // 3. Define o cargo (Primeiro a cadastrar é sempre ADMIN)
        const cargo = usuariosCadastrados.length === 0 ? "admin" : "operador";

        // 4. Salva o novo objeto com o campo ID incluso
        usuariosCadastrados.push({ 
            id: idGerado, // Novo campo adicionado aqui!
            nome: nomeCompleto, 
            username: usuarioLogin, 
            senha: senhaAcesso,
            role: cargo
        });
        
        // 5. Atualiza o banco local
        localStorage.setItem('usuarios', JSON.stringify(usuariosCadastrados));
        
        alert(`Sucesso! ${nomeCompleto} cadastrado como ${cargo.toUpperCase()}.\nSeu ID de acesso é: ${idGerado}`);
        
        alternarFormularios('login');
    } else {
        alert("Por favor, preencha todos os campos!");
    }
}

function fazerLogin() {
    const userDigitado = document.getElementById('user-login').value;
    const senhaDigitada = document.getElementById('pass-login').value;

    let usuarios = JSON.parse(localStorage.getItem("usuarios_nexus")) || [];

    // Busca o usuário na lista
    const usuarioEncontrado = usuarios.find(u => u.login === userDigitado && u.senha === senhaDigitada);

    if (usuarioEncontrado) {
        // Lógica para abrir o sistema...
        alert("Bem-vindo, " + usuarioEncontrado.nome);
    } else {
        alert("Usuário ou senha incorretos!");
    }
}

function irParaVendas() {
    const dash = document.getElementById("dashboard-admin");
    const pdv = document.getElementById("container-principal");
    dash.classList.add("escondido");
    pdv.classList.remove("escondido");
    document.getElementById("codigoBusca").focus();
}

function atualizarDadosDashboard() {
    const totalFaturamento = historicoVendas.reduce((acc, v) => acc + v.total, 0);
    const totalPedidos = historicoVendas.length;
    const itensCriticos = produtos.filter(p => p.estoque <= 5).length;

    document.getElementById("dash-faturamento").innerText = totalFaturamento.toFixed(2);
    document.getElementById("dash-qtd-vendas").innerText = totalPedidos;
    document.getElementById("dash-estoque-critico").innerText = itensCriticos;
}

function fazerLoginAutomatico(usuario) {
    const backdrop = document.getElementById('login-backdrop');
    const dash = document.getElementById("dashboard-admin");
    const pdv = document.getElementById("container-principal");
    const infoOp = document.getElementById("info-operador");

    // Correção: Exibir nome do operador logado
    if (document.getElementById("nome-operador-final")) {
        document.getElementById("nome-operador-final").innerText = usuario.nome;
        infoOp.classList.remove("escondido");
    }

    if (usuario.role === "admin") {
        dash.classList.remove("escondido");
        pdv.classList.add("escondido");
        atualizarDadosDashboard();
    } else {
        dash.classList.add("escondido");
        pdv.classList.remove("escondido");
    }

    backdrop.style.display = 'none';
}

function verificarLoginSalvo() {
    const salvo = localStorage.getItem("operador_atual");
    if (salvo) {
        fazerLoginAutomatico(JSON.parse(salvo));
    }
}

function fazerLogout() {
    localStorage.removeItem("operador_atual");
    location.reload();
}
function toggleMenu() {
    const painel = document.getElementById("painel-lateral");
    const spans = document.querySelectorAll("#btn-menu-sanduiche span");
    
    // Abre o menu deslizando
    painel.classList.add("menu-aberto");
    
    // Força o botão a ficar BRANCO (efeito negativo)
    spans.forEach(s => s.style.background = "#ffffff");

    // Atualiza dados do operador no menu
    const operador = JSON.parse(localStorage.getItem("operador_atual"));
    if (operador) {
        document.getElementById("nome-menu").innerText = operador.nome;
        document.getElementById("cargo-menu").innerText = operador.role.toUpperCase();
        
        const abaAdmin = document.getElementById("aba-admin");
        if (operador.role === "admin") {
            abaAdmin.classList.remove("escondido");
        }
    }
}

function fecharMenuLateral() {
    const painel = document.getElementById("painel-lateral");
    const spans = document.querySelectorAll("#btn-menu-sanduiche span");
    
    // Recolhe o menu
    painel.classList.remove("menu-aberto");
    
    // Volta o botão para a cor original (Azul Nexus)
    spans.forEach(s => s.style.background = "#1d3557");
}

function gerarRelatorioVendas() {
    const userLogado = JSON.parse(localStorage.getItem("operador_atual"));
    if (!userLogado || userLogado.role !== "admin") {
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

function abrirGerenciamentoUsuarios() {
    let listaHTML = "--- GESTÃO DE EQUIPE ---\n\n";
    usuariosCadastrados.forEach((u, index) => {
        listaHTML += `${index + 1}. ${u.nome} [${u.role.toUpperCase()}]\n`;
    });
    const acao = prompt(listaHTML + "\nDigite o NÚMERO do usuário para alterar o cargo:");
    if (acao) {
        const i = parseInt(acao) - 1;
        if (usuariosCadastrados[i]) {
            usuariosCadastrados[i].role = usuariosCadastrados[i].role === "admin" ? "operador" : "admin";
            localStorage.setItem("usuarios", JSON.stringify(usuariosCadastrados));
            alert("Cargo alterado!");
            location.reload();
        }
    }
}

function atualizarRelogio() {
    const agora = new Date();
    const dataHoraFormatada = agora.toLocaleString('pt-BR');
    const pRelogio = document.getElementById("relogio-brasilia");
    if (pRelogio) pRelogio.innerText = dataHoraFormatada;
}

setInterval(atualizarRelogio, 1000);
window.onload = () => {
    atualizarRelogio();
    verificarLoginSalvo();
};

/* --- Gerenciamento de Estoque --- */
function abrirEstoque() {
    const userLogado = JSON.parse(localStorage.getItem("operador_atual"));
    const modal = document.getElementById("modal-estoque");
    const lista = document.getElementById("lista-estoque");
    modal.style.display = "flex";
    lista.innerHTML = ""; 

    const isAdmin = userLogado && userLogado.role === "admin";
    const elementosAdmin = document.querySelectorAll(".coluna-admin");
    elementosAdmin.forEach(el => el.style.display = isAdmin ? "table-cell" : "none");
    document.getElementById("rodape-estoque-admin").style.display = isAdmin ? "flex" : "none";

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
            ${isAdmin ? `<td class="coluna-admin">
                <button class="btn-ajuste btn-add" onclick="editarProduto('${prod.id}')">✏️</button>
                <button class="btn-ajuste btn-remove" onclick="removerProduto('${prod.id}')">🗑️</button>
            </td>` : ''}
        `;
        lista.appendChild(tr);
    });
}

function fecharModalEstoque() {
    document.getElementById("modal-estoque").style.display = "none";
}

function filtrarEstoque() {
    const busca = document.getElementById("busca-estoque").value.toLowerCase();
    const linhas = document.querySelectorAll("#lista-estoque tr");
    linhas.forEach(linha => {
        const txt = linha.innerText.toLowerCase();
        linha.style.display = txt.includes(busca) ? "" : "none";
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

function fecharFormProduto() { document.getElementById("modal-form-produto").style.display = "none"; }
function limparFormProduto() {
    document.querySelectorAll(".form-produto-content input").forEach(i => i.value = "");
}

function removerProduto(id) {
    if (confirm("Deseja excluir?")) {
        produtos = produtos.filter(p => p.id !== id);
        localStorage.setItem("produtos_pdv", JSON.stringify(produtos));
        abrirEstoque();
    }
}

// ESCUTA GLOBAL DO TECLADO (F2 para Finalizar)
document.addEventListener('keydown', function(event) {
    if (event.key === "F2") {
        event.preventDefault(); // Impede que o navegador abra a ajuda do Windows
        finalizarVenda();
    }
});

// FORÇAR CRIAÇÃO DO ADMIN MASTER (Execute uma vez para destravar)
function correcaoGeralAcesso() {
    // 1. Definimos o seu perfil mestre atualizado
    const seuPerfilMaster = {
        id: "001",
        nome: "Yran Sousa Paixão",
        username: "yran_nexus", 
        senha: "95362748", // Sua senha nova
        role: "admin"
    };

    // 2. Atualizamos TODAS as chaves que o sistema pode estar usando
    const chavesParaLimpar = ['usuarios', 'usuarios_nexus', 'usuariosCadastrados'];
    
    chavesParaLimpar.forEach(chave => {
        let lista = JSON.parse(localStorage.getItem(chave)) || [];
        
        // Remove qualquer versão antiga sua pelo username ou ID
        lista = lista.filter(u => u.username !== "yran_nexus" && u.id !== "001");
        
        // Adiciona a versão com a senha nova
        lista.push(seuPerfilMaster);
        
        // Salva de volta na chave correspondente
        localStorage.setItem(chave, JSON.stringify(lista));
    });

    console.log("✅ Acesso do Yran (001) atualizado em todo o sistema!");
}

// Executa a limpeza
correcaoGeralAcesso();

// 1. Relatório de Faturamento por Operador (Com Filtros)
function abrirRelatorioFaturamento() {
    const titulo = document.getElementById("titulo-relatorio");
    const filtroArea = document.getElementById("filtros-relatorio");
    
    if (titulo) titulo.innerText = "FATURAMENTO POR OPERADOR";

    // Cria os inputs de filtro dinamicamente
    filtroArea.innerHTML = `
        <div class="container-filtros-relatorio" style="display: flex; gap: 10px; margin-bottom: 15px; align-items: center;">
            <input type="date" id="data-inicio" style="padding: 5px;">
            <span>até</span>
            <input type="date" id="data-fim" style="padding: 5px;">
            <select id="filtro-op" style="padding: 5px;">
                <option value="todos">Todos Operadores</option>
                ${[...new Set(historicoVendas.map(v => v.operador))].map(op => `<option value="${op}">${op}</option>`).join('')}
            </select>
            <button onclick="gerarTabelaFaturamento()" style="padding: 5px 15px; background: #1d3557; color: white; border: none; border-radius: 4px; cursor: pointer;">FILTRAR</button>
        </div>
    `;

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

    let html = `<table class='tabela-relatorio'>
                    <thead><tr><th>Operador</th><th>Total Acumulado</th></tr></thead><tbody>`;
    
    for (let op in faturamentoPorOperador) {
        html += `<tr><td><strong>${op}</strong></td><td>R$ ${faturamentoPorOperador[op].toFixed(2).replace(".", ",")}</td></tr>`;
    }
    html += "</tbody></table>";

    mostrarModalRelatorio(html);
}

// 2. Relatório de Movimentação com Diagnóstico (O que você pediu!)
function abrirRelatorioItensVendidos() {
    document.getElementById("titulo-relatorio").innerText = "DIAGNÓSTICO DE REPOSIÇÃO";
    document.getElementById("filtros-relatorio").innerHTML = ""; 

    const contagemItens = {};
    historicoVendas.forEach(venda => {
        venda.itens.forEach(item => {
            contagemItens[item.nome] = (contagemItens[item.nome] || 0) + (parseFloat(item.quantidade) || 0);
        });
    });

    let html = `<table class='tabela-relatorio'>
                    <thead><tr><th>Produto</th><th>Vendidos</th><th>Estoque Atual</th><th>Status</th></tr></thead><tbody>`;
    
    for (let produto in contagemItens) {
        // Busca o produto no seu array principal de 'produtos' para ver o estoque atual
        const prodNoEstoque = produtos.find(p => p.nome === produto);
        const estoqueAtual = prodNoEstoque ? prodNoEstoque.estoque : 0;
        const vendidos = contagemItens[produto];

        // Lógica de diagnóstico
        let status = "<span style='color: green; font-weight: bold;'>✅ OK</span>";
        if (estoqueAtual <= 0) {
            status = "<span style='color: red; font-weight: bold;'>🚨 CRÍTICO (ZERADO)</span>";
        } else if (estoqueAtual < vendidos) {
            status = "<span style='color: orange; font-weight: bold;'>⚠️ REPOR EM BREVE</span>";
        }

        html += `<tr>
                    <td>${produto}</td>
                    <td>${vendidos} un</td>
                    <td>${estoqueAtual} un</td>
                    <td>${status}</td>
                </tr>`;
    }
    html += "</tbody></table>";

    mostrarModalRelatorio(html);
}

// 3. Relatório Detalhado de Vendas
function abrirRelatorioVendasDetalhado() {
    document.getElementById("titulo-relatorio").innerText = "HISTÓRICO DETALHADO DE VENDAS";
    document.getElementById("filtros-relatorio").innerHTML = ""; 

    let html = `<table class='tabela-relatorio'>
                    <thead><tr><th>Data/Hora</th><th>Total</th><th>Forma Pgto</th><th>Troco</th></tr></thead><tbody>`;
    
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

// Função auxiliar (Garante que o modal abra)
function mostrarModalRelatorio(conteudo) {
    const modal = document.getElementById("modal-relatorios-dash");
    const container = document.getElementById("conteudo-relatorio");
    
    if (modal && container) {
        container.innerHTML = conteudo;
        modal.style.display = "flex";
    }
}

// Funções de Interface
function abrirModalFornecedores() {
    console.log("Tentando abrir o modal..."); 
    const modal = document.getElementById("modal-fornecedores");
    if (modal) {
        modal.style.display = "flex"; // Força o display flex para centralizar
        renderizarFornecedores();
    }
}

function fecharModalFornecedores() {
    const modal = document.getElementById("modal-fornecedores");
    if (modal) {
        modal.style.display = "none";
    }
}

// --- 3. AÇÕES ---
function cadastrarFornecedor() {
    const nome = document.getElementById("forn-nome").value;
    const zap = document.getElementById("forn-zap").value;
    const categoria = document.getElementById("forn-categoria").value;

    if (!nome || !zap) {
        alert("Nome e WhatsApp são obrigatórios!");
        return;
    }

    const zapLimpo = zap.replace(/\D/g, "");

    const novoFornecedor = {
        id: Date.now(),
        nome: nome,
        zap: zapLimpo,
        categoria: categoria
    };

    fornecedores.push(novoFornecedor);
    localStorage.setItem("fornecedores_nexus", JSON.stringify(fornecedores));
    
    // Limpeza e Atualização
    document.getElementById("forn-nome").value = "";
    document.getElementById("forn-zap").value = "";
    document.getElementById("form-cadastro-forn").style.display = "none";
    
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
            <div class="card-fornecedor-item">
                <strong style="color:#1d3557;">${f.nome}</strong>
                <p style="font-size:0.8rem; color:#666; margin:5px 0;">${f.categoria}</p>
                <a href="https://wa.me/55${f.zap}" target="_blank" class="btn-zap-link">
                   CHAMA NO ZAP
                </a>
            </div>
        `;
    });
}

function abrirModalCadastroUsuarios() {
    document.getElementById('modal-cadastro-usuarios').style.display = 'flex';
}

function fecharModalCadastroUsuarios() {
    document.getElementById('modal-cadastro-usuarios').style.display = 'none';
    // Limpa os campos ao fechar
    document.getElementById('cad-nome-completo').value = "";
    document.getElementById('cad-username').value = "";
    document.getElementById('cad-password').value = "";
}

function salvarNovoOperador() {
    const nome = document.getElementById('cad-nome-completo').value.trim();
    const user = document.getElementById('cad-username').value.trim();
    const pass = document.getElementById('cad-password').value.trim();
    const cargo = document.getElementById('cad-cargo').value;

    // Validação simples
    if (!nome || !user || !pass) {
        alert("Por favor, preencha todos os campos!");
        return;
    }

    // Puxa a lista de usuários já cadastrados ou cria uma nova
    let usuariosSistema = JSON.parse(localStorage.getItem("usuarios_nexus")) || [];

    // Verifica se o login já existe para não duplicar
    const usuarioExiste = usuariosSistema.find(u => u.login === user);
    if (usuarioExiste) {
        alert("Este nome de usuário já está em uso!");
        return;
    }

    // Cria o novo objeto de usuário
    const novoUsuario = {
        nome: nome,
        login: user,
        senha: pass,
        cargo: cargo
    };

    // Adiciona ao array e salva no localStorage
    usuariosSistema.push(novoUsuario);
    localStorage.setItem("usuarios_nexus", JSON.stringify(usuariosSistema));

    alert(`Operador ${nome} cadastrado com sucesso!`);
    fecharModalCadastroUsuarios();
}

