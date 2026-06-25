import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

// Cria uma página web fictícia para a Render não dar erro
app.get('/', (req, res) => {
    res.send('🤖 Monitor de Moedas está online e rodando na nuvem!');
});

app.listen(PORT, () => {
    console.log(`💻 Servidor web fictício rodando na porta ${PORT}`);
});

// --- CONFIGURAÇÕES SEGURAS (NUVEM) ---
const TOKEN_TELEGRAM = process.env.TOKEN_TELEGRAM; 
const ID_TELEGRAM = process.env.ID_TELEGRAM; 
const MOEDA = "EUR-BRL"; 
const LIMITE_ALERTA = 6.0; // Defina aqui o preço desejado

// Função robusta para ler a API na nuvem sem depender do nome da chave
async function pegarCotacao() {
    const url = `https://economia.awesomeapi.com.br/last/${MOEDA}`;
    try {
        const resposta = await fetch(url);
        const dados = await resposta.json();
        
        // Pega a primeira propriedade que estiver dentro do objeto retornado (ex: EURBRL)
        const chaves = Object.keys(dados);
        if (chaves.length > 0) {
            const primeiraChave = chaves[0];
            return parseFloat(dados[primeiraChave].bid);
        }
        
        console.log("❌ Resposta da API veio vazia.");
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
            body: JSON.stringify({ chat_id: ID_TELEGRAM, text: mensagem })
        });
        const resultado = await resposta.json();
        if (resposta.ok) {
            console.log("✅ Notificação enviada com sucesso para o Telegram!");
        } else {
            console.log("❌ O Telegram recusou a mensagem. Motivo:", resultado.description);
        }
    } catch (erro) {
        console.log("❌ Erro de conexão ao tentar enviar para o Telegram:", erro.message);
    }
}

const esperar = (milissegundos) => new Promise(resolve => setTimeout(resolve, milissegundos));

async function iniciarMonitoramento() {
    console.log(`🤖 Monitor iniciado! Olhando o ${MOEDA}. Alerta configurado para: R$ ${LIMITE_ALERTA}`);

    while (true) {
        const precoAtual = await pegarCotacao();

        if (precoAtual) {
            console.log(`[${new Date().toLocaleTimeString()}] Preço atual: R$ ${precoAtual.toFixed(2)}`);

            if (precoAtual <= LIMITE_ALERTA) {
                const textoAlerta = `🚨 ATENÇÃO! O Euro está em R$ ${precoAtual.toFixed(2)}! Hora de comprar!`;
                await enviarNotificacao(textoAlerta);
                await esperar(3600000); // Espera 1 hora se já avisou
            }
        }
        await esperar(60000); // Checa a cada 1 minuto
    }
}

// Executa o monitoramento
iniciarMonitoramento();