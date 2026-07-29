# ============================================================
#  NEXUS PDV — main.py
#  Backend Python (FastAPI) — Motor de IA
#  Rotas: Previsão de Estoque, Relatório Inteligente,
#         Relatório Financeiro, Desempenho de Vendedores
# ============================================================

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
from anthropic import Anthropic
from pydantic import BaseModel
from typing import Any, Optional
import os
import json
from dotenv import load_dotenv

# --- Carrega variáveis de ambiente ---
load_dotenv()

# --- Conexão com o Supabase ---
supabase_url = os.environ.get("SUPABASE_URL") or ""
supabase_key = os.environ.get("SUPABASE_KEY") or ""
supabase: Client = create_client(supabase_url, supabase_key)

# --- Conexão com a API da Anthropic (Claude) ---
anthropic = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY") or "")

# --- Instância do FastAPI ---
app = FastAPI(title="NEXUS PDV — Motor de IA", version="2.0")

# --- CORS: permite que o frontend acesse este backend ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
#  MODELOS DE DADOS (estrutura dos JSONs recebidos)
# ============================================================

class ItemEstoque(BaseModel):
    id: str
    nome: str
    estoque: int
    preco: float

class ItemVenda(BaseModel):
    nome: str
    quantidade: float
    subtotal: float

class Venda(BaseModel):
    id: Any
    data: str
    operador: str
    total: float
    formaPagto: Optional[str] = "Não informado"
    troco: Optional[float] = 0.0
    itens: list[ItemVenda]

class PayloadEstoque(BaseModel):
    produtos: list[ItemEstoque]
    historico_vendas: list[Venda]
    filial: Optional[str] = "Geral"

class PayloadRelatorioInteligente(BaseModel):
    historico_vendas: list[Venda]
    periodo: Optional[str] = "Geral"
    filial: Optional[str] = "Geral"

class PayloadFinanceiro(BaseModel):
    historico_vendas: list[Venda]
    periodo: Optional[str] = "Geral"
    filial: Optional[str] = "Geral"

class PayloadVendedores(BaseModel):
    historico_vendas: list[Venda]
    periodo: Optional[str] = "Geral"
    filial: Optional[str] = "Geral"


# ============================================================
#  FUNÇÃO AUXILIAR — Chama o Claude e retorna JSON
# ============================================================

def chamar_claude(system_prompt: str, user_prompt: str) -> dict:
    """
    Envia uma mensagem ao Claude e retorna a resposta como dicionário.
    O sistema é instruído a sempre responder em JSON puro.
    """
    try:
        resposta = anthropic.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=4096,
            system=system_prompt,
            messages=[
                {"role": "user", "content": user_prompt}
            ]
        )
        texto = resposta.content[0].text.strip()

        # Remove blocos de markdown se o modelo os incluir
        if texto.startswith("```"):
            texto = texto.split("```")[1]
            if texto.startswith("json"):
                texto = texto[4:]
        texto = texto.strip()

        return json.loads(texto)

    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=500,
            detail=f"A IA retornou uma resposta em formato inválido: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao comunicar com a IA: {str(e)}"
        )


# ============================================================
#  ROTA PADRÃO
# ============================================================

@app.get("/")
def home():
    return {
        "status": "NEXUS PDV Motor de IA — Online",
        "rotas_disponiveis": [
            "/produtos",
            "/ia/previsao-estoque",
            "/ia/relatorio-inteligente",
            "/ia/relatorio-financeiro",
            "/ia/desempenho-vendedores"
        ]
    }


# ============================================================
#  ROTA: Listar Produtos (Supabase)
# ============================================================

@app.get("/produtos")
def listar_produtos() -> list[Any]:
    resposta = supabase.table("produtos").select("*").execute()
    return resposta.data if resposta.data else []


# ============================================================
#  ROTA 1: PREVISÃO DE ESTOQUE
# ============================================================

@app.post("/ia/previsao-estoque")
def previsao_estoque(payload: PayloadEstoque):
    """
    Analisa o histórico de vendas e o estoque atual,
    e prevê quando cada produto vai acabar e quando repor.
    """

    # Calcula a velocidade de saída de cada produto
    contagem_saidas: dict[str, float] = {}
    for venda in payload.historico_vendas:
        for item in venda.itens:
            contagem_saidas[item.nome] = contagem_saidas.get(item.nome, 0) + item.quantidade

    total_vendas = len(payload.historico_vendas)

    system_prompt = """
Você é um especialista em gestão de estoque e supply chain de um sistema PDV chamado NEXUS PDV.
Sua função é analisar dados de vendas e estoque e retornar previsões precisas e acionáveis.

REGRAS OBRIGATÓRIAS:
1. Responda APENAS com JSON puro, sem markdown, sem texto adicional, sem blocos de código.
2. O JSON deve seguir EXATAMENTE esta estrutura:
{
  "resumo_executivo": "string com 2-3 frases resumindo a situação geral do estoque",
  "alertas_criticos": ["lista de produtos em estado crítico como strings"],
  "produtos": [
    {
      "nome": "string",
      "estoque_atual": number,
      "vendas_totais": number,
      "media_por_venda": number,
      "dias_ate_acabar": number,
      "status": "critico|atencao|ok",
      "recomendacao": "string com ação recomendada"
    }
  ],
  "grafico_dados": {
    "labels": ["nomes dos produtos"],
    "estoque_atual": [valores numéricos],
    "previsao_consumo": [valores numéricos para próximos 30 dias]
  },
  "relatorio_escrito": "string com análise completa em português, mínimo 3 parágrafos"
}
"""

    user_prompt = f"""
Analise os dados abaixo e gere a previsão de estoque para a filial: {payload.filial}

ESTOQUE ATUAL:
{json.dumps([p.dict() for p in payload.produtos], ensure_ascii=False, indent=2)}

HISTÓRICO DE VENDAS (total de {total_vendas} vendas):
Contagem de saídas por produto: {json.dumps(contagem_saidas, ensure_ascii=False, indent=2)}

Calcule:
- Média de saída por venda para cada produto
- Estimativa de dias até o estoque acabar (estoque_atual / media_diaria)
- Status: "critico" se acabar em menos de 7 dias, "atencao" se menos de 15 dias, "ok" se acima de 15
- Recomendações específicas de reposição
"""

    resultado = chamar_claude(system_prompt, user_prompt)
    return resultado


# ============================================================
#  ROTA 2: RELATÓRIO INTELIGENTE DE VENDAS
# ============================================================

@app.post("/ia/relatorio-inteligente")
def relatorio_inteligente(payload: PayloadRelatorioInteligente):
    """
    Gera um relatório inteligente de vendas com insights,
    tendências e alertas automáticos baseado no histórico.
    """

    total_faturado = sum(v.total for v in payload.historico_vendas)
    total_vendas   = len(payload.historico_vendas)

    # Contagem de produtos vendidos
    produtos_vendidos: dict[str, float] = {}
    for venda in payload.historico_vendas:
        for item in venda.itens:
            produtos_vendidos[item.nome] = produtos_vendidos.get(item.nome, 0) + item.quantidade

    system_prompt = """
Você é um analista de negócios sênior especializado em varejo e PDV, trabalhando para o sistema NEXUS PDV.
Sua função é gerar relatórios executivos inteligentes com insights valiosos para o gestor.

REGRAS OBRIGATÓRIAS:
1. Responda APENAS com JSON puro, sem markdown, sem texto adicional, sem blocos de código.
2. O JSON deve seguir EXATAMENTE esta estrutura:
{
  "resumo_executivo": "string com 2-3 frases resumindo o período",
  "kpis": {
    "total_faturado": number,
    "total_vendas": number,
    "ticket_medio": number,
    "produto_mais_vendido": "string",
    "melhor_dia": "string"
  },
  "insights": ["lista de insights como strings, mínimo 4"],
  "alertas": ["lista de alertas como strings"],
  "tendencias": ["lista de tendências identificadas como strings"],
  "grafico_vendas_por_dia": {
    "labels": ["datas"],
    "valores": [valores numéricos de faturamento por dia]
  },
  "grafico_produtos_mais_vendidos": {
    "labels": ["nomes dos produtos"],
    "valores": [quantidades vendidas]
  },
  "relatorio_escrito": "string com análise completa e profissional em português, mínimo 4 parágrafos"
}
"""

    user_prompt = f"""
Gere um relatório inteligente de vendas para a filial: {payload.filial}
Período analisado: {payload.periodo}

DADOS GERAIS:
- Total faturado: R$ {total_faturado:.2f}
- Total de vendas realizadas: {total_vendas}
- Ticket médio: R$ {(total_faturado / total_vendas if total_vendas > 0 else 0):.2f}

PRODUTOS MAIS VENDIDOS:
{json.dumps(produtos_vendidos, ensure_ascii=False, indent=2)}

HISTÓRICO COMPLETO DE VENDAS:
{json.dumps([{
    "data": v.data,
    "operador": v.operador,
    "total": v.total,
    "forma_pagamento": v.formaPagto,
    "qtd_itens": len(v.itens)
} for v in payload.historico_vendas], ensure_ascii=False, indent=2)}

Identifique padrões, tendências, produtos destaque e gere recomendações estratégicas.
"""

    resultado = chamar_claude(system_prompt, user_prompt)
    return resultado


# ============================================================
#  ROTA 3: RELATÓRIO FINANCEIRO AUTOMATIZADO
# ============================================================

@app.post("/ia/relatorio-financeiro")
def relatorio_financeiro(payload: PayloadFinanceiro):
    """
    Gera relatório financeiro completo com análise por forma
    de pagamento, comparativos e projeções.
    """

    # Agrupa por forma de pagamento
    por_forma_pagto: dict[str, dict] = {}
    for venda in payload.historico_vendas:
        forma = venda.formaPagto or "Não informado"
        if forma not in por_forma_pagto:
            por_forma_pagto[forma] = {"total": 0.0, "quantidade": 0, "troco_total": 0.0}
        por_forma_pagto[forma]["total"]       += venda.total
        por_forma_pagto[forma]["quantidade"]  += 1
        por_forma_pagto[forma]["troco_total"] += venda.troco or 0.0

    total_geral    = sum(v.total for v in payload.historico_vendas)
    total_transacoes = len(payload.historico_vendas)

    system_prompt = """
Você é um controller financeiro especializado em varejo e negócios de pequeno e médio porte,
trabalhando para o sistema NEXUS PDV. Sua função é gerar relatórios financeiros completos
e precisos com análises e projeções baseadas em dados reais.

REGRAS OBRIGATÓRIAS:
1. Responda APENAS com JSON puro, sem markdown, sem texto adicional, sem blocos de código.
2. O JSON deve seguir EXATAMENTE esta estrutura:
{
  "resumo_executivo": "string com situação financeira geral em 2-3 frases",
  "kpis_financeiros": {
    "faturamento_total": number,
    "total_transacoes": number,
    "ticket_medio": number,
    "maior_venda": number,
    "total_troco_devolvido": number
  },
  "analise_formas_pagamento": [
    {
      "forma": "string",
      "total": number,
      "quantidade": number,
      "percentual": number,
      "troco_devolvido": number
    }
  ],
  "projecao_mensal": {
    "estimativa_faturamento": number,
    "base_calculo": "string explicando como foi calculado"
  },
  "grafico_formas_pagamento": {
    "labels": ["formas de pagamento"],
    "valores": [valores totais por forma]
  },
  "grafico_faturamento_diario": {
    "labels": ["datas"],
    "valores": [faturamento por dia]
  },
  "alertas_financeiros": ["lista de alertas financeiros como strings"],
  "recomendacoes": ["lista de recomendações financeiras como strings"],
  "relatorio_escrito": "string com análise financeira completa e profissional em português, mínimo 4 parágrafos"
}
"""

    user_prompt = f"""
Gere o relatório financeiro para a filial: {payload.filial}
Período: {payload.periodo}

RESUMO FINANCEIRO:
- Faturamento total: R$ {total_geral:.2f}
- Total de transações: {total_transacoes}
- Ticket médio: R$ {(total_geral / total_transacoes if total_transacoes > 0 else 0):.2f}

BREAKDOWN POR FORMA DE PAGAMENTO:
{json.dumps(por_forma_pagto, ensure_ascii=False, indent=2)}

DETALHAMENTO DAS VENDAS:
{json.dumps([{
    "data": v.data,
    "total": v.total,
    "forma_pagamento": v.formaPagto,
    "troco": v.troco
} for v in payload.historico_vendas], ensure_ascii=False, indent=2)}

Calcule percentuais por forma de pagamento, identifique padrões financeiros,
estime projeção mensal e dê recomendações para otimizar o fluxo de caixa.
"""

    resultado = chamar_claude(system_prompt, user_prompt)
    return resultado


# ============================================================
#  ROTA 4: ANÁLISE DE DESEMPENHO POR VENDEDOR
# ============================================================

@app.post("/ia/desempenho-vendedores")
def desempenho_vendedores(payload: PayloadVendedores):
    """
    Analisa o desempenho individual de cada vendedor,
    gera ranking, médias e recomendações de gestão.
    """

    # Agrupa dados por operador
    por_operador: dict[str, dict] = {}
    for venda in payload.historico_vendas:
        op = venda.operador
        if op not in por_operador:
            por_operador[op] = {
                "total_faturado": 0.0,
                "total_vendas":   0,
                "itens_vendidos": 0,
                "produtos":       {}
            }
        por_operador[op]["total_faturado"] += venda.total
        por_operador[op]["total_vendas"]   += 1
        for item in venda.itens:
            por_operador[op]["itens_vendidos"] += item.quantidade
            nome = item.nome
            por_operador[op]["produtos"][nome] = por_operador[op]["produtos"].get(nome, 0) + item.quantidade

    system_prompt = """
Você é um especialista em gestão de equipes de vendas e RH comercial,
trabalhando para o sistema NEXUS PDV. Sua função é analisar o desempenho
dos vendedores e gerar insights para o gestor tomar decisões estratégicas.

REGRAS OBRIGATÓRIAS:
1. Responda APENAS com JSON puro, sem markdown, sem texto adicional, sem blocos de código.
2. O JSON deve seguir EXATAMENTE esta estrutura:
{
  "resumo_executivo": "string com visão geral da equipe em 2-3 frases",
  "ranking": [
    {
      "posicao": number,
      "nome": "string",
      "total_faturado": number,
      "total_vendas": number,
      "ticket_medio": number,
      "itens_vendidos": number,
      "produto_destaque": "string",
      "performance": "excelente|bom|regular|abaixo",
      "observacao": "string com análise individual"
    }
  ],
  "destaque_equipe": {
    "maior_faturamento": "string nome",
    "mais_vendas": "string nome",
    "maior_ticket_medio": "string nome"
  },
  "grafico_faturamento_por_vendedor": {
    "labels": ["nomes dos vendedores"],
    "valores": [faturamento total por vendedor]
  },
  "grafico_vendas_por_vendedor": {
    "labels": ["nomes dos vendedores"],
    "valores": [quantidade de vendas por vendedor]
  },
  "alertas_gestao": ["lista de alertas de gestão como strings"],
  "recomendacoes": ["lista de recomendações para o gestor como strings"],
  "relatorio_escrito": "string com análise completa de desempenho da equipe em português, mínimo 4 parágrafos"
}
"""

    user_prompt = f"""
Analise o desempenho dos vendedores da filial: {payload.filial}
Período: {payload.periodo}

DADOS POR OPERADOR:
{json.dumps(por_operador, ensure_ascii=False, indent=2)}

Total de vendas no período: {len(payload.historico_vendas)}
Faturamento total da equipe: R$ {sum(v.total for v in payload.historico_vendas):.2f}

Monte um ranking completo, identifique o melhor e pior desempenho,
calcule ticket médio por vendedor, destaque os produtos favoritos de cada um
e dê recomendações estratégicas para o gestor melhorar os resultados da equipe.
"""

    resultado = chamar_claude(system_prompt, user_prompt)
    return resultado