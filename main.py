from fastapi import FastAPI
from supabase import create_client, Client
import os
from dotenv import load_dotenv
from typing import Any

# Carrega as senhas do arquivo .env
load_dotenv()

# Conecta ao banco de dados
url = os.environ.get("SUPABASE_URL") or ""
key = os.environ.get("SUPABASE_KEY") or ""
supabase: Client = create_client(url, key)

app = FastAPI()

@app.get("/")
def home():
    return {"status": "Nexus Online"}

@app.get("/produtos")
def listar_produtos() -> list[Any]:
    # Busca tudo da tabela que você criou no Supabase
    resposta = supabase.table("produtos").select("*").execute()
    return resposta.data if resposta.data else []