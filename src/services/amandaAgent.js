/**
 * AMANDA VANCE - AGENTE IA DE PSICOLOGIA & PERFORMANCE DE TRADING
 * Suporta Google Gemini Pro e Anthropic Claude com personalidade de 12+ anos de mesa proprietária.
 */

export const AMANDA_SYSTEM_PROMPT = `
Você é Amanda Vance, uma Mentora Sênior de Psicologia Comportamental e Gestão de Risco Institucional com mais de 12 anos de experiência treinando traders em mesas proprietárias (prop desks) e fundos de investimento.

SUA MISSÃO ESSENCIAL:
Atender o trader diariamente, escutar seus desabafos e dores sem julgamento moral, detectar imediatamente erros cruciais (que quebram contas) e erros bestas (que sangram lucro), e intervir com autoridade cirúrgica e equilíbrio para proteger o capital e a mente do trader.

SUA PERSONALIDADE E TOM DE VOZ (EQUILIBRADA):
1. ACOLHEDORA E EMPÁTICA: Você já viu de tudo em 12 anos de mercado. Você sabe a dor visceral de um stop, a queimação no peito de uma violinada e a sensação de impotência do tilt. Você NUNCA zomba, humilha ou faz sermão vazio.
2. FIRME E INEGOCIÁVEL COM RISCO: Você não passa a mão na cabeça quando o trader comete erros fatais (fazer preço médio na perda, mover stop loss, operar com raiva para se vingar, alavancar além da gestão). Nesses momentos, você assume o comando da mesa e exige parada imediata.
3. CIRÚRGICA E ORIENTADA À AÇÃO: Cada resposta sua deve ter um diagnóstico psicológico do que está acontecendo e UMA AÇÃO PRÁTICA IMEDIATA (ex: "Feche essa ordem agora", "Afaste as mãos do mouse e beba um copo d'água", "Faça a respiração 4-7-8").
4. LINGUAGEM DE SALA DE OPERAÇÕES: Use termos reais de mercado e psicologia (drawdown, viés de recência, falácia do apostador, aversão à perda de Kahneman, liquidez institucional, ruído de mercado, overtrading, disciplina probabilística).

DIRETRIZES DE RESPOSTA:
- Seja direta, equilibrada e impactante. Evite respostas excessivamente longas ou prolixas — o trader precisa de clareza imediata no meio do pregão.
- Use **negrito** nas ações e conceitos-chave.
- Se o trader disser que está em pânico ou quebrou regras, estanque a sangria primeiro, acalme a mente dele depois.
`.trim();

/**
 * Envia mensagem para o Claude (Anthropic API)
 */
export async function chatWithClaude(apiKey, userMessage, conversationHistory = [], userContext = {}) {
  const messages = conversationHistory.map(m => ({
    role: m.sender === 'amanda' ? 'assistant' : 'user',
    content: m.text
  }));

  // Adiciona a mensagem atual com o contexto de trading se houver
  let content = userMessage;
  if (userContext.pnl || userContext.readinessScore) {
    content += `\n\n[Contexto do Trader agora: Prontidão Mental: ${userContext.readinessScore || 'N/A'}% | P&L do Dia: R$ ${userContext.pnl || '0'}]`;
  }

  messages.push({ role: 'user', content });

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'dangerously-allow-browser': 'true'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1000,
      system: AMANDA_SYSTEM_PROMPT,
      messages: messages
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Erro Anthropic Claude (${response.status})`);
  }

  const data = await response.json();
  return data.content?.[0]?.text || 'Amanda não conseguiu processar sua mensagem.';
}

/**
 * Envia mensagem para o Google Gemini Pro (Google AI Studio)
 */
export async function chatWithGemini(apiKey, userMessage, conversationHistory = [], userContext = {}) {
  const contents = [];

  // Histórico de conversa
  conversationHistory.forEach(m => {
    contents.push({
      role: m.sender === 'amanda' ? 'model' : 'user',
      parts: [{ text: m.text }]
    });
  });

  let currentText = userMessage;
  if (userContext.pnl || userContext.readinessScore) {
    currentText += `\n\n[Contexto Atual: Prontidão: ${userContext.readinessScore || 'N/A'}% | P&L: R$ ${userContext.pnl || '0'}]`;
  }

  contents.push({
    role: 'user',
    parts: [{ text: currentText }]
  });

  // Tenta modelos recomendados do Gemini em ordem
  const models = ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.5-pro', 'gemini-pro'];
  let lastError = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: contents,
          systemInstruction: {
            parts: [{ text: AMANDA_SYSTEM_PROMPT }]
          },
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
      } else {
        const errJson = await response.json().catch(() => ({}));
        lastError = new Error(errJson?.error?.message || `Erro no Gemini (${response.status})`);
      }
    } catch (e) {
      lastError = e;
    }
  }

  throw lastError || new Error("Falha ao comunicar com os modelos do Gemini.");
}

/**
 * Função unificada que chama Amanda usando Claude, Gemini ou motor nativo
 */
export async function talkToAmanda({ provider, apiKey, message, history, context }) {
  if (provider === 'claude' && apiKey) {
    return await chatWithClaude(apiKey, message, history, context);
  } else if (provider === 'gemini' && apiKey) {
    return await chatWithGemini(apiKey, message, history, context);
  }

  // Se não tiver chave, devolve resposta do motor cognitivo autônomo da Amanda
  return null;
}
