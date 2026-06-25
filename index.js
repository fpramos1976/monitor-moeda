import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

// Configurações do Monitor
const TOKEN_TELEGRAM = process.env.TOKEN_TELEGRAM; 
const ID_TELEGRAM = process.env.ID_TELEGRAM; 
const MOEDA = "EUR-BRL"; 
const LIMITE_ALERTA = 6.0; 

// Controle para evitar enxurrada de mensagens (espera 1 hora antes de avisar de novo)
let tempoUltimoAlerta = 0;

async function pegarCotacao() {
    const url = `https://economia.awesomeapi.com.br/last/${MOEDA}`;
    try {
        const resposta = await fetch(url);
        const dados = await resposta.json();
        
        const chaves = Object.keys(dados);
        if (chaves.length > 0) {
            const primeiraChave = chaves[0];
            return parseFloat(dados[primeiraChave].bid);
        }
        return null;
    } catch (erro) {
        console.log("❌ Erro ao buscar a cotação na internet:", erro.message);
        return null;
    }
}

async function enviarNotificacao(mensagem) {
    const url = `https://api.telegram.org/bot${TOKEN_TELEGRAM}/sendMessage`;
    try {
        const resposta = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: ID_TELEGRAM, text: messagem })
        });
        if (resposta.ok) {
            console.log("✅ Notificação enviada com sucesso para o Telegram!");
        } else {
            const resultado = await resposta.json();
            console.log("❌ O Telegram recusou a mensagem. Motivo:", resultado.description);
        }
    } catch (erro) {
        console.log("❌ Erro de conexão ao tentar enviar para o Telegram:", erro.message);
    }
}

// Função que faz a checagem pontual do preço
async function verificarMercado() {
    const precoAtual = await pegarCotacao();
    if (!precoAtual) return;

    console.log(`[${new Date().toLocaleTimeString()}] Preço atual: R$ ${precoAtual.toFixed(2)}`);

    if (precoAtual <= LIMITE_ALERTA) {
        const agora = Date.now();
        // Se faz menos de 1 hora (3.600.000 ms) do último alerta, não envia de novo
        if (agora - tempoUltimoAlerta > 3600000) {
            const textoAlerta = `🚨 ATENÇÃO! O Euro está em R$ ${precoAtual.toFixed(2)}! Hora de comprar!`;
            await enviarNotificacao(textoAlerta);
            tempoUltimoAlerta = agora;
        } else {
            console.log("⏳ Alerta no gatilho, mas silenciado para evitar repetições consecutivas.");
        }
    }
}

// Rota padrão para a Render verificar que o servidor está vivo e saudável
app.get('/', (req, res) => {
    res.send('🤖 Monitor de Moedas está online e rodando na nuvem!');
});

// Liga o servidor Express na porta correta
app.listen(PORT, () => {
    console.log(`💻 Servidor ativo na porta ${PORT}`);
    console.log(`🤖 Monitor iniciado! Olhando o ${MOEDA}. Alerta configurado para: R$ ${LIMITE_ALERTA}`);
    
    // Executa uma vez assim que o servidor liga
    verificarMercado();
    
    // Executa a cada 1 minuto (60000 milissegundos) sem travar o servidor
    setInterval(verificarMercado, 60000);
});