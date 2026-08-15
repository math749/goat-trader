import { useState, useMemo, useCallback, useEffect } from 'react';
import { Beaker, Search, Save, Trash2, TrendingUp, Dices, Send, Settings, RefreshCcw, Activity, RefreshCw, AlertTriangle, Target } from 'lucide-react';
import { useTrades } from '../contexts/TradeContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const Laboratorio = () => {
  const { hypotheses, addHypothesis, removeHypothesis, simulateMetrics, getMetrics, getGlobalEquityCurve, addReminder, trades } = useTrades();
  const globalMetrics = getMetrics();
  const globalEquityCurve = getGlobalEquityCurve();

  // ── BACKTEST MT5 & ROBÔ ANALYTICS ─────────────────────
  const [quantTicker, setQuantTicker] = useState('WINQ26');
  const [minConfluenceScore, setMinConfluenceScore] = useState(7);
  const [robotPerf, setRobotPerf] = useState(null);
  const [backtestLoading, setBacktestLoading] = useState(false);
  const [backtestResult, setBacktestResult] = useState(null);

  const fetchRobotPerformance = useCallback(async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/auto-trader/performance');
      if (res.ok) {
        const data = await res.json();
        setRobotPerf(data);
      }
    } catch (e) {
      console.warn('Erro ao buscar performance do robô:', e);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(fetchRobotPerformance, 0);
    const interval = setInterval(fetchRobotPerformance, 6000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [fetchRobotPerformance]);

  const handleRunBacktest = async () => {
    setBacktestLoading(true);
    setBacktestResult(null);
    try {
      const res = await fetch('http://127.0.0.1:8000/quant/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: quantTicker,
          min_score: minConfluenceScore,
          risk_brl: 100.0,
          period_days: 30
        })
      });
      if (res.ok) {
        const data = await res.json();
        setBacktestResult(data);
      }
    } catch (e) {
      console.error('Erro no Backtest:', e);
    } finally {
      setBacktestLoading(false);
    }
  };

  const [filters, setFilters] = useState({
    asset: 'TODOS',
    side: 'TODOS',
    dayOfWeek: 'TODOS',
    minTime: '',
    maxTime: '',
    maxLoss: ''
  });

  const [hypoTitle, setHypoTitle] = useState('');

  // Monte Carlo State
  const [monteCarloResult, setMonteCarloResult] = useState(null);
  const [isSimulatingMC, setIsSimulatingMC] = useState(false);

  // Walk-Forward Analysis State
  const [wfConfig, setWfConfig] = useState({
    trainWindowDays: 180,  // 6 months
    testWindowDays: 30,    // 1 month
    stepDays: 30,          // monthly roll
    paramsToOptimize: [
      { name: 'minTime', type: 'time', min: '09:00', max: '11:00', step: '01:00' },
      { name: 'maxTime', type: 'time', min: '14:00', max: '16:00', step: '01:00' },
      { name: 'maxLoss', type: 'number', min: 100, max: 1000, step: 50 }
    ],
    optimizationMetric: 'profitFactor'
  });
  const [wfResults, setWfResults] = useState(null);
  const [isRunningWF, setIsRunningWF] = useState(false);
  const [wfError, setWfError] = useState('');

  // Auto-simulate whenever filters change
  const simulatedResult = useMemo(() => {
    return simulateMetrics(filters);
  }, [filters, simulateMetrics]);

  const combinedCurve = useMemo(() => {
    if (simulatedResult && simulatedResult.equityCurve && globalEquityCurve) {
      const maxLen = Math.max(simulatedResult.equityCurve.length, globalEquityCurve.length);
      const combined = [];
      for (let i = 0; i < maxLen; i++) {
        combined.push({
          index: i + 1,
          'Global': globalEquityCurve[i] ? globalEquityCurve[i].profit : (globalEquityCurve.length > 0 ? globalEquityCurve[globalEquityCurve.length - 1].profit : 0),
          'Simulação': simulatedResult.equityCurve[i] ? simulatedResult.equityCurve[i].profit : (simulatedResult.equityCurve.length > 0 ? simulatedResult.equityCurve[simulatedResult.equityCurve.length - 1].profit : 0)
        });
      }
      return combined;
    }
    return [];
  }, [simulatedResult, globalEquityCurve]);

  // Helper: Parse trade timestamp
  const parseTradeTimestamp = useCallback((trade) => {
    const dataStr = trade['abertura'] || trade['data'] || trade['hora'] || trade['Abertura'] || trade['Data'] || '';
    const dateMatch = dataStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    const timeMatch = dataStr.match(/(\d{2}):(\d{2})/);

    if (!dateMatch) return null;

    let date = new Date(`${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`);
    if (timeMatch) {
      date.setHours(parseInt(timeMatch[1], 10));
      date.setMinutes(parseInt(timeMatch[2], 10));
    }
    return date;
  }, []);

  // Helper: Get sorted trades by timestamp
  const getSortedTrades = useCallback(() => {
    const validTrades = trades
      .map(trade => ({
        ...trade,
        timestamp: parseTradeTimestamp(trade)
      }))
      .filter(trade => trade.timestamp !== null)
      .sort((a, b) => a.timestamp - b.timestamp);

    return validTrades;
  }, [trades, parseTradeTimestamp]);

  // Helper: Simulate trades with given filters (extracted from simulateMetrics logic for direct use)
  const simulateTradesWithFilters = useCallback((tradesToSimulate, filterParams) => {
    if (!tradesToSimulate || tradesToSimulate.length === 0) return null;

    const { asset, dayOfWeek, minTime, maxTime, side, maxLoss } = filterParams;

    // Filter and sort chronologically for curve calculation
    const filteredTrades = [...tradesToSimulate].filter(trade => {
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
  }, []);

  // Helper: Generate parameter grid for optimization
  const generateParameterGrid = useCallback((paramsToOptimize) => {
    const grids = paramsToOptimize.map(param => {
      const values = [];
      if (param.type === 'time') {
        const [startH, startM] = param.min.split(':').map(Number);
        const [endH, endM] = param.max.split(':').map(Number);
        const startMin = startH * 60 + startM;
        const endMin = endH * 60 + endM;
        const stepMin = parseInt(param.step.split(':')[0]) * 60 + parseInt(param.step.split(':')[1] || '0');

        for (let minutes = startMin; minutes <= endMin; minutes += stepMin) {
          const hours = Math.floor(minutes / 60);
          const mins = minutes % 60;
          values.push(`${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`);
        }
      } else if (param.type === 'number') {
        for (let value = param.min; value <= param.max; value += param.step) {
          values.push(value);
        }
      }
      return values;
    });

    // Generate all combinations (cartesian product)
    const result = [];
    const recursivelyCombine = (index, current) => {
      if (index === grids.length) {
        result.push([...current]);
        return;
      }
      for (const value of grids[index]) {
        current[index] = value;
        recursivelyCombine(index + 1, current);
      }
    };
    recursivelyCombine(0, new Array(grids.length));

    // Convert to parameter objects
    return result.map(combination => {
      const params = {};
      paramsToOptimize.forEach((param, i) => {
        params[param.name] = combination[i];
      });
      return params;
    });
  }, []);

  // Helper: Calculate stability metrics from walk-forward results
  const calculateStabilityMetrics = useCallback((results) => {
    if (!results || results.length === 0) return {};

    const testReturns = results.map(r => ({
      profitFactor: parseFloat(r.testResult.profitFactor),
      winRate: parseFloat(r.testResult.winRate),
      totalProfit: parseFloat(r.testResult.totalProfit),
      maxDrawdown: parseFloat(r.testResult.maxDrawdown),
      sharpe: parseFloat(r.testResult.profitFactor) / Math.max(parseFloat(r.testResult.maxDrawdown), 0.1) // Simplified Sharpe
    }));

    // Calculate consistency metrics
    const profitFactors = testReturns.map(r => r.profitFactor);
    const winRates = testReturns.map(r => r.winRate);
    const totalProfits = testReturns.map(r => r.totalProfit);

    const meanPF = profitFactors.reduce((a, b) => a + b, 0) / profitFactors.length;
    const meanWR = winRates.reduce((a, b) => a + b, 0) / winRates.length;
    const meanTP = totalProfits.reduce((a, b) => a + b, 0) / totalProfits.length;

    // Standard deviation
    const stdPF = Math.sqrt(profitFactors.reduce((sum, val) => sum + Math.pow(val - meanPF, 2), 0) / profitFactors.length);
    const stdWR = Math.sqrt(winRates.reduce((sum, val) => sum + Math.pow(val - meanWR, 2), 0) / winRates.length);
    const stdTP = Math.sqrt(totalProfits.reduce((sum, val) => sum + Math.pow(val - meanTP, 2), 0) / totalProfits.length);

    // Consistency score (lower std/mean = more consistent)
    const consistencyPF = meanPF !== 0 ? 1 - (stdPF / Math.abs(meanPF)) : 0;
    const consistencyWR = meanWR !== 0 ? 1 - (stdWR / Math.abs(meanWR)) : 0;
    const consistencyTP = meanTP !== 0 ? 1 - (stdTP / Math.abs(meanTP)) : 0;

    // Percentage of windows with positive results
    const positiveWindows = testReturns.filter(r => r.totalProfit > 0).length;
    const winRateWindows = (positiveWindows / testReturns.length) * 100;

    return {
      meanProfitFactor: meanPF.toFixed(2),
      meanWinRate: meanWR.toFixed(2),
      meanTotalProfit: meanTP.toFixed(2),
      stdProfitFactor: stdPF.toFixed(2),
      stdWinRate: stdWR.toFixed(2),
      stdTotalProfit: stdTP.toFixed(2),
      consistencyProfitFactor: Math.max(0, consistencyPF).toFixed(2),
      consistencyWinRate: Math.max(0, consistencyWR).toFixed(2),
      consistencyTotalProfit: Math.max(0, consistencyTP).toFixed(2),
      winRateWindows: winRateWindows.toFixed(1),
      totalWindows: testReturns.length
    };
  }, []);

  // Main walk-forward analysis function
  const runWalkForwardAnalysis = useCallback(async () => {
    setWfError('');
    setIsRunningWF(true);

    try {
      const sortedTrades = getSortedTrades();
      if (sortedTrades.length < 10) {
        throw new Error("Dados insuficientes para análise walk-forward (mínimo 10 trades)");
      }

      const { trainWindowDays, testWindowDays, stepDays } = wfConfig;
      const trainWindowMs = trainWindowDays * 24 * 60 * 60 * 1000;
      const testWindowMs = testWindowDays * 24 * 60 * 60 * 1000;
      const stepMs = stepDays * 24 * 60 * 60 * 1000;

      const results = [];
      let currentStart = sortedTrades[0].timestamp.getTime();
      const endTime = sortedTrades[sortedTrades.length - 1].timestamp.getTime();

      // Generate parameter grid for optimization
      const paramGrid = generateParameterGrid(wfConfig.paramsToOptimize);

      while (currentStart + trainWindowMs + testWindowMs <= endTime) {
        const trainEnd = new Date(currentStart + trainWindowMs);
        const testEnd = new Date(currentStart + trainWindowMs + testWindowMs);

        // Split trades
        const trainTrades = sortedTrades.filter(t =>
          t.timestamp >= new Date(currentStart) && t.timestamp < trainEnd
        );
        const testTrades = sortedTrades.filter(t =>
          t.timestamp >= trainEnd && t.timestamp < testEnd
        );

        if (trainTrades.length < 5 || testTrades.length < 5) {
          currentStart += stepMs;
          continue;
        }

        // Optimize on trainTrades (grid search)
        let bestParams = null;
        let bestScore = -Infinity;
        let bestTrainResult = null;

        for (const params of paramGrid) {
          const trainResult = simulateTradesWithFilters(trainTrades, params);
          if (!trainResult) continue;

          let score = 0;
          switch (wfConfig.optimizationMetric) {
            case 'profitFactor':
              score = parseFloat(trainResult.profitFactor);
              break;
            case 'winRate':
              score = parseFloat(trainResult.winRate);
              break;
            case 'totalProfit':
              score = parseFloat(trainResult.totalProfit);
              break;
            case 'sharpeApprox': {
              const pf = parseFloat(trainResult.profitFactor);
              const dd = Math.max(parseFloat(trainResult.maxDrawdown), 0.1);
              score = pf / dd;
              break;
            }
            default:
              score = parseFloat(trainResult.profitFactor);
          }

          if (score > bestScore) {
            bestScore = score;
            bestParams = params;
            bestTrainResult = trainResult;
          }
        }

        if (!bestParams) {
          currentStart += stepMs;
          continue;
        }

        // Test on testTrades with bestParams
        const testResult = simulateTradesWithFilters(testTrades, bestParams);
        if (!testResult) {
          currentStart += stepMs;
          continue;
        }

        results.push({
          window: {
            train: { start: new Date(currentStart), end: trainEnd },
            test: { start: trainEnd, end: testEnd }
          },
          bestParams,
          trainResult: bestTrainResult, // Use the already calculated result
          testResult
        });

        currentStart += stepMs;
      }

      if (results.length === 0) {
        throw new Error('Nenhuma janela válida encontrada com os parâmetros configurados');
      }

      // Calculate stability metrics
      const stabilityMetrics = calculateStabilityMetrics(results);

      setWfResults({ results, stabilityMetrics });
    } catch (error) {
      console.error('Walk-forward analysis failed:', error);
      setWfError(error.message);
    } finally {
      setIsRunningWF(false);
    }
  }, [getSortedTrades, simulateTradesWithFilters, generateParameterGrid, calculateStabilityMetrics, wfConfig]);

  // Handle filter change (existing)
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setMonteCarloResult(null); // Reset MC on filter change
  };

  // Handle save hypothesis (existing)
  const handleSave = () => {
    if (!hypoTitle.trim() || !simulatedResult) return;
    addHypothesis({
      title: hypoTitle,
      filters: { ...filters },
      metrics: { ...simulatedResult }
    });
    setHypoTitle('');
  };

  // Handle export rule (existing)
  const handleExportRule = (hyp) => {
    const { title, filters } = hyp;
    let ruleText = `🚨 **REGRA INQUEBRÁVEL (${title})**\\nVocê foi instruído a respeitar este setup matemático:\\n`;
    if (filters.asset !== 'TODOS') ruleText += `- **Ativo:** Somente ${filters.asset}\\n`;
    if (filters.side !== 'TODOS') ruleText += `- **Lado:** Somente ${filters.side}\\n`;
    if (filters.dayOfWeek !== 'TODOS') ruleText += `- **Dia:** Somente ${filters.dayOfWeek}\\n`;
    if (filters.minTime || filters.maxTime) ruleText += `- **Horário:** Das ${filters.minTime || 'abertura'} às ${filters.maxTime || 'fechamento'}\\n`;
    if (filters.maxLoss) ruleText += `- **Stop Máximo:** R$ ${filters.maxLoss}\\n`;

    ruleText += `\\n*Se você violar essa regra, estará traindo a sua própria estatística.*`;

    addReminder(ruleText);
    alert('Regra Inquebrável exportada para a GOAT IA com sucesso!');
  };

  // Handle Monte Carlo (existing)
  const runMonteCarlo = () => {
    if (!simulatedResult || !simulatedResult.equityCurve || simulatedResult.equityCurve.length === 0) return;

    setIsSimulatingMC(true);

    setTimeout(() => {
      // Extrair apenas os lucros/prejuízos diários do resultado simulado
      const profits = simulatedResult.equityCurve.map((point, index, arr) => {
        if (index === 0) return point.profit;
        return point.profit - arr[index-1].profit;
      });

      const NUM_SIMULATIONS = 1000;
      const drawdowns = [];
      let ruinCount = 0;
      const RUIN_THRESHOLD = -1000; // Risco de ruína: bater R$ -1000 de saldo acumulado em uma simulação

      for (let i = 0; i < NUM_SIMULATIONS; i++) {
        // Fisher-Yates shuffle
        const shuffled = [...profits];
        for (let j = shuffled.length - 1; j > 0; j--) {
          const k = Math.floor(Math.random() * (j + 1));
          [shuffled[j], shuffled[k]] = [shuffled[k], shuffled[j]];
        }

        let peak = 0;
        let maxDrawdown = 0;
        let currentEquity = 0;
        let ruined = false;

        for (let p of shuffled) {
          currentEquity += p;
          if (currentEquity > peak) {
            peak = currentEquity;
          }
          const currentDrawdown = peak - currentEquity;
          if (currentDrawdown > maxDrawdown) {
            maxDrawdown = currentDrawdown;
          }
          if (currentEquity <= RUIN_THRESHOLD) {
            ruined = true;
          }
        }
        drawdowns.push(maxDrawdown);
        if (ruined) ruinCount++;
      }

      drawdowns.sort((a, b) => a - b);
      const worstCaseDrawdown = drawdowns[Math.floor(NUM_SIMULATIONS * 0.95)]; // 95th percentile
      const riskOfRuin = ((ruinCount / NUM_SIMULATIONS) * 100).toFixed(1);

      setMonteCarloResult({ worstCaseDrawdown: worstCaseDrawdown.toFixed(2), riskOfRuin });
      setIsSimulatingMC(false);
    }, 500); // Simulando delay de processamento
  };

  return (
    <div style={{ paddingBottom: '2rem' }}>
      <div className="page-header">
        <h2><Beaker size={28} color="var(--primary-accent)" /> Laboratório Quant (Simulador & MT5 Analytics)</h2>
        <p>Valide setups com Backtest de 30 Dias na B3 e monitore a performance das execuções reais no MetaTrader 5.</p>
      </div>

      {/* ============================================================ */}
      {/* PAINEL DE BACKTEST DE ESTRATÉGIAS & PERFORMANCE DO ROBÔ MT5  */}
      {/* ============================================================ */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
          {/* Bloco 1: Simulador de Backtest Histórico */}
          <div className="card" style={{ borderLeft: '4px solid #8b5cf6', backgroundColor: 'rgba(15, 23, 42, 0.85)' }}>
            <h3 style={{ fontSize: '1.05rem', color: '#a78bfa', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={18} /> Simulador de Backtest (30 Dias B3)
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: '1.4' }}>
              Execute a estratégia de confluência barra-a-barra nos últimos 30 dias de negociação da B3 para validar parâmetros antes de ligar o robô.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>ATIVO</span>
                <input
                  type="text"
                  value={quantTicker}
                  onChange={(e) => setQuantTicker(e.target.value.toUpperCase())}
                  style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', backgroundColor: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.85rem' }}
                />
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>SCORE MÍNIMO</span>
                <select
                  value={minConfluenceScore}
                  onChange={(e) => setMinConfluenceScore(Number(e.target.value))}
                  style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', backgroundColor: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.85rem' }}
                >
                  <option value={6}>≥ 6 / 10 (Moderado)</option>
                  <option value={7}>≥ 7 / 10 (Conservador)</option>
                  <option value={8}>≥ 8 / 10 (Ultra Rígido)</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleRunBacktest}
              disabled={backtestLoading}
              style={{
                width: '100%',
                padding: '0.65rem',
                borderRadius: '8px',
                backgroundColor: '#7c3aed',
                color: 'white',
                fontWeight: 'bold',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 15px rgba(124, 58, 237, 0.3)'
              }}
            >
              {backtestLoading ? <RefreshCw className="spin-slow" size={16} /> : <Activity size={16} />}
              {backtestLoading ? 'Processando Velas B3...' : '🧪 SIMULAR BACKTEST 30 DIAS B3'}
            </button>

            {/* Resultado do Backtest em Cards */}
            {backtestResult && (
              <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                  <div style={{ backgroundColor: 'rgba(0,0,0,0.4)', padding: '0.6rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block' }}>WIN RATE</span>
                    <strong style={{ fontSize: '1.1rem', color: '#10b981' }}>{backtestResult.win_rate}%</strong>
                  </div>
                  <div style={{ backgroundColor: 'rgba(0,0,0,0.4)', padding: '0.6rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block' }}>PROFIT FACTOR</span>
                    <strong style={{ fontSize: '1.1rem', color: '#3b82f6' }}>{backtestResult.profit_factor}x</strong>
                  </div>
                  <div style={{ backgroundColor: 'rgba(0,0,0,0.4)', padding: '0.6rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block' }}>DRAWDOWN</span>
                    <strong style={{ fontSize: '1.1rem', color: '#ef4444' }}>-R$ {backtestResult.max_drawdown}</strong>
                  </div>
                </div>

                <div style={{ backgroundColor: 'rgba(0,0,0,0.4)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Operações Simuladas:</span>
                  <strong style={{ color: 'white' }}>{backtestResult.total_trades} trades ({backtestResult.wins_count}W / {backtestResult.losses_count}L)</strong>
                </div>
              </div>
            )}
          </div>

          {/* Bloco 2: Analytics do Robô MT5 em Tempo Real */}
          <div className="card" style={{ borderLeft: '4px solid #10b981', backgroundColor: 'rgba(15, 23, 42, 0.85)' }}>
            <h3 style={{ fontSize: '1.05rem', color: '#10b981', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={18} /> Performance Real do Robô (MetaTrader 5)
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: '1.4' }}>
              Estatísticas computadas diretamente do histórico de ordens (deals) fechados na sua conta Clear Investimentos no MT5.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ backgroundColor: 'rgba(0,0,0,0.4)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>TAXA DE ACERTO REAL</span>
                <strong style={{ fontSize: '1.4rem', color: '#10b981' }}>{robotPerf ? `${robotPerf.win_rate}%` : '0.0%'}</strong>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
                  {robotPerf ? `${robotPerf.wins_count}W / ${robotPerf.losses_count}L` : '0 trades'}
                </span>
              </div>

              <div style={{ backgroundColor: 'rgba(0,0,0,0.4)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>PAYOFF MÉDIO</span>
                <strong style={{ fontSize: '1.4rem', color: '#3b82f6' }}>{robotPerf ? `${robotPerf.payoff}x` : '0.0x'}</strong>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>Risco / Retorno Real</span>
              </div>
            </div>

            <div style={{ backgroundColor: 'rgba(0,0,0,0.4)', padding: '0.85rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Fator de Lucro MT5:</span>
                <strong style={{ color: robotPerf && robotPerf.profit_factor >= 1.5 ? '#10b981' : '#f59e0b' }}>
                  {robotPerf ? `${robotPerf.profit_factor}x` : '1.0x'}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Resultado Acumulado (R$):</span>
                <strong style={{ color: robotPerf && robotPerf.net_pnl >= 0 ? '#10b981' : '#ef4444' }}>
                  {robotPerf ? `R$ ${robotPerf.net_pnl}` : 'R$ 0,00'}
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: 'start', gridTemplateColumns: '1fr 2fr' }}>
        {/* Panel 1: Setup Filters */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontSize: '1.1rem' }}>
            <Search size={18} color="var(--primary-accent)" /> 1. Parâmetros
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
            Aplique filtros para visualizar a curva de capital simulada.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginTop: '0.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Lado da Operação</label>
              <select name="side" value={filters.side} onChange={handleFilterChange} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', backgroundColor: 'var(--bg-dark)', color: 'var(--text-main)', border: '1px solid var(--border-subtle)' }}>
                <option value="TODOS">Compras e Vendas</option>
                <option value="COMPRA">Somente Compras</option>
                <option value="VENDA">Somente Vendas</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Ativo</label>
              <select name="asset" value={filters.asset} onChange={handleFilterChange} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', backgroundColor: 'var(--bg-dark)', color: 'var(--text-main)', border: '1px solid var(--border-subtle)' }}>
                <option value="TODOS">Todos</option>
                <option value="WIN">Índice (WIN)</option>
                <option value="WDO">Dólar (WDO)</option>
                <option value="BIT">Bitcoin (BIT)</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Dia da Semana</label>
              <select name="dayOfWeek" value={filters.dayOfWeek} onChange={handleFilterChange} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', backgroundColor: 'var(--bg-dark)', color: 'var(--text-main)', border: '1px solid var(--border-subtle)' }}>
                <option value="TODOS">Todos os Dias</option>
                <option value="SEG">Segunda-feira</option>
                <option value="TER">Terça-feira</option>
                <option value="QUA">Quarta-feira</option>
                <option value="QUI">Quinta-feira</option>
                <option value="SEX">Sexta-feira</option>
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Horário Mínimo</label>
                <input type="time" name="minTime" value={filters.minTime} onChange={handleFilterChange} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', backgroundColor: 'var(--bg-dark)', color: 'var(--text-main)', border: '1px solid var(--border-subtle)' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Horário Máximo</label>
                <input type="time" name="maxTime" value={filters.maxTime} onChange={handleFilterChange} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', backgroundColor: 'var(--bg-dark)', color: 'var(--text-main)', border: '1px solid var(--border-subtle)' }} />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Limite de Perda Máxima p/ Trade (R$)</label>
              <input type="number" placeholder="Ex: 500" name="maxLoss" value={filters.maxLoss} onChange={handleFilterChange} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', backgroundColor: 'var(--bg-dark)', color: 'var(--text-main)', border: '1px solid var(--border-subtle)' }} />
            </div>
          </div>
        </div>

        {/* Panel 2: Results & Save */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={18} color="var(--primary-accent)" /> 2. Resultado da Simulação
            </h3>
            {simulatedResult && simulatedResult.equityCurve && simulatedResult.equityCurve.length > 0 && (
              <button
                onClick={runMonteCarlo}
                disabled={isSimulatingMC}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  backgroundColor: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)',
                  border: '1px solid rgba(245, 158, 11, 0.3)', padding: '6px 12px',
                  borderRadius: '4px', cursor: isSimulatingMC ? 'wait' : 'pointer', fontSize: '0.8rem', fontWeight: 'bold'
                }}>
                <Dices size={16} /> {isSimulatingMC ? 'Simulando 1000 cenários...' : 'Teste de Estresse (Monte Carlo)'}
              </button>
            )}
          </div>

          {simulatedResult ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', borderLeft: '3px solid var(--success)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Resultado</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: simulatedResult.totalProfit >= 0 ? 'var(--success)' : 'var(--danger)' }}>R$ {simulatedResult.totalProfit}</div>
                </div>
                <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', borderLeft: '3px solid var(--primary-accent)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Win Rate</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{simulatedResult.winRate}%</div>
                </div>
                <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', borderLeft: '3px solid #8b5cf6' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Fator Lucro</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{simulatedResult.profitFactor}</div>
                </div>
                <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', borderLeft: '3px solid var(--danger)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Max Drawdown</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--danger)' }}>R$ {simulatedResult.maxDrawdown}</div>
                </div>
              </div>

              {/* Monte Carlo Results */}
              {monteCarloResult && (
                <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.05)', border: '1px dashed var(--warning)', padding: '1rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Dices size={18} /> Resultados de Monte Carlo (1.000 shuffles)
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Testando sua estratégia contra o caos puro.</p>
                  </div>
                  <div style={{ display: 'flex', gap: '1.5rem', textAlign: 'right' }}>
                     <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Pior Drawdown (95%)</span>
                        <strong style={{ color: 'var(--danger)', fontSize: '1.1rem' }}>R$ {monteCarloResult.worstCaseDrawdown}</strong>
                     </div>
                     <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Risco de Ruína (Bater -R$1k)</span>
                        <strong style={{ color: Number(monteCarloResult.riskOfRuin) > 20 ? 'var(--danger)' : 'var(--success)', fontSize: '1.1rem' }}>{monteCarloResult.riskOfRuin}%</strong>
                     </div>
                  </div>
                </div>
              )}

              {/* Chart */}
              <div style={{ height: '300px', width: '100%', backgroundColor: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                 <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={combinedCurve}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="index" stroke="var(--text-muted)" tick={{fontSize: 12}} />
                    <YAxis stroke="var(--text-muted)" tick={{fontSize: 12}} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid var(--border-subtle)', borderRadius: '8px', color: 'white' }}
                      itemStyle={{ color: 'white' }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="Global" stroke="rgba(255,255,255,0.3)" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Simulação" stroke="var(--primary-accent)" strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                A simulação obteve <strong>{simulatedResult.totalTrades} trades</strong>, comparado ao seu global que gerou <strong>R$ {globalMetrics.totalProfit}</strong> com WR de <strong>{globalMetrics.winRate}%</strong>.
              </p>

              <hr style={{ borderColor: 'var(--border-subtle)', borderStyle: 'solid', margin: '0' }}/>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <input
                  type="text"
                  placeholder="Nome do Setup / Hipótese (Ex: Trade Só Compra Dólar Manhã)"
                  value={hypoTitle}
                  onChange={(e) => setHypoTitle(e.target.value)}
                  style={{ flex: 1, padding: '0.8rem', borderRadius: '8px', backgroundColor: 'var(--bg-dark)', color: 'var(--text-main)', border: '1px solid var(--border-subtle)' }}
                />
                <button className="btn-primary" onClick={handleSave} disabled={!hypoTitle.trim()} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Save size={18} /> Salvar Estratégia
                </button>
              </div>
            </div>
          ) : (
            <div style={{ padding: '3rem', textAlign: 'center', opacity: 0.5 }}>
              <TrendingUp size={48} style={{ marginBottom: '1rem' }} />
              <p style={{ color: 'var(--text-main)', fontSize: '1rem', margin: 0 }}>
                Nenhum trade encontrado com esses parâmetros.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Panel 3: Saved Hypotheses */}
      <div style={{ marginTop: '3rem' }}>
        <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Beaker size={20} color="var(--success)"/> Banco de Estratégias Salvas
        </h3>

        {hypotheses.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', borderStyle: 'dashed', backgroundColor: 'transparent' }}>
            Você ainda não salvou nenhuma estratégia. Use o simulador acima e valide seus setups.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {hypotheses.map(hyp => (
              <div key={hyp.id} className="card" style={{ position: 'relative', borderTop: '3px solid var(--primary-accent)', background: 'linear-gradient(135deg, rgba(30,41,59,0.5) 0%, rgba(15,23,42,0.8) 100%)' }}>
                <button
                  onClick={() => removeHypothesis(hyp.id)}
                  style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', opacity: 0.7 }}>
                  <Trash2 size={18} />
                </button>
                <h4 style={{ margin: '0 0 0.5rem 0', paddingRight: '2rem', color: 'white' }}>{hyp.title}</h4>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                  {hyp.filters.side && hyp.filters.side !== 'TODOS' && <span style={{ fontSize: '0.7rem', backgroundColor: 'rgba(59, 130, 246, 0.2)', color: 'var(--primary-accent)', padding: '2px 8px', borderRadius: '4px' }}>Lado: {hyp.filters.side}</span>}
                  {hyp.filters.asset !== 'TODOS' && <span style={{ fontSize: '0.7rem', backgroundColor: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '4px' }}>Ativo: {hyp.filters.asset}</span>}
                  {hyp.filters.dayOfWeek !== 'TODOS' && <span style={{ fontSize: '0.7rem', backgroundColor: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '4px' }}>Dia: {hyp.filters.dayOfWeek}</span>}
                  {(hyp.filters.minTime || hyp.filters.maxTime) && <span style={{ fontSize: '0.7rem', backgroundColor: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '4px' }}>{hyp.filters.minTime || 'Aber'} - {hyp.filters.maxTime || 'Fim'}</span>}
                  {hyp.filters.maxLoss && <span style={{ fontSize: '0.7rem', backgroundColor: 'rgba(239, 68, 68, 0.2)', color: 'var(--danger)', padding: '2px 8px', borderRadius: '4px' }}>Stop: R${hyp.filters.maxLoss}</span>}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: 'rgba(0,0,0,0.4)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Win Rate</span>
                    <strong style={{ color: 'var(--success)' }}>{hyp.metrics.winRate}%</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Drawdown</span>
                    <strong style={{ color: 'var(--danger)' }}>R$ {hyp.metrics.maxDrawdown || 0}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Total</span>
                    <strong style={{ color: hyp.metrics.totalProfit >= 0 ? 'var(--success)' : 'var(--danger)' }}>R$ {hyp.metrics.totalProfit}</strong>
                  </div>
                </div>

                <button
                  onClick={() => handleExportRule(hyp)}
                  style={{
                    width: '100%', padding: '0.6rem', borderRadius: '6px',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)', border: '1px solid var(--primary-accent)',
                    color: 'var(--primary-accent)', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem',
                    transition: 'all 0.2s', fontSize: '0.85rem', fontWeight: 'bold'
                  }}
                  onMouseOver={(e) => { e.target.style.backgroundColor = 'rgba(99, 102, 241, 0.2)' }}
                  onMouseOut={(e) => { e.target.style.backgroundColor = 'rgba(99, 102, 241, 0.1)' }}
                >
                  <Send size={16} /> Exportar como Regra GOAT IA
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Panel 4: Walk-Forward Analysis */}
      <div style={{ marginTop: '3rem' }}>
        <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Settings size={20} color="var(--primary-accent)" /> Análise Walk-Forward Avançada
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Otimize parâmetros em amostras históricas e valide em dados fora da amostra para testar robustez.
        </p>

        {wfError && (
          <div className="card" style={{ borderLeft: '4px solid var(--danger)', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: '4px', marginBottom: '1.5rem' }}>
            <p style={{ color: 'var(--danger)', margin: 0, fontSize: '0.9rem' }}>
              <AlertTriangle size={16} color="var(--danger)" /> {wfError}
            </p>
          </div>
        )}

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Walk-Forward Configuration */}
          <div style={{ borderLeft: '4px solid var(--primary-accent)', backgroundColor: 'rgba(30,41,59,0.3)', padding: '1.5rem', borderRadius: '8px' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'white' }}>
              <RefreshCcw size={16} color="var(--primary-accent)" /> Configuração da Análise
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Janela de Treino (dias)</label>
                <input
                  type="number"
                  value={wfConfig.trainWindowDays}
                  onChange={(e) => setWfConfig(prev => ({ ...prev, trainWindowDays: Math.max(30, parseInt(e.target.value) || 30) }))}
                  min="30"
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', backgroundColor: 'var(--bg-dark)', color: 'var(--text-main)', border: '1px solid var(--border-subtle)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Janela de Teste (dias)</label>
                <input
                  type="number"
                  value={wfConfig.testWindowDays}
                  onChange={(e) => setWfConfig(prev => ({ ...prev, testWindowDays: Math.max(15, parseInt(e.target.value) || 15) }))}
                  min="15"
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', backgroundColor: 'var(--bg-dark)', color: 'var(--text-main)', border: '1px solid var(--border-subtle)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Passo (dias)</label>
                <input
                  type="number"
                  value={wfConfig.stepDays}
                  onChange={(e) => setWfConfig(prev => ({ ...prev, stepDays: Math.max(15, parseInt(e.target.value) || 15) }))}
                  min="15"
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', backgroundColor: 'var(--bg-dark)', color: 'var(--text-main)', border: '1px solid var(--border-subtle)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Métrica de Otimização</label>
                <select
                  value={wfConfig.optimizationMetric}
                  onChange={(e) => setWfConfig(prev => ({ ...prev, optimizationMetric: e.target.value }))}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', backgroundColor: 'var(--bg-dark)', color: 'var(--text-main)', border: '1px solid var(--border-subtle)' }}
                >
                  <option value="profitFactor">Fator de Lucro</option>
                  <option value="winRate">Taxa de Acerto</option>
                  <option value="totalProfit">Lucro Total</option>
                  <option value="sharpeApprox">Sharpe Aproximado</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px dashed var(--border-subtle)' }}>
              <button
                onClick={runWalkForwardAnalysis}
                disabled={isRunningWF}
                style={{
                  width: '100%', padding: '0.75rem', borderRadius: '6px',
                  backgroundColor: 'rgba(99, 102, 241, 0.1)', border: '1px solid var(--primary-accent)',
                  color: 'var(--primary-accent)', cursor: isRunningWF ? 'not-allowed' : 'pointer',
                  display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem',
                  transition: 'all 0.2s', fontSize: '0.9rem', fontWeight: 'bold'
                }}
              >
                {isRunningWF ? (
                  <>
                    <RefreshCcw size={18} color="white" className="animate-spin" />
                    Analisando...
                  </>
                ) : (
                  <>
                    <RefreshCcw size={18} color="white" />
                    Iniciar Análise Walk-Forward
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Walk-Forward Results */}
          {wfResults && (
            <div style={{ borderLeft: '4px solid var(--success)', backgroundColor: 'rgba(34,197,94,0.05)', padding: '1.5rem', borderRadius: '8px' }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'white' }}>
                <TrendingUp size={16} color="var(--success)" /> Resultados da Análise
              </h4>

              {/* Stability Metrics */}
              <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '6px', marginBottom: '1.5rem' }}>
                <h5 style={{ margin: '0 0 0.75rem 0', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Target size={14} color="var(--success)" /> Métricas de Estabilidade
                </h5>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Fator Lucro Médio</span>
                    <strong style={{ fontSize: '1.1rem', color:
                      parseFloat(wfResults.stabilityMetrics.meanProfitFactor) > 1.2 ? 'var(--success)' :
                      parseFloat(wfResults.stabilityMetrics.meanProfitFactor) > 1.0 ? 'var(--warning)' : 'var(--danger)'
                    }}>{wfResults.stabilityMetrics.meanProfitFactor}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Win Rate Médio</span>
                    <strong style={{ fontSize: '1.1rem', color:
                      parseFloat(wfResults.stabilityMetrics.meanWinRate) > 55 ? 'var(--success)' :
                      parseFloat(wfResults.stabilityMetrics.meanWinRate) > 45 ? 'var(--warning)' : 'var(--danger)'
                    }}>{wfResults.stabilityMetrics.meanWinRate}%</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Lucro Total Médio</span>
                    <strong style={{ fontSize: '1.1rem', color:
                      parseFloat(wfResults.stabilityMetrics.meanTotalProfit) > 0 ? 'var(--success)' : 'var(--danger)'
                    }}>{wfResults.stabilityMetrics.meanTotalProfit}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Janelas Lucrativas</span>
                    <strong style={{ fontSize: '1.1rem', color:
                      parseFloat(wfResults.stabilityMetrics.winRateWindows) > 60 ? 'var(--success)' :
                      parseFloat(wfResults.stabilityMetrics.winRateWindows) > 40 ? 'var(--warning)' : 'var(--danger)'
                    }}>{wfResults.stabilityMetrics.winRateWindows}% ({wfResults.stabilityMetrics.totalWindows} janelas)</strong>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginTop: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Consistência Fator Lucro</span>
                    <strong style={{ fontSize: '1.1rem', color:
                      parseFloat(wfResults.stabilityMetrics.consistencyProfitFactor) > 0.7 ? 'var(--success)' :
                      parseFloat(wfResults.stabilityMetrics.consistencyProfitFactor) > 0.4 ? 'var(--warning)' : 'var(--danger)'
                    }}>{wfResults.stabilityMetrics.consistencyProfitFactor}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Consistência Win Rate</span>
                    <strong style={{ fontSize: '1.1rem', color:
                      parseFloat(wfResults.stabilityMetrics.consistencyWinRate) > 0.7 ? 'var(--success)' :
                      parseFloat(wfResults.stabilityMetrics.consistencyWinRate) > 0.4 ? 'var(--warning)' : 'var(--danger)'
                    }}>{wfResults.stabilityMetrics.consistencyWinRate}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Consistência Lucro Total</span>
                    <strong style={{ fontSize: '1.1rem', color:
                      parseFloat(wfResults.stabilityMetrics.consistencyTotalProfit) > 0.7 ? 'var(--success)' :
                      parseFloat(wfResults.stabilityMetrics.consistencyTotalProfit) > 0.4 ? 'var(--warning)' : 'var(--danger)'
                    }}>{wfResults.stabilityMetrics.consistencyTotalProfit}</strong>
                  </div>
                </div>
              </div>

              {/* Parameter Stability */}
              {wfResults.results && wfResults.results.length > 0 && (
                <div style={{ marginTop: '1.5rem' }}>
                  <h5 style={{ margin: '0 0 0.75rem 0', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Target size={14} color="var(--success)" /> Estabilidade dos Parâmetros Otimizados
                  </h5>
                  <div style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '6px' }}>
                    {wfConfig.paramsToOptimize.map(param => (
                      <div key={param.name} style={{ marginBottom: '0.75rem' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                          {param.name}
                        </span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                          {wfResults.results.map((result, index) => {
                            const value = result.bestParams[param.name];
                            // Format the value for better display
                            const formattedValue = param.type === 'time' ? value :
                                                  param.type === 'number' ? parseFloat(value).toFixed(2) : value;

                            return (
                              <span
                                key={`${param.name}-${index}`}
                                style={{
                                  fontSize: '0.8rem',
                                  backgroundColor: 'rgba(99, 102, 241, 0.1)',
                                  color: 'var(--primary-accent)',
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: '4px'
                                }}
                              >
                                {formattedValue}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Equity Curves by Window */}
              {wfResults.results && wfResults.results.length > 0 && (
                <div style={{ marginTop: '1.5rem' }}>
                  <h5 style={{ margin: '0 0 0.75rem 0', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <TrendingUp size={14} color="var(--success)" /> Curvas de Capital por Janela de Teste
                  </h5>
                  <div style={{ height: '250px', backgroundColor: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={wfResults.results.map((result, index) => {
                          // Create a data point for each trade in the equity curve
                          const dataPoint = { index: index + 1 };
                          result.testResult.equityCurve.forEach((point) => {
                            dataPoint[`Janela ${index + 1}`] = point.profit;
                          });
                          return dataPoint;
                        })}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis dataKey="index" stroke="var(--text-muted)" tick={{fontSize: 10}} />
                        <YAxis stroke="var(--text-muted)" tick={{fontSize: 10}} />
                        <Tooltip
                          contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid var(--border-subtle)', borderRadius: '8px', color: 'white' }}
                          itemStyle={{ color: 'white' }}
                        />
                        <Legend />
                        {wfResults.results.map((result, index) => (
                          <Line
                            key={index}
                            type="monotone"
                            dataKey={`Janela ${index + 1}`}
                            stroke={`hsl(${(index * 40) % 360}, 70%, 50%)`}
                            strokeWidth={2}
                            dot={false}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty State for WF Results */}
          {!wfResults && !wfError && !isRunningWF && (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', borderStyle: 'dashed', borderColor: 'var(--border-subtle)', borderRadius: '8px' }}>
              <RefreshCcw size={32} style={{ marginBottom: '1rem', opacity: 0.5 }} />
              <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem' }}>Configure os parâmetros acima e clique em "Iniciar Análise Walk-Forward"</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted-light)', maxWidth: '400px', margin: '0 auto' }}>
                Esta análise divide seus dados históricos em janelas temporais, otimiza os parâmetros em cada janela de treino e testa o desempenho fora da amostra em cada janela de teste.
                As métricas de estabilidade mostram quão consistentes são os resultados across diferentes períodos de mercado.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Laboratorio;
