import express from 'express';
import 'dotenv/config';

const app = express();
const PORT = process.env.PORT || 3000;

// Configurações do Monitor
const TOKEN_TELEGRAM = process.env.TOKEN_TELEGRAM; 
const ID_TELEGRAM = process.env.ID_TELEGRAM; 
const MOEDA = "EUR-BRL"; 
const LIMITE_ALERTA = 6.0; 

let tempoUltimoAlerta = 0;

async function pegarCotacao() {
    // Usando uma API global estável que não bloqueia IPs de servidores
    const url = `https://open.er-api.com/v6/latest/EUR`;
    try {
        const resposta = await fetch(url);
        
        if (!resposta.ok) {
            console.log(`❌ API respondeu com status: ${resposta.status}`);
            return null;
        }

        const dados = await resposta.json();
        
        // Essa API traz a base EUR e as chaves de conversão dentro de "rates"
        if (dados && dados.rates && dados.rates.BRL) {
            return parseFloat(dados.rates.BRL);
        }
        
        console.log("❌ Formato de dados inesperado da nova API.");
        return null;
    } catch (erro) {
        console.log("❌ Erro ao buscar a cotação na internet:", erro.message);
        return null;
    }
}

async function enviarNotificacao(mensagem) {
    const url = `https://api.telegram.org/bot${TOKEN_TELEGRAM}/sendMessage`;
    try {
        console.log("📤 Tentando enviar dados para a API do Telegram...");
        const resposta = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                chat_id: Number(ID_TELEGRAM), // 👈 Força a Render a enviar como número puro
                text: mensagem 
            })
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

async function verificarMercado() {
    console.log("📡 Buscando cotação atual na API...");
    const precoAtual = await pegarCotacao();
    if (!precoAtual) {
        console.log("❌ Não foi possível ler o preço atual.");
        return;
    }

    console.log(`[${new Date().toLocaleTimeString()}] Preço atual: R$ ${precoAtual.toFixed(2)}`);

    if (precoAtual <= LIMITE_ALERTA) {
        const agora = Date.now();
        if (agora - tempoUltimoAlerta > 3600000) {
            const textoAlerta = `🚨 ATENÇÃO! O Euro está em R$ ${precoAtual.toFixed(2)}! Hora de comprar!`;
            await enviarNotificacao(textoAlerta);
            tempoUltimoAlerta = agora;
        } else {
            console.log("⏳ Alerta no gatilho, mas silenciado para evitar repetições consecutivas.");
        }
    } else {
        console.log(`ℹ️ O preço atual (R$ ${precoAtual.toFixed(2)}) está acima do limite configurado (R$ ${LIMITE_ALERTA}). Nenhum alerta enviado.`);
    }
}

app.get('/', (req, res) => {
    res.send('🤖 Monitor de Moedas está online e rodando na nuvem!');
});

app.listen(PORT, () => {
    console.log(`💻 Servidor ativo na porta ${PORT}`);
    console.log(`🤖 Monitor iniciado! Olhando o ${MOEDA}. Alerta configurado para: R$ ${LIMITE_ALERTA}`);
    
    setTimeout(() => {
        console.log("🔄 Executando primeira checagem de mercado...");
        verificarMercado().catch(err => console.log("❌ Erro fatal na checagem:", err));
    }, 2000);
    
    setInterval(() => {
        console.log("🔄 Executando checagem periódica...");
        verificarMercado().catch(err => console.log("❌ Erro fatal na checagem:", err));
    }, 60000);
});