// --- CONFIGURAÇÕES SEGURAS (NUVEM) ---
// O script agora vai ler os tokens direto do servidor da Render
const TOKEN_TELEGRAM = process.env.TOKEN_TELEGRAM; 
const ID_TELEGRAM = process.env.ID_TELEGRAM; 
const MOEDA = "EUR-BRL"; 
const LIMITE_ALERTA = 6.0; 

// Função que vai na internet buscar o preço da moeda
async function pegarCotacao() {
    const url = `https://economia.awesomeapi.com.br/last/${MOEDA}`;
    try {
        const resposta = await fetch(url);
        const dados = await resposta.json();
        
        // Ajusta o texto para ler o preço (ex: remove o hífen de USD-BRL)
        const chave = MOEDA.replace("-", "");
        const cotacaoAtual = parseFloat(dados[chave].bid);
        
        return cotacaoAtual;
    } catch (erro) {
        console.log("Erro ao buscar a cotação na internet:", erro.message);
        return null;
    }
}

// Função que manda a mensagem para o seu celular via Telegram
async function enviarNotificacao(mensagem) {
    const url = `https://api.telegram.org/bot${TOKEN_TELEGRAM}/sendMessage`;
    try {
        await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: ID_TELEGRAM,
                text: mensagem
            })
        });
        console.log("Notificação enviada para o Telegram!");
    } catch (erro) {
        console.log("Erro ao enviar mensagem no Telegram:", erro.message);
    }
}

// Função que faz o script esperar um tempo antes de tentar de novo
const esperar = (milissegundos) => new Promise(resolve => setTimeout(resolve, milissegundos));

// Função principal que fica rodando sem parar
async function iniciarMonitoramento() {
    console.log(`🤖 Monitor iniciado! Olhando o ${MOEDA}. Alerta configurado para: R$ ${LIMITE_ALERTA}`);

    while (true) {
        const precoAtual = await pegarCotacao();

        if (precoAtual) {
            console.log(`[${new Date().toLocaleTimeString()}] Preço atual: R$ ${precoAtual.toFixed(2)}`);

            // SE o preço atual for menor ou igual ao seu limite, ele avisa!
            if (precoAtual <= LIMITE_ALERTA) {
                const textoAlerta = `🚨 ATENÇÃO! O valor do Euro esta para R$ ${precoAtual.toFixed(2)}! Hora de comprar!`;
                await enviarNotificacao(textoAlerta);
                
                // Se ele avisar, espera 1 hora (3600000 ms) para não ficar mandando mensagem toda hora
                await esperar(3600000);
            }
        }

        // Espera 1 minuto (60000 milissegundos) antes de checar o preço de novo
        await esperar(60000);
    }
}

// Executa o monitoramento
iniciarMonitoramento();