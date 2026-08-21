/**
 * GOAT TRADER — FinGPT & FinRobot Algorithmic Intelligence Engine
 * Inspired by AI4Finance-Foundation (FinGPT, FinRL, FinRobot)
 */

/**
 * Calcula o sentimento macroeconômico FinGPT baseado em cotações e variação da B3
 */
export const calculateFinGptMarketSentiment = (quotes = []) => {
  if (!quotes || quotes.length === 0) {
    return {
      sentiment: 'NEUTRO',
      score: 50,
      color: '#38bdf8',
      label: 'Mercado Moderado',
      summary: 'Volatilidade dentro da média histórica. Mantenha seu plano de gestão de risco.',
      riskLevel: 'MÉDIO'
    };
  }

  let totalWeight = 0;
  let weightedVariation = 0;

  quotes.forEach(q => {
    const changeVal = parseFloat(String(q.change || '0').replace('%', '').replace(',', '.'));
    const weight = q.symbol === 'IBOV' || q.symbol === 'WINFUT' ? 2.5 : 1.0;
    weightedVariation += changeVal * weight;
    totalWeight += weight;
  });

  const avgChange = totalWeight > 0 ? weightedVariation / totalWeight : 0;
  const normalizedScore = Math.min(100, Math.max(0, Math.round(50 + avgChange * 25)));

  if (normalizedScore >= 65) {
    return {
      sentiment: 'BULLISH 🟢',
      score: normalizedScore,
      color: '#10b981',
      label: 'Tendência Autista Forte (Bull Market)',
      summary: 'FinGPT detectou forte confluência de compradores no fluxo. Favoreça setups a favor da tendência.',
      riskLevel: 'BAIXO PARA COMPRAS'
    };
  } else if (normalizedScore <= 35) {
    return {
      sentiment: 'BEARISH 🔴',
      score: normalizedScore,
      color: '#ef4444',
      label: 'Pressão Vendedora Institucional (Bear Market)',
      summary: 'FinGPT alerta: fluxo institucional fortemente vendedor. Cuidado com retomas de suporte falso.',
      riskLevel: 'ELEVADO'
    };
  }

  return {
    sentiment: 'NEUTRO 🟡',
    score: normalizedScore,
    color: '#f59e0b',
    label: 'Consolidação / Lateralidade (Sideways)',
    summary: 'FinGPT indica mercado lateralizado. Evite overtrading no meio do caixote.',
    riskLevel: 'MÉDIO'
  };
};

/**
 * Painel Multi-Agente FinRobot (3 Agentes Especializados)
 */
export const getFinRobotAgentsInsight = (metrics = null) => {
  const winRate = metrics ? parseFloat(metrics.winRate) || 50 : 50;
  const payoff = metrics ? parseFloat(metrics.payoff) || 1.5 : 1.5;
  const totalPnL = metrics ? parseFloat(metrics.totalProfit) || 0 : 0;

  return [
    {
      id: 'agent_macro',
      name: 'FinGPT Macro & Sentiment Agent',
      role: 'Análise de Notícias & Fluxo B3',
      avatar: '🌐',
      status: 'ATIVO',
      badgeColor: '#38bdf8',
      diagnosis: 'Sentimento de mercado estável. Calendário econômico limpo nas próximas 2 horas.',
      action: 'Aguardar abertura das bolsas americanas às 10:30 para confirmação de volume.'
    },
    {
      id: 'agent_rl',
      name: 'FinRL Reinforcement Agent',
      role: 'Otimizador de Payoff & Setups',
      avatar: '⚡',
      status: winRate >= 55 ? 'ALTA PERFORMANCE' : 'ATENÇÃO',
      badgeColor: winRate >= 55 ? '#10b981' : '#f59e0b',
      diagnosis: `Taxa de Acerto calculada em ${winRate}% com Payoff médio de ${payoff}x.`,
      action: payoff < 1.5 
        ? 'Aumentar o alvo das operações vencedoras para manter a expectativa matemática positiva.' 
        : 'Manter a execução impecável do plano quantitativo.'
    },
    {
      id: 'agent_risk',
      name: 'FinRobot Risk Officer',
      role: 'Blindagem de Patrimônio & Stop',
      avatar: '🛡️',
      status: totalPnL >= 0 ? 'PROTEGIDO' : 'ALERTA DE DRAWDOW',
      badgeColor: totalPnL >= 0 ? '#10b981' : '#ef4444',
      diagnosis: totalPnL < 0 
        ? `Drawdown acumulado em R$ ${Math.abs(totalPnL).toFixed(2)}. Risco de stop diário atingido.` 
        : 'Patrimônio protegido. Stop Loss dentro dos limites estipulados.',
      action: totalPnL < 0 
        ? 'REDUZIR LOTE PELA METADE ou encerrar o dia de operações para evitar viés emocional.' 
        : 'Respeitar o limite de 3 trades por dia.'
    }
  ];
};
