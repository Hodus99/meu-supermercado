const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Configuração da conexão com o PostgreSQL
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// Testar conexão ao iniciar
pool.connect((err, client, release) => {
    if (err) {
        return console.error('Erro ao conectar ao PostgreSQL:', err.stack);
    }
    console.log('⚡ Conexão com o PostgreSQL estabelecida com sucesso!');
    release();
});

// Rota padrão de teste
app.get('/', (req, res) => {
    res.send('API do Nexus PDV está online!');
});

// ROTA PARA PROCESSAR O LOGIN DO NEXUS
app.post('/api/login', async (req, res) => {
    const { login, senha } = req.body;

    try {
        // Busca o usuário no banco de dados combinando login e senha
        const resultado = await pool.query(
            'SELECT id, nome, login, username, role FROM usuarios WHERE login = $1 AND senha = $2',
            [login, senha]
        );

        // Se encontrou o usuário
        if (resultado.rows.length > 0) {
            res.json({
                sucesso: true,
                usuario: resultado.rows[0] // Envia os dados do usuário de volta (menos a senha por segurança)
            });
        } else {
            // Se as credenciais estiverem erradas
            res.status(401).json({
                sucesso: false,
                mensagem: 'Login ou senha incorretos.'
            });
        }
    } catch (erro) {
        console.error('Erro na autenticação:', erro);
        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro interno no servidor ao tentar logar.'
        });
    }
});

// Iniciar o servidor
app.listen(port, () => {
    console.log(`🚀 Servidor backend rodando na porta ${port}`);
});

// ROTA: Buscar todos os veículos
app.get('/api/veiculos', async (req, res) => {
    try {
        const resultado = await pool.query('SELECT * FROM veiculos ORDER BY modelo ASC');
        res.json(resultado.rows);
    } catch (erro) {
        console.error('Erro ao buscar veículos:', erro);
        res.status(500).json({ erro: 'Erro interno ao buscar veículos' });
    }
});

// ROTA: Cadastrar ou Atualizar Veículo (Usa a placa como chave única)
app.post('/api/veiculos', async (req, res) => {
    const { modelo, placa, motorista_dia, combustivel_atual } = req.body;
    try {
        const query = `
            INSERT INTO veiculos (modelo, placa, motorista_dia, combustivel_atual, ultima_atualizacao)
            VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
            ON CONFLICT (placa) 
            DO UPDATE SET 
                modelo = EXCLUDED.modelo,
                motorista_dia = EXCLUDED.motorista_dia,
                combustivel_atual = EXCLUDED.combustivel_atual,
                ultima_atualizacao = CURRENT_TIMESTAMP;
        `;
        await pool.query(query, [modelo, placa, motorista_dia, combustivel_atual]);
        res.json({ sucesso: true, mensagem: 'Frota atualizada com sucesso!' });
    } catch (erro) {
        console.error('Erro ao salvar veículo:', erro);
        res.status(500).json({ erro: 'Erro interno ao salvar veículo' });
    }
});