import { GoogleGenAI } from "@google/genai";

export const askGeminiMentorStream = async function*(apiKey, userMessage, tradeHistory, metrics = null) {
  if (!apiKey) {
    throw new Error("Chave de API não configurada.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const historyContext = tradeHistory && tradeHistory.length > 0 
    ? `Aqui estão os dados recentes de operações (trades) do usuário em formato JSON: ${JSON.stringify(tradeHistory.slice(-50))}` 
    : "O usuário ainda não cadastrou nenhuma operação no histórico.";

  const metricsContext = metrics 
    ? `
MÉTRICAS MATEMÁTICAS DO USUÁRIO (Contexto OBRIGATÓRIO):
- Taxa de Acerto (Win Rate): ${metrics.winRate}%
- Lucro Total (Líquido): R$ ${metrics.totalProfit}
- Drawdown Máximo: R$ ${metrics.maxDrawdown}
- Fator de Lucro: ${metrics.profitFactor}
- Payoff (Risco/Retorno médio): ${metrics.payoff}
- Horário Tóxico Identificado: ${metrics.toxicHour ? `${metrics.toxicHour.hour} (Saldo: R$ ${metrics.toxicHour.pnl})` : 'Não definido'}

Se as métricas forem ruins (ex: Payoff abaixo de 1.5 ou Win Rate muito baixo com Fator de Lucro < 1), seja extremamente rígido e puxe a orelha do trader. Mostre matematicamente por que ele vai quebrar a conta se não mudar. Se forem boas, elogie mas exija disciplina para não devolver pro mercado.` 
    : "";

  const systemPrompt = `Você é o "GOAT", um mentor de day trade implacável de fundo de investimento, focado em psicologia e gerenciamento de risco.
Você não alivia, você fala verdades matemáticas dolorosas e diretas.
Sua análise deve ser estruturada em bullet points claros e diretos. Evite blocos gigantes de texto. Use **negrito** nas palavras-chave.
Contexto do usuário:
${historyContext}
${metricsContext}

Pergunta ou Ação Rápida: ${userMessage}`;

  try {
    const responseStream = await ai.models.generateContentStream({
      model: "gemini-3.5-flash",
      contents: systemPrompt
    });
    for await (const chunk of responseStream) {
      yield chunk.text;
    }
  } catch (error) {
    console.error("Erro ao chamar Gemini:", error);
    throw new Error("Falha ao comunicar com a IA. Tente novamente.", { cause: error });
  }
};

// ─────────────────────────────────────────────────────────────────
// GoatIA PROATIVO — Intervenção imediata baseada em alertas do /monitor
// ─────────────────────────────────────────────────────────────────
export const askGeminiProactive = async function*(apiKey, alerts, metrics) {
  if (!apiKey) throw new Error("Chave de API não configurada.");

  const ai = new GoogleGenAI({ apiKey });

  const alertSummary = alerts.map(a =>
    `[${a.severity}] ${a.emoji} ${a.title}: ${a.message} → Ação: ${a.action}`
  ).join('\n');

  const metricsCtx = metrics
    ? `Win Rate: ${metrics.winRate}% | Payoff: ${metrics.payoff} | Drawdown Máx: R$${metrics.maxDrawdown}`
    : '';

  const prompt = `Você é o GOAT, Risk Manager Institucional. Acaba de detectar os seguintes alertas ATIVOS no pregão do trader:

${alertSummary}

Métricas atuais: ${metricsCtx}

MISSÃO CRÍTICA: Dê uma intervenção CURTA (máximo 5 bullets), DIRETA e URGENTE.
- Foque no risco IMEDIATO, não em análise geral
- Use linguagem de "sala de operações" — sem rodeios
- Se há alerta HIGH: seja duro, quase agressivo — o trader pode estar prestes a quebrar o dia
- Termine SEMPRE com uma ação concreta e simples que ele pode fazer AGORA
- Máximo 150 palavras no total`;

  try {
    const stream = await ai.models.generateContentStream({
      model: "gemini-3.5-flash",
      contents: prompt
    });
    for await (const chunk of stream) {
      yield chunk.text;
    }
  } catch (error) {
    console.error("Erro no GoatIA Proativo:", error);
    throw new Error("Falha na intervenção proativa.", { cause: error });
  }
};
