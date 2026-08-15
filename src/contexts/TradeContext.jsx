/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { saveTradesBatch } from '../services/supabaseClient';

const TradeContext = createContext();

export const useTrades = () => useContext(TradeContext);

export const TradeProvider = ({ children }) => {
  const { user } = useAuth();
  const [trades, setTrades] = useState(() => {
    // Carrega os dados salvos no LocalStorage ao iniciar o app
    const saved = localStorage.getItem('matilha_trades');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  });

  const [reminders, setReminders] = useState(() => {
    const saved = localStorage.getItem('matilha_reminders');
    if (saved) {
      try { return JSON.parse(saved); } catch { return []; }
    }
    return [];
  });

  const [hypotheses, setHypotheses] = useState(() => {
    const saved = localStorage.getItem('matilha_hypotheses');
    if (saved) {
      try { return JSON.parse(saved); } catch { return []; }
    }
    return [];
  });

  const [diarios, setDiarios] = useState(() => {
    const saved = localStorage.getItem('matilha_diarios');
    if (saved) {
      try { return JSON.parse(saved); } catch { return {}; }
    }
    return {};
  });

  const [disciplineStreak, setDisciplineStreak] = useState(() => {
    const saved = localStorage.getItem('matilha_streak');
    return saved ? parseInt(saved, 10) : 0;
  });

  const [lastDisciplineDate, setLastDisciplineDate] = useState(() => {
    return localStorage.getItem('matilha_last_streak_date') || null;
  });

  // Sempre que 'trades' mudar, salva automaticamente no LocalStorage
  useEffect(() => {
    localStorage.setItem('matilha_trades', JSON.stringify(trades));
  }, [trades]);

  useEffect(() => {
    localStorage.setItem('matilha_reminders', JSON.stringify(reminders));
  }, [reminders]);

  useEffect(() => {
    localStorage.setItem('matilha_hypotheses', JSON.stringify(hypotheses));
  }, [hypotheses]);

  useEffect(() => {
    localStorage.setItem('matilha_diarios', JSON.stringify(diarios));
  }, [diarios]);

  useEffect(() => {
    localStorage.setItem('matilha_streak', disciplineStreak.toString());
  }, [disciplineStreak]);

  useEffect(() => {
    if (lastDisciplineDate) {
      localStorage.setItem('matilha_last_streak_date', lastDisciplineDate);
    }
  }, [lastDisciplineDate]);

  // Limite de Drawdown diário (pode ser configurável no Perfil depois)
  const [dailyDrawdownLimit, setDailyDrawdownLimit] = useState(500);

  const saveTrades = (newTrades) => {
    setTrades(newTrades); // Por enquanto, vamos substituir. Depois podemos fazer append se o usuário quiser
  };

  const addTrade = (trade) => {
    const updated = [trade, ...trades];
    setTrades(updated);
    localStorage.setItem('matilha_trades', JSON.stringify(updated));
  };

  const generateTradeHash = (trade) => {
    const date = trade['abertura'] || trade['data'] || trade['hora'] || trade['Abertura'] || trade['Data'] || '';
    const asset = trade['ativo'] || trade['Ativo'] || '';
    const side = trade['lado'] || trade['operação'] || trade['operacao'] || trade['Lado'] || '';
    const result = trade['resultado líquido'] || trade['resultado'] || trade['Resultado (R$)'] || trade['total'] || '0';
    return `${date}-${asset}-${side}-${result}`.toLowerCase().replace(/\s/g, '');
  };

  const addTradesBulk = (newTrades) => {
    const existingHashes = new Set(trades.map(generateTradeHash));
    let addedCount = 0;
    let skippedCount = 0;
    
    const validNewTrades = newTrades.filter(trade => {
      const hash = generateTradeHash(trade);
      if (existingHashes.has(hash)) {
        skippedCount++;
        return false;
      }
      existingHashes.add(hash);
      addedCount++;
      return true;
    });

    if (validNewTrades.length > 0) {
      const updated = [...validNewTrades, ...trades];
      setTrades(updated);
      localStorage.setItem('matilha_trades', JSON.stringify(updated));

      // Sincronização Assíncrona em Segundo Plano (Background Task)
      if (user?.id) {
        saveTradesBatch(user.id, validNewTrades).catch(err => {
          console.warn('Erro ao sincronizar trades com o Supabase em segundo plano:', err);
        });
      }
    }
    
    return { added: addedCount, skipped: skippedCount };
  };

  const clearTrades = () => {
    setTrades([]);
  };

  const addReminder = (text) => {
    setReminders(prev => [{ id: Date.now().toString(), text, date: new Date().toISOString() }, ...prev]);
  };

  const removeReminder = (id) => {
    setReminders(prev => prev.filter(r => r.id !== id));
  };

  const addHypothesis = (hyp) => {
    setHypotheses(prev => [{ id: Date.now().toString(), ...hyp, date: new Date().toISOString() }, ...prev]);
  };

  const removeHypothesis = (id) => {
    setHypotheses(prev => prev.filter(h => h.id !== id));
  };

  const saveDiarioEntry = (dateStr, entry) => {
    setDiarios(prev => ({
      ...prev,
      [dateStr]: entry
    }));
  };

  const incrementStreak = () => {
    const today = new Date().toLocaleDateString('pt-BR');
    if (lastDisciplineDate !== today) {
      setDisciplineStreak(prev => prev + 1);
      setLastDisciplineDate(today);
    }
  };

  const resetStreak = () => {
    setDisciplineStreak(0);
    setLastDisciplineDate(null);
  };

  // Funções de Cálculo (Analytics)
  const getMetrics = () => {
    if (!trades || trades.length === 0) return { winRate: 0, totalProfit: 0, maxDrawdown: 0, totalTrades: 0, profitFactor: 0, payoff: 0, maxWinningStreak: 0, maxLosingStreak: 0, dayOfWeekPerformance: [], assetPerformance: [] };

    let wins = 0;
    let totalProfit = 0;
    let peak = 0;
    let maxDrawdown = 0;
    let runningBalance = 0;

    let grossProfit = 0;
    let grossLoss = 0;
    let totalWinAmount = 0;
    let totalLossAmount = 0;
    let losses = 0;

    let currentWinStreak = 0;
    let currentLoseStreak = 0;
    let maxWinningStreak = 0;
    let maxLosingStreak = 0;

    const dayOfWeekMap = { '0': 0, '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0 };
    const assetMap = {};
    const scatterData = [];
    const heatmapMap = {}; // Key: "day-hour", Value: profit

    // Sort trades from oldest to newest to calculate streaks correctly
    const sortedTrades = [...trades].reverse();

    sortedTrades.forEach(trade => {
      // PnL calculation
      const resultStr = trade['resultado líquido'] || trade['resultado liquido'] || trade['res. operação'] || trade['res operacao'] || trade['resultado'] || trade['Resultado (R$)'] || trade['Resultado Líquido'] || trade['total'] || '0';
      let numericResult = parseFloat(String(resultStr).replace(/[^\d,-]/g, '').replace(',', '.')) || 0;

      const ativo = trade['ativo'] || trade['Ativo'] || 'OUTROS';
      const qtdStr = trade['quantidade'] || trade['qtd'] || trade['qtd compra'] || trade['qtd venda'] || trade['Quantidade'] || '1';
      const numQtd = parseInt(String(qtdStr).replace(/[^\d]/g, '')) || 1;
      
      let custoPorPerna = 0;
      const uAtivo = ativo.toUpperCase();
      let assetKey = 'OUTROS';
      if (uAtivo.startsWith('WIN')) { custoPorPerna = 0.25; assetKey = 'WIN'; }
      else if (uAtivo.startsWith('WDO')) { custoPorPerna = 1.00; assetKey = 'WDO'; }
      else if (uAtivo.startsWith('BIT')) { custoPorPerna = 0.72; assetKey = 'BIT'; }

      const custo = custoPorPerna * 2 * numQtd;
      numericResult -= custo;

      // Group by Asset
      if (!assetMap[assetKey]) assetMap[assetKey] = 0;
      assetMap[assetKey] += numericResult;

      // Group by Day of Week
      const dataStr = trade['abertura'] || trade['data'] || trade['hora'] || trade['Abertura'] || trade['Data'] || '';
      // Tentar converter data (formato dd/mm/aaaa hh:mm)
      let tradeDate = new Date();
      let tradeHour = 9;
      let tradeMin = 0;
      
      const dateMatch = dataStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      if (dateMatch) {
        tradeDate = new Date(`${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}T12:00:00`);
      }
      const timeMatch = dataStr.match(/(\d{2}):(\d{2})/);
      if (timeMatch) {
        tradeHour = parseInt(timeMatch[1], 10);
        tradeMin = parseInt(timeMatch[2], 10);
      }
      
      dayOfWeekMap[tradeDate.getDay()] += numericResult;

      // Heatmap Data
      const heatKey = `${tradeDate.getDay()}-${tradeHour}`;
      if (!heatmapMap[heatKey]) heatmapMap[heatKey] = 0;
      heatmapMap[heatKey] += numericResult;

      // Scatter Data
      scatterData.push({
        timeStr: timeMatch ? `${timeMatch[1]}:${timeMatch[2]}` : '12:00',
        timeNumeric: tradeHour + (tradeMin / 60),
        profit: parseFloat(numericResult.toFixed(2)),
        isWin: numericResult > 0
      });

      // Profit/Loss aggregations
      if (numericResult > 0) {
        wins++;
        grossProfit += numericResult;
        totalWinAmount += numericResult;
        currentWinStreak++;
        currentLoseStreak = 0;
        if (currentWinStreak > maxWinningStreak) maxWinningStreak = currentWinStreak;
      } else if (numericResult < 0) {
        losses++;
        grossLoss += Math.abs(numericResult);
        totalLossAmount += Math.abs(numericResult);
        currentLoseStreak++;
        currentWinStreak = 0;
        if (currentLoseStreak > maxLosingStreak) maxLosingStreak = currentLoseStreak;
      } else {
        // Break streaks on 0
        currentWinStreak = 0;
        currentLoseStreak = 0;
      }

      totalProfit += numericResult;

      // Cálculo de Drawdown (queda máxima a partir do pico)
      runningBalance += numericResult;
      if (runningBalance > peak) {
        peak = runningBalance;
      }
      const currentDrawdown = peak - runningBalance;
      if (currentDrawdown > maxDrawdown) {
        maxDrawdown = currentDrawdown;
      }
    });

    const winRate = ((wins / trades.length) * 100).toFixed(1);
    const profitFactor = grossLoss === 0 ? grossProfit : (grossProfit / grossLoss);
    const avgWin = wins === 0 ? 0 : totalWinAmount / wins;
    const avgLoss = losses === 0 ? 0 : totalLossAmount / losses;
    const payoff = avgLoss === 0 ? avgWin : (avgWin / avgLoss);

    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const dayOfWeekPerformance = [1, 2, 3, 4, 5].map(dayIdx => ({
      name: dayNames[dayIdx],
      profit: parseFloat(dayOfWeekMap[dayIdx].toFixed(2))
    })); // Only weekdays

    const assetPerformance = Object.keys(assetMap).map(key => ({
      name: key,
      profit: parseFloat(assetMap[key].toFixed(2))
    })).sort((a,b) => b.profit - a.profit);

    // Prepare Heatmap Data Format
    // Format: Array of objects { day: 1..5, hour: 9..18, profit: number }
    const heatmapData = [];
    for (let d = 1; d <= 5; d++) {
      for (let h = 9; h <= 18; h++) {
        const key = `${d}-${h}`;
        heatmapData.push({
          day: d,
          hour: h,
          profit: heatmapMap[key] || 0
        });
      }
    }

    return {
      winRate,
      totalProfit: totalProfit.toFixed(2),
      maxDrawdown: maxDrawdown.toFixed(2),
      totalTrades: trades.length,
      profitFactor: profitFactor.toFixed(2),
      payoff: payoff.toFixed(2),
      maxWinningStreak,
      maxLosingStreak,
      dayOfWeekPerformance,
      assetPerformance,
      heatmapData,
      scatterData
    };
  };

  const getDailyMetrics = (targetDateStr) => {
    // targetDateStr no formato "DD/MM/AAAA" ou parcial
    if (!trades || trades.length === 0) return null;

    const dailyTrades = trades.filter(trade => {
      const data = trade['abertura'] || trade['data'] || trade['hora'] || trade['Abertura'] || trade['Data'] || '';
      return data.includes(targetDateStr);
    });

    if (dailyTrades.length === 0) return null;

    let wins = 0;
    let totalProfit = 0;

    dailyTrades.forEach(trade => {
      const resultStr = trade['resultado líquido'] || trade['resultado liquido'] || trade['res. operação'] || trade['res operacao'] || trade['resultado'] || trade['Resultado (R$)'] || trade['Resultado Líquido'] || trade['total'] || '0';
      let numericResult = parseFloat(String(resultStr).replace(/[^\d,-]/g, '').replace(',', '.')) || 0;

      const ativo = trade['ativo'] || trade['Ativo'] || '';
      const qtdStr = trade['quantidade'] || trade['qtd'] || trade['qtd compra'] || trade['qtd venda'] || trade['Quantidade'] || '1';
      const numQtd = parseInt(String(qtdStr).replace(/[^\d]/g, '')) || 1;
      
      let custoPorPerna = 0;
      const uAtivo = ativo.toUpperCase();
      if (uAtivo.startsWith('WIN')) custoPorPerna = 0.25;
      else if (uAtivo.startsWith('WDO')) custoPorPerna = 1.00;
      else if (uAtivo.startsWith('BIT')) custoPorPerna = 0.72;

      const custo = custoPorPerna * 2 * numQtd;
      numericResult -= custo;

      if (numericResult > 0) wins++;
      totalProfit += numericResult;
    });

    const winRate = ((wins / dailyTrades.length) * 100).toFixed(1);

    return {
      winRate,
      totalProfit: totalProfit.toFixed(2),
      totalTrades: dailyTrades.length,
      isPositiveDay: totalProfit > 0,
      totalProfitRaw: totalProfit
    };
  };

  const getIAInsights = () => {
    if (!trades || trades.length === 0) {
      return { toxicHour: null, currentDrawdownAlert: null };
    }

    // 1. Calcular o Horário Tóxico
    const hourlyPnL = {};
    trades.forEach(trade => {
      const dataStr = trade['abertura'] || trade['data'] || trade['hora'] || trade['Abertura'] || trade['Data'] || '';
      
      // Tentar extrair hora (HH:mm) da string
      const timeMatch = dataStr.match(/(\d{2}):\d{2}/);
      if (timeMatch) {
        const hour = timeMatch[1];
        
        const resultStr = trade['resultado líquido'] || trade['resultado'] || trade['Resultado (R$)'] || trade['total'] || '0';
        let numericResult = parseFloat(String(resultStr).replace(/[^\d,-]/g, '').replace(',', '.')) || 0;

        const ativo = trade['ativo'] || trade['Ativo'] || '';
        const qtdStr = trade['quantidade'] || trade['qtd'] || '1';
        const numQtd = parseInt(String(qtdStr).replace(/[^\d]/g, '')) || 1;
        let custoPorPerna = 0;
        const uAtivo = ativo.toUpperCase();
        if (uAtivo.startsWith('WIN')) custoPorPerna = 0.25;
        else if (uAtivo.startsWith('WDO')) custoPorPerna = 1.00;
        else if (uAtivo.startsWith('BIT')) custoPorPerna = 0.72;
        numericResult -= (custoPorPerna * 2 * numQtd);

        if (!hourlyPnL[hour]) hourlyPnL[hour] = 0;
        hourlyPnL[hour] += numericResult;
      }
    });

    let toxicHour = null;
    let worstPnL = 0;
    Object.entries(hourlyPnL).forEach(([hour, pnl]) => {
      if (pnl < worstPnL) {
        worstPnL = pnl;
        toxicHour = { hour, pnl: pnl.toFixed(2) };
      }
    });

    // 2. Calcular Risco de Drawdown do Dia Atual
    const todayStr = new Date().toLocaleDateString('pt-BR');
    const todayMetrics = getDailyMetrics(todayStr);
    
    let currentDrawdownAlert = null;
    if (todayMetrics && todayMetrics.totalProfitRaw < 0) {
      const currentLoss = Math.abs(todayMetrics.totalProfitRaw);
      const percentage = (currentLoss / dailyDrawdownLimit) * 100;
      
      if (percentage >= 100) {
        currentDrawdownAlert = { level: 'critical', percentage, message: 'LIMITE DE DRAWDOWN ATINGIDO. Pare de operar imediatamente!' };
      } else if (percentage >= 80) {
        currentDrawdownAlert = { level: 'warning', percentage, message: `Atenção: Você atingiu ${percentage.toFixed(0)}% do seu limite de perda diária.` };
      }
    }

    return { toxicHour, currentDrawdownAlert, dailyDrawdownLimit, setDailyDrawdownLimit };
  };

  const simulateMetrics = (filters) => {
    if (!trades || trades.length === 0) return null;

    const { asset, dayOfWeek, minTime, maxTime, side, maxLoss } = filters;

    // Filter and sort chronologically for curve calculation
    const filteredTrades = [...trades].reverse().filter(trade => {
      // Filter by asset
      if (asset && asset !== 'TODOS') {
        const tAtivo = (trade['ativo'] || trade['Ativo'] || '').toUpperCase();
        if (!tAtivo.startsWith(asset)) return false;
      }

      // Filter by Side
      if (side && side !== 'TODOS') {
        const tSide = (trade['lado'] || trade['Lado'] || '').toUpperCase();
        if (side === 'COMPRA' && !tSide.includes('COMPRA') && !tSide.includes('C')) return false;
        if (side === 'VENDA' && !tSide.includes('VENDA') && !tSide.includes('V')) return false;
      }

      // Time and date parsings
      const dataStr = trade['abertura'] || trade['data'] || trade['hora'] || trade['Abertura'] || trade['Data'] || '';
      let tradeDate = new Date();
      const dateMatch = dataStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      let tradeHour = 0;
      let tradeMin = 0;
      const timeMatch = dataStr.match(/(\d{2}):(\d{2})/);

      if (dateMatch) {
        tradeDate = new Date(`${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}T12:00:00`);
      }
      if (timeMatch) {
        tradeHour = parseInt(timeMatch[1], 10);
        tradeMin = parseInt(timeMatch[2], 10);
      }

      // Filter by Day of Week
      if (dayOfWeek && dayOfWeek !== 'TODOS') {
        const dayMap = { 'DOM': 0, 'SEG': 1, 'TER': 2, 'QUA': 3, 'QUI': 4, 'SEX': 5, 'SAB': 6 };
        if (tradeDate.getDay() !== dayMap[dayOfWeek]) return false;
      }

      // Filter by Time
      const tradeTimeVal = tradeHour * 60 + tradeMin;
      if (minTime) {
        const [mH, mM] = minTime.split(':').map(Number);
        if (tradeTimeVal < (mH * 60 + mM)) return false;
      }
      if (maxTime) {
        const [mH, mM] = maxTime.split(':').map(Number);
        if (tradeTimeVal > (mH * 60 + mM)) return false;
      }

      return true;
    });

    if (filteredTrades.length === 0) return null;

    let wins = 0;
    let totalProfit = 0;
    let grossProfit = 0;
    let grossLoss = 0;
    
    let peak = 0;
    let maxDrawdown = 0;
    const equityCurve = [];
    let tradeIndex = 1;

    filteredTrades.forEach(trade => {
      const resultStr = trade['resultado líquido'] || trade['resultado'] || trade['Resultado (R$)'] || trade['total'] || '0';
      let numericResult = parseFloat(String(resultStr).replace(/[^\d,-]/g, '').replace(',', '.')) || 0;

      const tAtivo = trade['ativo'] || trade['Ativo'] || '';
      const qtdStr = trade['quantidade'] || trade['qtd'] || '1';
      const numQtd = parseInt(String(qtdStr).replace(/[^\d]/g, '')) || 1;
      
      let custoPorPerna = 0;
      const uAtivo = tAtivo.toUpperCase();
      if (uAtivo.startsWith('WIN')) custoPorPerna = 0.25;
      else if (uAtivo.startsWith('WDO')) custoPorPerna = 1.00;
      else if (uAtivo.startsWith('BIT')) custoPorPerna = 0.72;

      const custo = custoPorPerna * 2 * numQtd;
      numericResult -= custo;
      
      // Apply Max Loss Filter
      if (maxLoss && maxLoss > 0 && numericResult < -Math.abs(maxLoss)) {
        numericResult = -Math.abs(maxLoss);
      }

      if (numericResult > 0) {
        wins++;
        grossProfit += numericResult;
      } else if (numericResult < 0) {
        grossLoss += Math.abs(numericResult);
      }
      totalProfit += numericResult;
      
      if (totalProfit > peak) {
        peak = totalProfit;
      }
      const currentDrawdown = peak - totalProfit;
      if (currentDrawdown > maxDrawdown) {
        maxDrawdown = currentDrawdown;
      }

      equityCurve.push({ index: tradeIndex++, profit: parseFloat(totalProfit.toFixed(2)) });
    });

    const winRate = ((wins / filteredTrades.length) * 100).toFixed(1);
    const profitFactor = grossLoss === 0 ? grossProfit : (grossProfit / grossLoss);

    return {
      winRate,
      totalProfit: totalProfit.toFixed(2),
      profitFactor: profitFactor.toFixed(2),
      totalTrades: filteredTrades.length,
      maxDrawdown: maxDrawdown.toFixed(2),
      equityCurve
    };
  };

  const getGlobalEquityCurve = () => {
    if (!trades || trades.length === 0) return [];
    
    let totalProfit = 0;
    const equityCurve = [];
    let tradeIndex = 1;

    [...trades].reverse().forEach(trade => {
      const resultStr = trade['resultado líquido'] || trade['resultado'] || trade['Resultado (R$)'] || trade['total'] || '0';
      let numericResult = parseFloat(String(resultStr).replace(/[^\d,-]/g, '').replace(',', '.')) || 0;

      const tAtivo = trade['ativo'] || trade['Ativo'] || '';
      const qtdStr = trade['quantidade'] || trade['qtd'] || '1';
      const numQtd = parseInt(String(qtdStr).replace(/[^\d]/g, '')) || 1;
      
      let custoPorPerna = 0;
      const uAtivo = tAtivo.toUpperCase();
      if (uAtivo.startsWith('WIN')) custoPorPerna = 0.25;
      else if (uAtivo.startsWith('WDO')) custoPorPerna = 1.00;
      else if (uAtivo.startsWith('BIT')) custoPorPerna = 0.72;

      numericResult -= (custoPorPerna * 2 * numQtd);
      totalProfit += numericResult;

      equityCurve.push({ index: tradeIndex++, profit: parseFloat(totalProfit.toFixed(2)) });
    });
    
    return equityCurve;
  };

  return (
    <TradeContext.Provider value={{ 
      trades, saveTrades, clearTrades, addTrade, addTradesBulk, getMetrics, getDailyMetrics, getIAInsights, 
      reminders, addReminder, removeReminder,
      hypotheses, addHypothesis, removeHypothesis, simulateMetrics, getGlobalEquityCurve,
      disciplineStreak, lastDisciplineDate, incrementStreak, resetStreak,
      diarios, saveDiarioEntry
    }}>
      {children}
    </TradeContext.Provider>
  );
};
