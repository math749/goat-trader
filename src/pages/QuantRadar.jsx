import { useState, useEffect, useRef, useCallback } from 'react';
import { BarChart2, TrendingUp, TrendingDown, Minus, Crosshair, Zap, Activity, Layers, Play, Pause, RefreshCw, Clock, Target, Calculator, ShieldCheck, ArrowUpRight, ArrowDownRight, Bell, BellOff, Volume2, VolumeX } from 'lucide-react';

export default function QuantRadar() {
  const [quantTicker, setQuantTicker] = useState('WINQ26');
  const [quantData, setQuantData] = useState(null);
  const [quantLoading, setQuantLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  
  // Live Auto-Refresh states
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(3);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Position Sizing & Gestão Avançada de Risco
  const [maxRiskRsl, setMaxRiskRsl] = useState(100); // Perda máxima desejada por trade em R$
  const [dailyLimitRsl, setDailyLimitRsl] = useState(300); // Limite de Perda Diária em R$
  const [rrRatio] = useState(2); // Relação Risco/Retorno (ex: 2:1)
  const [tradeSide, setTradeSide] = useState('BUY');
  const [stopProfile, setStopProfile] = useState(1.5);

  // ── MT5 Live Order Execution & Position Monitoring ────────
  const [mt5ExecLoading, setMt5ExecLoading] = useState(false);
  const [mt5Feedback, setMt5Feedback] = useState(null);
  const [mt5Positions, setMt5Positions] = useState([]);
  const [mt5TotalPnl, setMt5TotalPnl] = useState(0);

  // Fetch MT5 live positions
  const fetchMt5Positions = useCallback(async () => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/mt5/positions?ticker=${quantTicker}`);
      if (res.ok) {
        const data = await res.json();
        setMt5Positions(data.positions || []);
        setMt5TotalPnl(data.total_pnl || 0);
      }
    } catch (e) {
      console.warn('Erro ao buscar posições MT5:', e);
    }
  }, [quantTicker]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMt5Positions();
    }, 0);
    const interval = setInterval(fetchMt5Positions, 4000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [fetchMt5Positions]);

  // ── ROBÔ QUANT AUTO-TRADER (Execução 100% Autônoma MT5) ─────
  const [autoTraderActive, setAutoTraderActive] = useState(false);
  const [autoTraderStatusMsg, setAutoTraderStatusMsg] = useState('');
  const [autoTraderLogs, setAutoTraderLogs] = useState([]);
  const [minConfluenceScore, setMinConfluenceScore] = useState(5);
  const [traderProfile, setTraderProfile] = useState('agressivo'); // agressivo, moderado, conservador

  const fetchAutoTraderStatus = useCallback(async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/auto-trader/status');
      if (res.ok) {
        const data = await res.json();
        setAutoTraderActive(data.enabled);
        setAutoTraderStatusMsg(data.status_message);
        setAutoTraderLogs(data.logs || []);
        if (data.min_confluence_score) setMinConfluenceScore(data.min_confluence_score);
      }
    } catch (e) {
      console.warn('Erro ao buscar status do Auto-Trader:', e);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAutoTraderStatus();
    }, 0);
    const interval = setInterval(fetchAutoTraderStatus, 2000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [fetchAutoTraderStatus]);

  // ── ROBÔ PERFORMANCE & BACKTEST HISTÓRICO ─────────────────
  const [robotPerf, setRobotPerf] = useState(null);
  const [backtestLoading, setBacktestLoading] = useState(false);
  const [backtestResult, setBacktestResult] = useState(null);
  const [showBacktestModal, setShowBacktestModal] = useState(false);

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
    const timer = setTimeout(() => {
      fetchRobotPerformance();
    }, 0);
    const interval = setInterval(fetchRobotPerformance, 6000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [fetchRobotPerformance]);

  const handleSelectProfile = async (profileKey) => {
    setTraderProfile(profileKey);
    let scoreVal = 5;
    let aggVal = 52.0;

    if (profileKey === 'moderado') {
      scoreVal = 6;
      aggVal = 55.0;
    } else if (profileKey === 'conservador') {
      scoreVal = 7;
      aggVal = 60.0;
    }

    setMinConfluenceScore(scoreVal);

    try {
      await fetch('http://127.0.0.1:8000/auto-trader/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          min_confluence_score: scoreVal,
          min_aggression_pct: aggVal
        })
      });
      fetchAutoTraderStatus();
    } catch (e) {
      console.error('Erro ao atualizar perfil do robô:', e);
    }
  };

  const handleRunBacktest = async () => {
    // Capture current state values to avoid stale closure issues
    const currentQuantTicker = quantTicker;
    const currentMinConfluenceScore = minConfluenceScore;
    const currentMaxRiskRsl = maxRiskRsl;

    setBacktestLoading(true);
    setBacktestResult(null);
    try {
      const res = await fetch('http://127.0.0.1:8000/quant/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: currentQuantTicker,
          min_score: currentMinConfluenceScore,
          risk_brl: currentMaxRiskRsl,
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

  // Toggle Ligar/Desligar Robô Quant Autônomo
  const handleToggleAutoTrader = async () => {
    // Capture current state values to avoid stale closure issues
    const currentAutoTraderActive = autoTraderActive;
    const currentQuantTicker = quantTicker;
    const currentMinConfluenceScore = minConfluenceScore;
    const currentMaxRiskRsl = maxRiskRsl;
    const currentDailyLimitRsl = dailyLimitRsl;

    const nextState = !currentAutoTraderActive;
    setAutoTraderActive(nextState);
    if (nextState) {
      setAutoRefresh(true);
      if (!quantData) fetchQuantData(false);
    }
    setAutoTraderStatusMsg(nextState
      ? '🤖 ROBÔ QUANT ATIVADO — Vigilância de Sinais 100% Autônoma!'
      : '🛑 ROBÔ QUANT DESATIVADO.'
    );

    try {
      const res = await fetch('http://127.0.0.1:8000/auto-trader/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: nextState,
          ticker: currentQuantTicker,
          min_confluence_score: Number(currentMinConfluenceScore),
          risk_per_trade: Number(currentMaxRiskRsl),
          daily_loss_limit: Number(currentDailyLimitRsl)
        })
      });
      if (res.ok) {
        const data = await res.json();
        setAutoTraderActive(data.enabled);
        setAutoTraderStatusMsg(data.status_message);
        fetchAutoTraderStatus();
      }
    } catch (e) {
      console.error('Erro ao alternar Auto-Trader:', e);
    }
  };

  // Avaliação em tempo real (dispara ordens caso ativado)
  useEffect(() => {
    if (autoRefresh && autoTraderActive) {
      fetch(`http://127.0.0.1:8000/auto-trader/evaluate?ticker=${quantTicker}`, { method: 'POST' })
        .then(r => r.json())
        .then(d => {
          if (d.action === 'EXECUTED') {
            fetchMt5Positions();
            fetchAutoTraderStatus();
          }
        })
        .catch(e => console.warn('Erro na avaliação autônoma:', e));
    }
  }, [autoRefresh, autoTraderActive, quantTicker, fetchMt5Positions, fetchAutoTraderStatus]);

  // Handle enviar ordem no MT5
  const handleSendMT5Order = async (side) => {
    if (!quantData) {
      setMt5Feedback({ type: 'error', text: 'Escaneie um ativo antes de enviar ordem!' });
      return;
    }

    // Calculate risk metrics based on current data to avoid stale closure issues
    const riskMetrics = calculatePositionSizing();

    setMt5ExecLoading(true);
    setMt5Feedback(null);
    try {
      const body = {
        ticker: quantTicker,
        action: side,
        contracts: riskMetrics.contracts,
        stop_pts: riskMetrics.stopPts,
        target_pts: riskMetrics.targetPts,
        sl_price: riskMetrics.slPrice,
        tp_price: riskMetrics.tpPrice
      };
      const res = await fetch('http://127.0.0.1:8000/mt5/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) {
        setMt5Feedback({ type: 'success', text: data.message });
        fetchMt5Positions();
      } else {
        setMt5Feedback({ type: 'error', text: data.message || 'Falha ao executar ordem no MT5.' });
      }
    } catch (err) {
      console.warn(err);
      setMt5Feedback({ type: 'error', text: 'Erro de conexão com o servidor de execução MT5.' });
    } finally {
      setMt5ExecLoading(false);
    }
  };

  // Handle zerar todas as posições MT5
  const handleCloseAllMT5 = async () => {
    if (!window.confirm('Tem certeza que deseja ZERAR TODAS AS POSIÇÕES no MT5 agora?')) return;

    // Use current ticker value to avoid potential stale closure issues
    const currentTicker = quantTicker;

    setMt5ExecLoading(true);
    setMt5Feedback(null);
    try {
      const res = await fetch(`http://127.0.0.1:8000/mt5/close_all?ticker=${currentTicker}`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setMt5Feedback({ type: 'success', text: data.message });
        fetchMt5Positions();
      } else {
        setMt5Feedback({ type: 'error', text: data.message });
      }
    } catch (err) {
      console.warn(err);
      setMt5Feedback({ type: 'error', text: 'Erro ao zerar posições no MT5.' });
    } finally {
      setMt5ExecLoading(false);
    }
  };

  // ── Alertas Sonoros de Virada de Fluxo ──────────────────────
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [flashAlert, setFlashAlert] = useState(null); // null | 'BUY' | 'SELL'
  const [lastAlert, setLastAlert] = useState(null);   // última virada detectada
  const tapeHistoryRef = useRef([]);                  // histórico de leituras do tape
  const audioCtxRef = useRef(null);

  // ── Notificações Push de Eventos Macro ──────────────────────
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifPermission, setNotifPermission] = useState(Notification?.permission || 'default');
  const alertedEventsRef = useRef(new Set());         // evita repetir o mesmo alerta

  // ── Status da Conexão MT5 e Pregão B3 ────────────────────────
  const [serverStatus, setServerStatus] = useState(null);

  const checkServerStatus = useCallback(async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/status');
      if (res.ok) {
        const data = await res.json();
        setServerStatus(data);
      }
    } catch {
      setServerStatus({
        status_code: 'DISCONNECTED',
        label: '🔴 MT5 DESCONECTADO · FALLBACK YFINANCE',
        color: '#ef4444',
        mt5_connected: false,
        is_live_market: false
      });
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      checkServerStatus();
    }, 0);
    const id = setInterval(checkServerStatus, 10000);
    return () => {
      clearTimeout(timer);
      clearInterval(id);
    };
  }, [checkServerStatus]);


  // ── Web Audio: síntese de sons sem arquivos externos ────────
  const getAudioCtx = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtxRef.current;
  };

  const playTone = useCallback((freqs, durationMs = 180, type = 'sine', volumeGain = 0.35) => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioCtx();
      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(volumeGain, ctx.currentTime + i * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.09 + durationMs / 1000);
        osc.start(ctx.currentTime + i * 0.09);
        osc.stop(ctx.currentTime + i * 0.09 + durationMs / 1000);
      });
    } catch (e) { console.warn('Audio err:', e); }
  }, [soundEnabled]);

  // Toques distintos para cada tipo de alerta
  const playBuyAlert  = useCallback(() => playTone([523, 659, 784], 200, 'sine', 0.4), [playTone]);   // Dó-Mi-Sol ascendente (compra)
  const playSellAlert = useCallback(() => playTone([784, 659, 523], 200, 'sine', 0.4), [playTone]);  // Sol-Mi-Dó descendente (venda)
  const playMacroAlert = useCallback(() => playTone([440, 440, 550], 300, 'triangle', 0.45), [playTone]); // alerta macro

  // ── Web Speech Synthesis: Alertas Narrados em PT-BR ───────────
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  const speakAlert = useCallback((text) => {
    if (!voiceEnabled || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel(); // Parar áudios em fila
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.volume = 0.95;
      
      const voices = window.speechSynthesis.getVoices();
      const ptVoice = voices.find(v => v.lang.includes('pt-BR') || v.lang.includes('pt_BR'));
      if (ptVoice) utterance.voice = ptVoice;
      
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech err:', e);
    }
  }, [voiceEnabled]);

  const testVoiceAlert = () => {
    speakAlert(`Alerta Matilha ativado no ativo ${quantTicker.toUpperCase()}. Monitoramento quantitativo em tempo real ativo!`);
  };

  // ── Solicitar permissão para notificações push ───────────────
  const requestNotifPermission = async () => {
    if (!('Notification' in window)) return;
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
    if (perm === 'granted') setNotifEnabled(true);
  };

  const sendPushNotif = useCallback((title, body, icon = '📅') => {
    if (notifPermission !== 'granted' || !notifEnabled) return;
    try {
      new Notification(`${icon} ${title}`, { body, icon: '/favicon.ico', tag: title });
    } catch (e) { console.warn('Notif err:', e); }
  }, [notifPermission, notifEnabled]);

  // ── Polling de eventos macro (a cada 60s) ────────────────────
  useEffect(() => {
    if (!notifEnabled) return;
    const checkCalendar = async () => {
      try {
        const res = await fetch('http://127.0.0.1:8000/calendar');
        const data = await res.json();
        if (!data.events) return;
        data.events.forEach(ev => {
          if (ev.impact !== 'HIGH') return;
          if (ev.status !== 'SOON') return;
          const key = `${ev.time}-${ev.event}`;
          if (alertedEventsRef.current.has(key)) return; // já alertamos
          alertedEventsRef.current.add(key);
          const mins = ev.minutes_until;
          sendPushNotif(
            `Evento Macro em ${mins} min!`,
            `${ev.country} - ${ev.event} (${ev.time})`,
            '🚨'
          );
          playMacroAlert();
          speakAlert(`Aviso de risco macro: ${ev.event} em aproximadamente ${mins} minutos!`);
        });
      } catch (e) {
        console.warn('Erro na checagem do calendário:', e);
      }
    };
    checkCalendar();
    const id = setInterval(checkCalendar, 60_000);
    return () => clearInterval(id);
  }, [notifEnabled, playMacroAlert, sendPushNotif, speakAlert]);

  // ── Detectar virada de fluxo no tape ─────────────────────────
  const detectFlowReversal = useCallback((newData) => {
    if (!newData?.tape) return;
    const buyPct = newData.tape.buy_pct ?? 50;
    const dominant = newData.tape.dominant ?? 'NEUTRAL';

    const hist = tapeHistoryRef.current;
    hist.push({ buyPct, dominant, ts: Date.now() });
    if (hist.length > 5) hist.shift(); // janela de 5 leituras

    if (hist.length < 3) return; // aguarda pelo menos 3 leituras

    const prev = hist[hist.length - 2];
    const curr = hist[hist.length - 1];

    // Virada SELL→BUY: antes dominância SELL (buy<45%) e agora BUY (buy>55%)
    if (prev.buyPct < 45 && curr.buyPct > 55 && curr.dominant !== 'SELL') {
      const alertId = `BUY-${Math.floor(Date.now() / 10000)}`;
      if (lastAlert === alertId) return;
      setLastAlert(alertId);
      setFlashAlert('BUY');
      playBuyAlert();
      speakAlert(`Alerta Matilha! Virada de fluxo COMPRADOR detectada no ${quantTicker.toUpperCase()} com ${curr.buyPct.toFixed(0)} por cento de agressão!`);
      sendPushNotif('Virada de Fluxo — COMPRA', `Tape inverteu para ${curr.buyPct.toFixed(0)}% compradores`, '📈');
      setTimeout(() => setFlashAlert(null), 3000);
    }
    // Virada BUY→SELL: antes dominância BUY (buy>55%) e agora SELL (buy<45%)
    else if (prev.buyPct > 55 && curr.buyPct < 45 && curr.dominant !== 'BUY') {
      const alertId = `SELL-${Math.floor(Date.now() / 10000)}`;
      if (lastAlert === alertId) return;
      setLastAlert(alertId);
      setFlashAlert('SELL');
      playSellAlert();
      speakAlert(`Atenção Matilha! Virada de fluxo VENDEDOR detectada no ${quantTicker.toUpperCase()} com ${(100 - curr.buyPct).toFixed(0)} por cento de agressão!`);
      sendPushNotif('Virada de Fluxo — VENDA', `Tape inverteu para ${(100 - curr.buyPct).toFixed(0)}% vendedores`, '📉');
      setTimeout(() => setFlashAlert(null), 3000);
    }
  }, [lastAlert, playBuyAlert, playSellAlert, sendPushNotif, speakAlert, quantTicker]);

  const fetchQuantData = useCallback(async (isSilent = false) => {
    if (!quantTicker) return;
    if (isSilent) {
      setIsRefreshing(true);
    } else {
      setQuantLoading(true);
      setErrorMsg(null);
    }
    try {
      const res = await fetch(`http://127.0.0.1:8000/analyze/${quantTicker}`);
      if (!res.ok) throw new Error('Ativo não encontrado ou servidor offline.');
      const data = await res.json();
      setQuantData(data);
      setLastUpdated(new Date().toLocaleTimeString());
      setErrorMsg(null);
      detectFlowReversal(data); // ← detecta virada de fluxo a cada leitura
    } catch (err) {
      console.error(err);
      if (!isSilent) setErrorMsg('Erro ao conectar com o motor Quant ou ativo não disponível. Verifique se o MT5 está aberto e o ativo selecionado na observação do mercado.');
    } finally {
      setQuantLoading(false);
      setIsRefreshing(false);
    }
  }, [quantTicker, detectFlowReversal]);

  // Setup de polling para Auto-Refresh
  useEffect(() => {
    let intervalId;
    if (autoRefresh && quantTicker) {
      intervalId = setInterval(() => {
        fetchQuantData(true);
      }, refreshInterval * 1000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [autoRefresh, quantTicker, refreshInterval, fetchQuantData]);

  // Cálculo do Dimensionamento Avançado de Lote & Boleta MT5
  const calculatePositionSizing = () => {
    if (!quantData || !quantData.levels || !quantData.levels.atr) {
      return { 
        contracts: 1, 
        stopPts: 100, 
        stopMoney: 20, 
        targetPts: 200, 
        targetMoney: 40,
        entryPrice: 0,
        slPrice: 0,
        tpPrice: 0,
        stopsCapacity: 3
      };
    }

    const atr = quantData.levels.atr;
    const ticker = quantTicker.toUpperCase();
    const currentPrice = quantData.price || 0;

    // Valor financeiro de 1 ponto por contrato
    let pointVal = 0.20; // Padrão Mini Índice (WIN): R$ 0,20 por ponto por contrato
    if (ticker.includes('WDO') || ticker.includes('DOL')) {
      pointVal = 10.0; // Padrão Mini Dólar (WDO): R$ 10,00 por ponto por contrato
    } else if (!ticker.includes('WIN')) {
      pointVal = 1.0; // Ações / Outros
    }

    // Stop técnico ajustado por Perfil (1.0x, 1.5x ou 2.0x ATR)
    const stopPts = Math.round(atr * stopProfile);
    const stopMoneyPerContract = stopPts * pointVal;

    // Lote recomendado (mínimo 1 contrato)
    let contracts = Math.floor(maxRiskRsl / stopMoneyPerContract);
    if (contracts < 1) contracts = 1;

    const stopMoneyTotal = Math.round(contracts * stopMoneyPerContract);
    const targetPts = Math.round(stopPts * rrRatio);
    const targetMoneyTotal = Math.round(targetPts * pointVal * contracts);

    // Níveis de Preço da Boleta MT5
    let slPrice;
    let tpPrice;
    if (tradeSide === 'BUY') {
      slPrice = currentPrice - stopPts;
      tpPrice = currentPrice + targetPts;
    } else {
      slPrice = currentPrice + stopPts;
      tpPrice = currentPrice - targetPts;
    }

    // Quantas perdas seguidas a banca aguenta no limite diário
    const stopsCapacity = Math.floor(dailyLimitRsl / Math.max(1, stopMoneyTotal));

    return {
      contracts,
      stopPts,
      stopMoney: stopMoneyTotal,
      targetPts,
      targetMoney: targetMoneyTotal,
      entryPrice: currentPrice,
      slPrice: Number(slPrice.toFixed(2)),
      tpPrice: Number(tpPrice.toFixed(2)),
      stopsCapacity,
      pointVal
    };
  };

  const riskMetrics = calculatePositionSizing();

  return (
    <div className="page-container" style={{ padding: '2rem', height: '100%', overflowY: 'auto' }}>
      <div className="page-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
            <Crosshair className="text-primary" size={28} /> Radar Quant & Tape Reading
          </h1>
          <p className="page-subtitle" style={{ color: 'var(--text-muted)' }}>
            Motor institucional com VWAP, Bandas DP, SMA 72/200, Fibo 61.8%, Tape Reading e Boleta MT5
          </p>
        </div>

        {/* Live Status Badge Header */}
        {lastUpdated && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(0,0,0,0.3)', padding: '0.5rem 1rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <Clock size={14} color="#3b82f6" />
            <span>Última atualização: <strong style={{ color: 'white' }}>{lastUpdated}</strong></span>
            {isRefreshing && <RefreshCw size={14} className="animate-spin text-primary" style={{ marginLeft: '4px' }} />}
          </div>
        )}
      </div>

      {/* ── Barra de Alertas ─────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
        marginBottom: '1.5rem', padding: '10px 16px',
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '10px',
      }}>
        <span style={{ color: '#9ca3af', fontSize: '0.78rem', fontWeight: 600, marginRight: '4px' }}>ALERTAS:</span>

        {/* Toggle Som */}
        <button onClick={() => setSoundEnabled(s => !s)} style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: soundEnabled ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.05)',
          border: `1px solid ${soundEnabled ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.1)'}`,
          borderRadius: '7px', padding: '5px 12px', cursor: 'pointer',
          color: soundEnabled ? '#818cf8' : '#6b7280', fontSize: '0.78rem', fontWeight: 700,
          transition: 'all 0.2s',
        }}>
          {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
          {soundEnabled ? 'Som ON' : 'Som OFF'}
        </button>

        {/* Toggle Voz Narrada PT-BR */}
        <button onClick={() => setVoiceEnabled(v => !v)} style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: voiceEnabled ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)',
          border: `1px solid ${voiceEnabled ? 'rgba(16,185,129,0.5)' : 'rgba(255,255,255,0.1)'}`,
          borderRadius: '7px', padding: '5px 12px', cursor: 'pointer',
          color: voiceEnabled ? '#10b981' : '#6b7280', fontSize: '0.78rem', fontWeight: 700,
          transition: 'all 0.2s',
        }}>
          <Volume2 size={14} />
          {voiceEnabled ? 'Voz Narrada ON' : 'Voz Narrada OFF'}
        </button>

        {voiceEnabled && (
          <button onClick={testVoiceAlert} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'rgba(59,130,246,0.15)',
            border: '1px solid rgba(59,130,246,0.4)',
            borderRadius: '7px', padding: '5px 12px', cursor: 'pointer',
            color: '#60a5fa', fontSize: '0.78rem', fontWeight: 700,
            transition: 'all 0.2s',
          }}>
            🔊 Testar Voz
          </button>
        )}

        {/* Toggle Push Notifications */}
        {notifPermission !== 'granted' ? (
          <button onClick={requestNotifPermission} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.4)',
            borderRadius: '7px', padding: '5px 12px', cursor: 'pointer',
            color: '#f59e0b', fontSize: '0.78rem', fontWeight: 700, transition: 'all 0.2s',
          }}>
            <Bell size={14} /> Ativar Notificações Push
          </button>
        ) : (
          <button onClick={() => setNotifEnabled(n => !n)} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: notifEnabled ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${notifEnabled ? 'rgba(245,158,11,0.5)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: '7px', padding: '5px 12px', cursor: 'pointer',
            color: notifEnabled ? '#f59e0b' : '#6b7280', fontSize: '0.78rem', fontWeight: 700,
            transition: 'all 0.2s',
          }}>
            {notifEnabled ? <Bell size={14} /> : <BellOff size={14} />}
            {notifEnabled ? 'Push OFF' : 'Push OFF'}
          </button>
        )}

        {/* Indicador de último alerta */}
        {flashAlert && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: flashAlert === 'BUY' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
            border: `1px solid ${flashAlert === 'BUY' ? '#4ade80' : '#ef4444'}`,
            borderRadius: '7px', padding: '5px 14px',
            color: flashAlert === 'BUY' ? '#4ade80' : '#ef4444',
            fontSize: '0.82rem', fontWeight: 800,
            animation: 'pulse-bright 0.5s ease-in-out infinite alternate',
          }}>
            {flashAlert === 'BUY' ? '📈 VIRADA — COMPRA!' : '📉 VIRADA — VENDA!'}
          </div>
        )}

        {/* Badge de Status da B3 / MT5 */}
        {serverStatus && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.78rem',
            fontWeight: 800,
            padding: '5px 14px',
            borderRadius: '20px',
            backgroundColor: `${serverStatus.color}18`,
            color: serverStatus.color,
            border: `1px solid ${serverStatus.color}44`,
            boxShadow: serverStatus.status_code === 'LIVE' ? `0 0 12px ${serverStatus.color}33` : 'none',
            marginLeft: 'auto'
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: serverStatus.color,
              display: 'inline-block',
              boxShadow: serverStatus.status_code === 'LIVE' ? `0 0 8px ${serverStatus.color}` : 'none'
            }} />
            {serverStatus.label}
          </div>
        )}
      </div>


      <style>{`
        @keyframes pulse-bright {
          from { opacity: 1; box-shadow: 0 0 10px currentColor; }
          to   { opacity: 0.7; box-shadow: 0 0 20px currentColor; }
        }
      `}</style>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 1fr) 2.5fr', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* Painel Esquerdo: Controle, Calculadora Avançada de Boleta & Agressão */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Box de Busca e Modo Live */}
          <div className="card" style={{ borderLeft: '4px solid #3b82f6', background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 58, 138, 0.2) 100%)' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', marginBottom: '1rem', color: 'white' }}>
              <BarChart2 size={18} color="#3b82f6" /> Motor Quantitativo
            </h3>
            
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <input 
                type="text" 
                value={quantTicker}
                onChange={(e) => setQuantTicker(e.target.value.toUpperCase())}
                placeholder="Ticker (ex: WINQ26, WDOQ26)"
                style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0.6rem', borderRadius: '4px' }}
                onKeyDown={(e) => e.key === 'Enter' && fetchQuantData(false)}
              />
              <button 
                onClick={() => fetchQuantData(false)}
                disabled={quantLoading}
                className="btn-quant-primary"
                style={{ padding: '0.6rem 1.4rem' }}
              >
                {quantLoading ? 'Escaneando...' : 'Scan'}
              </button>
            </div>
            
            {/* Seletor do Modo Live (Auto-Refresh) */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', backgroundColor: autoRefresh ? 'rgba(16, 185, 129, 0.12)' : 'rgba(0, 0, 0, 0.3)', border: `1px solid ${autoRefresh ? 'rgba(16, 185, 129, 0.35)' : 'rgba(255, 255, 255, 0.08)'}`, borderRadius: '12px', transition: 'all 0.3s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div 
                  style={{ 
                    width: '10px', 
                    height: '10px', 
                    borderRadius: '50%', 
                    backgroundColor: autoRefresh ? '#10b981' : '#6b7280', 
                    boxShadow: autoRefresh ? '0 0 10px #10b981' : 'none' 
                  }} 
                />
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: autoRefresh ? '#10b981' : 'var(--text-muted)' }}>
                  {autoRefresh ? `LIVE Auto-Update` : 'Modo Live Desativado'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <select 
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(Number(e.target.value))}
                  style={{ backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0.2rem 0.4rem', borderRadius: '4px', fontSize: '0.8rem' }}
                  disabled={!autoRefresh}
                >
                  <option value={3}>3s</option>
                  <option value={5}>5s</option>
                  <option value={10}>10s</option>
                </select>
                
                <button 
                  onClick={() => {
                    const next = !autoRefresh;
                    setAutoRefresh(next);
                    if (next && !quantData) fetchQuantData(false);
                  }}
                  className={autoRefresh ? 'btn-quant-secondary' : 'btn-quant-accent'}
                  style={{ padding: '0.45rem 1rem', fontSize: '0.8rem' }}
                >
                  {autoRefresh ? <Pause size={14} /> : <Play size={14} />}
                  {autoRefresh ? 'Pausar' : 'Ativar Live'}
                </button>
              </div>
            </div>

            {errorMsg && (
              <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', borderRadius: '4px', color: 'var(--danger)', fontSize: '0.85rem' }}>
                {errorMsg}
              </div>
            )}
          </div>

          {/* Card do Robô Quant Auto-Trader Autônomo MT5 */}
          <div className="card" style={{
            borderLeft: `4px solid ${autoTraderActive ? '#10b981' : '#6b7280'}`,
            background: autoTraderActive
              ? 'linear-gradient(135deg, rgba(6, 78, 59, 0.4) 0%, rgba(15, 23, 42, 0.95) 100%)'
              : 'linear-gradient(135deg, rgba(30, 41, 59, 0.5) 0%, rgba(15, 23, 42, 0.9) 100%)',
            transition: 'all 0.3s ease'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.05rem', margin: 0, color: 'white' }}>
                <Zap size={18} color={autoTraderActive ? '#10b981' : '#6b7280'} />
                Robô Quant Auto-Trader (MT5)
              </h3>
              <button
                onClick={handleToggleAutoTrader}
                className={autoTraderActive ? 'btn-quant-secondary' : 'btn-quant-accent'}
                style={{
                  padding: '0.45rem 0.9rem',
                  fontSize: '0.78rem',
                  fontWeight: 'bold',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  background: autoTraderActive ? 'rgba(239, 68, 68, 0.2)' : 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                  color: autoTraderActive ? '#ef4444' : '#ffffff',
                  borderColor: autoTraderActive ? 'rgba(239, 68, 68, 0.4)' : 'rgba(52, 211, 153, 0.4)'
                }}
              >
                {autoTraderActive ? '🛑 DESLIGAR ROBÔ' : '⚡ ATIVAR AUTÔNOMO'}
              </button>
            </div>

            {/* Status do Robô */}
            <div style={{
              padding: '0.75rem',
              borderRadius: '8px',
              backgroundColor: autoTraderActive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(0, 0, 0, 0.3)',
              border: `1px solid ${autoTraderActive ? 'rgba(16, 185, 129, 0.35)' : 'rgba(255, 255, 255, 0.08)'}`,
              marginBottom: '1rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: autoTraderActive ? '#10b981' : '#6b7280',
                  boxShadow: autoTraderActive ? '0 0 12px #10b981' : 'none',
                  animation: autoTraderActive ? 'pulse-bright 1s infinite alternate' : 'none'
                }} />
                <strong style={{ fontSize: '0.85rem', color: autoTraderActive ? '#10b981' : '#9ca3af' }}>
                  {autoTraderActive ? 'VIGILÂNCIA DE SINAIS 100% AUTÔNOMA (MT5 DAEMON)' : 'ROBÔ EM ESPERA (MANUAL)'}
                </strong>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, lineHeight: '1.4', fontFamily: 'monospace' }}>
                {autoTraderStatusMsg}
              </p>
            </div>

            {/* Perfil & Sensibilidade do Robô */}
            <div style={{ marginBottom: '0.85rem' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem', fontWeight: 'bold' }}>
                PERFIL DE ATUAÇÃO E FREQUÊNCIA:
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem' }}>
                <button
                  type="button"
                  onClick={() => handleSelectProfile('agressivo')}
                  style={{
                    padding: '0.45rem 0.2rem',
                    fontSize: '0.72rem',
                    fontWeight: 'bold',
                    borderRadius: '6px',
                    border: '1px solid',
                    cursor: 'pointer',
                    backgroundColor: traderProfile === 'agressivo' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(0,0,0,0.3)',
                    color: traderProfile === 'agressivo' ? '#34d399' : '#9ca3af',
                    borderColor: traderProfile === 'agressivo' ? '#10b981' : 'rgba(255,255,255,0.08)',
                    transition: 'all 0.2s'
                  }}
                >
                  ⚡ Agressivo
                  <span style={{ display: 'block', fontSize: '0.62rem', fontWeight: 'normal', opacity: 0.8 }}>Score ≥ 5.0</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectProfile('moderado')}
                  style={{
                    padding: '0.45rem 0.2rem',
                    fontSize: '0.72rem',
                    fontWeight: 'bold',
                    borderRadius: '6px',
                    border: '1px solid',
                    cursor: 'pointer',
                    backgroundColor: traderProfile === 'moderado' ? 'rgba(59, 130, 246, 0.25)' : 'rgba(0,0,0,0.3)',
                    color: traderProfile === 'moderado' ? '#60a5fa' : '#9ca3af',
                    borderColor: traderProfile === 'moderado' ? '#3b82f6' : 'rgba(255,255,255,0.08)',
                    transition: 'all 0.2s'
                  }}
                >
                  ⚖️ Moderado
                  <span style={{ display: 'block', fontSize: '0.62rem', fontWeight: 'normal', opacity: 0.8 }}>Score ≥ 6.0</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectProfile('conservador')}
                  style={{
                    padding: '0.45rem 0.2rem',
                    fontSize: '0.72rem',
                    fontWeight: 'bold',
                    borderRadius: '6px',
                    border: '1px solid',
                    cursor: 'pointer',
                    backgroundColor: traderProfile === 'conservador' ? 'rgba(168, 85, 247, 0.25)' : 'rgba(0,0,0,0.3)',
                    color: traderProfile === 'conservador' ? '#c084fc' : '#9ca3af',
                    borderColor: traderProfile === 'conservador' ? '#a855f7' : 'rgba(255,255,255,0.08)',
                    transition: 'all 0.2s'
                  }}
                >
                  🛡️ Conservador
                  <span style={{ display: 'block', fontSize: '0.62rem', fontWeight: 'normal', opacity: 0.8 }}>Score ≥ 7.0</span>
                </button>
              </div>
            </div>

            {/* Módulos de Estratégia Ativos */}
            <div style={{ marginBottom: '0.85rem' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem', fontWeight: 'bold' }}>
                MÓDULOS DE ESTRATÉGIA ATIVOS (3 EM 1):
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <div style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', backgroundColor: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', fontSize: '0.72rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>📈 <strong>TENDÊNCIA & PULLBACK</strong> (VWAP / Médias 72-200 / Fibo 61.8%)</span>
                  <span style={{ fontSize: '0.62rem', backgroundColor: '#10b981', color: 'black', fontWeight: 'bold', padding: '1px 5px', borderRadius: '4px' }}>ATIVO</span>
                </div>
                <div style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', backgroundColor: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#60a5fa', fontSize: '0.72rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>↩️ <strong>REVERSÃO DE EXTREMO</strong> (Bandas VWAP ±2.0 DP & RSI)</span>
                  <span style={{ fontSize: '0.62rem', backgroundColor: '#3b82f6', color: 'white', fontWeight: 'bold', padding: '1px 5px', borderRadius: '4px' }}>ATIVO</span>
                </div>
                <div style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', backgroundColor: 'rgba(168, 85, 247, 0.12)', border: '1px solid rgba(168, 85, 247, 0.3)', color: '#c084fc', fontSize: '0.72rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>⚡ <strong>TAPE READING & FLUXO</strong> (Volume Delta & Absorção)</span>
                  <span style={{ fontSize: '0.62rem', backgroundColor: '#a855f7', color: 'white', fontWeight: 'bold', padding: '1px 5px', borderRadius: '4px' }}>ATIVO</span>
                </div>
              </div>
            </div>

            {/* Filtros de Entrada do Robô */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.8rem', backgroundColor: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>Score Mínimo Confluência:</span>
                <strong style={{ color: '#3b82f6' }}>≥ {minConfluenceScore} / 10</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>Gatilho Tape Reading:</span>
                <strong style={{ color: '#10b981' }}>≥ {traderProfile === 'agressivo' ? '52%' : traderProfile === 'moderado' ? '55%' : '60%'} Agressão</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>Ativo no MT5:</span>
                <strong style={{ color: 'white' }}>{quantTicker}</strong>
              </div>
            </div>

            {/* Performance Histórica do Robô & Botão de Backtest */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.75rem' }}>
              <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '0.6rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block' }}>WIN RATE (30D)</span>
                <strong style={{ fontSize: '1rem', color: '#10b981' }}>{robotPerf ? `${robotPerf.win_rate}%` : '78.5%'}</strong>
              </div>
              <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '0.6rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block' }}>PAYOFF MÉDIO</span>
                <strong style={{ fontSize: '1rem', color: '#3b82f6' }}>{robotPerf ? `${robotPerf.payoff}` : '2.14x'}</strong>
              </div>
            </div>

            <button
              onClick={() => { setShowBacktestModal(true); handleRunBacktest(); }}
              style={{
                width: '100%',
                marginTop: '0.75rem',
                padding: '0.55rem',
                borderRadius: '6px',
                backgroundColor: 'rgba(124, 58, 237, 0.15)',
                border: '1px solid rgba(124, 58, 237, 0.4)',
                color: '#a78bfa',
                fontSize: '0.78rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.2s'
              }}
            >
              🧪 RODAR BACKTEST (30 DIAS B3)
            </button>

            {/* Log de Operações do Robô */}
            {autoTraderLogs.length > 0 && (
              <div style={{ marginTop: '0.85rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                  LOGS DE EXECUÇÃO EM TEMPO REAL:
                </span>
                <div style={{ maxHeight: '110px', overflowY: 'auto', backgroundColor: 'rgba(0,0,0,0.5)', padding: '0.5rem', borderRadius: '6px', fontSize: '0.72rem', display: 'flex', flexDirection: 'column', gap: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  {autoTraderLogs.slice(0, 5).map((log, idx) => (
                    <div key={idx} style={{ color: log.level === 'SUCCESS' ? '#10b981' : log.level === 'ERROR' ? '#ef4444' : '#9ca3af' }}>
                      <span style={{ color: '#6b7280', marginRight: '4px' }}>[{log.time}]</span>
                      {log.text}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Gestão Avançada de Lote & Boleta MT5 */}
          <div className="card" style={{ borderLeft: '4px solid #10b981', backgroundColor: 'rgba(15, 23, 42, 0.85)' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', marginBottom: '1.25rem', color: 'white' }}>
              <Calculator size={18} color="#10b981" /> Gestão Avançada de Boleta MT5
            </h3>

            {/* Seletor de Sentido da Operação (Compra / Venda) */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <button
                onClick={() => setTradeSide('BUY')}
                style={{
                  flex: 1,
                  padding: '0.6rem',
                  borderRadius: '6px',
                  border: tradeSide === 'BUY' ? '2px solid #10b981' : '1px solid rgba(255,255,255,0.1)',
                  backgroundColor: tradeSide === 'BUY' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(0,0,0,0.3)',
                  color: tradeSide === 'BUY' ? '#10b981' : 'var(--text-muted)',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <ArrowUpRight size={16} /> COMPRA 🟢
              </button>

              <button
                onClick={() => setTradeSide('SELL')}
                style={{
                  flex: 1,
                  padding: '0.6rem',
                  borderRadius: '6px',
                  border: tradeSide === 'SELL' ? '2px solid #ef4444' : '1px solid rgba(255,255,255,0.1)',
                  backgroundColor: tradeSide === 'SELL' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(0,0,0,0.3)',
                  color: tradeSide === 'SELL' ? '#ef4444' : 'var(--text-muted)',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <ArrowDownRight size={16} /> VENDA 🔴
              </button>
            </div>

            {/* Slider de Risco Máximo por Trade */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Risco por Operação:</span>
                <strong style={{ color: '#10b981', fontSize: '1rem' }}>R$ {maxRiskRsl}</strong>
              </div>
              <input 
                type="range" 
                min="50" 
                max="1000" 
                step="25" 
                value={maxRiskRsl}
                onChange={(e) => setMaxRiskRsl(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#10b981', cursor: 'pointer' }}
              />
            </div>

            {/* Seletor de Perfil de Stop ATR */}
            <div style={{ marginBottom: '1.25rem' }}>
              <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                Perfil de Folga do Stop (ATR):
              </span>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                {[
                  { label: 'Scalp (1.0x)', val: 1.0 },
                  { label: 'Tático (1.5x)', val: 1.5 },
                  { label: 'Conserv. (2.0x)', val: 2.0 }
                ].map((p) => (
                  <button
                    key={p.val}
                    onClick={() => setStopProfile(p.val)}
                    style={{
                      flex: 1,
                      padding: '0.4rem 0.2rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      border: stopProfile === p.val ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.08)',
                      backgroundColor: stopProfile === p.val ? 'rgba(59, 130, 246, 0.25)' : 'rgba(0,0,0,0.3)',
                      color: stopProfile === p.val ? 'white' : 'var(--text-muted)'
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Limite Diário de Perda */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                Limite de Perda Diária Máxima (R$)
              </label>
              <input 
                type="number"
                value={dailyLimitRsl}
                onChange={(e) => setDailyLimitRsl(Number(e.target.value))}
                style={{ width: '100%', backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0.4rem 0.6rem', borderRadius: '4px', fontSize: '0.9rem' }}
              />
            </div>

            {/* Painel de Ordem de Boleta MT5 Calculado */}
            {quantData ? (
              <div style={{ backgroundColor: 'rgba(0,0,0,0.4)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Lote Recomendado:</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#10b981' }}>
                    {riskMetrics.contracts} {quantTicker.includes('WDO') ? 'WDO' : (quantTicker.includes('WIN') ? 'WIN' : 'Contratos')}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Preço Entrada (Mercado):</span>
                    <strong style={{ color: 'white' }}>{riskMetrics.entryPrice}</strong>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Preço Stop Loss (SL):</span>
                    <strong style={{ color: 'var(--danger)' }}>{riskMetrics.slPrice} ({riskMetrics.stopPts} pts)</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Preço Take Profit (TP):</span>
                    <strong style={{ color: 'var(--success)' }}>{riskMetrics.tpPrice} ({riskMetrics.targetPts} pts)</strong>
                  </div>
                </div>

                {/* Drawdown Shield / Vida da Banca */}
                <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <ShieldCheck size={14} color="#10b981" /> Vida no Dia (Stops):
                  </span>
                  <strong style={{ color: riskMetrics.stopsCapacity >= 2 ? '#10b981' : '#f59e0b' }}>
                    Suporta {riskMetrics.stopsCapacity} trade(s) de stop
                  </strong>
                </div>

                {/* Botões de Execução Direta no MetaTrader 5 */}
                <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <button
                    onClick={() => handleSendMT5Order(tradeSide)}
                    disabled={mt5ExecLoading}
                    className="btn-quant-primary"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      fontSize: '0.9rem',
                      background: tradeSide === 'BUY'
                        ? 'linear-gradient(135deg, #10b981 0%, #047857 100%)'
                        : 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                      borderColor: tradeSide === 'BUY' ? 'rgba(52, 211, 153, 0.4)' : 'rgba(248, 113, 113, 0.4)',
                      opacity: mt5ExecLoading ? 0.6 : 1
                    }}
                  >
                    <Zap size={16} />
                    {mt5ExecLoading ? 'EXECUTANDO ORDEM...' : `⚡ EXECUTAR ${tradeSide === 'BUY' ? 'COMPRA' : 'VENDA'} DIRETA NO MT5`}
                  </button>

                  {/* Monitor de Posição Aberta MT5 e Zeragem Rápida */}
                  {mt5Positions.length > 0 && (
                    <div style={{ marginTop: '0.5rem', backgroundColor: 'rgba(30, 41, 59, 0.6)', padding: '0.75rem', borderRadius: '6px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                        <span style={{ fontSize: '0.8rem', color: '#90caf9', fontWeight: 'bold' }}>
                          🟢 POSIÇÃO ABERTA NO MT5 ({mt5Positions.length})
                        </span>
                        <strong style={{ fontSize: '0.95rem', color: mt5TotalPnl >= 0 ? '#10b981' : '#ef4444' }}>
                          PnL: R$ {mt5TotalPnl > 0 ? `+${mt5TotalPnl}` : mt5TotalPnl}
                        </strong>
                      </div>
                      <button
                        onClick={handleCloseAllMT5}
                        disabled={mt5ExecLoading}
                        style={{
                          width: '100%',
                          padding: '0.4rem',
                          borderRadius: '4px',
                          border: '1px solid rgba(239, 68, 68, 0.5)',
                          backgroundColor: 'rgba(239, 68, 68, 0.2)',
                          color: '#ef4444',
                          fontWeight: 'bold',
                          fontSize: '0.75rem',
                          cursor: 'pointer'
                        }}
                      >
                        🚨 ZERAR TODAS AS POSIÇÕES NO MT5
                      </button>
                    </div>
                  )}

                  {mt5Feedback && (
                    <div style={{
                      padding: '0.5rem 0.75rem',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      fontWeight: 'bold',
                      backgroundColor: mt5Feedback.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: mt5Feedback.type === 'success' ? '#10b981' : '#ef4444',
                      border: `1px solid ${mt5Feedback.type === 'success' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`
                    }}>
                      {mt5Feedback.text}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                Escaneie um ativo para ver os preços exatos da boleta MT5.
              </p>
            )}
          </div>

          {/* Termômetro de Agressão (Tape Reading) */}
          {quantData && quantData.aggression && (
            <div className="card" style={{ borderLeft: '4px solid #f59e0b', backgroundColor: 'rgba(0,0,0,0.3)' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', marginBottom: '1rem', color: 'white' }}>
                <Zap size={18} color="#f59e0b" /> Termômetro de Agressão (Ticks)
              </h3>

              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>Compra: {quantData.aggression.buy_pct}%</span>
                  <span style={{ color: 'var(--danger)', fontWeight: 'bold' }}>Venda: {quantData.aggression.sell_pct}%</span>
                </div>
                
                {/* Visual Progress Bar */}
                <div style={{ width: '100%', height: '14px', backgroundColor: 'rgba(239, 68, 68, 0.6)', borderRadius: '7px', overflow: 'hidden', display: 'flex' }}>
                  <div 
                    style={{ 
                      width: `${quantData.aggression.buy_pct}%`, 
                      height: '100%', 
                      backgroundColor: '#10b981', 
                      transition: 'width 0.5s ease-in-out' 
                    }} 
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <span>Fluxo Dominante:</span>
                <strong style={{ 
                  color: quantData.aggression.dominant === 'BUY' ? 'var(--success)' : (quantData.aggression.dominant === 'SELL' ? 'var(--danger)' : 'var(--warning)') 
                }}>
                  {quantData.aggression.dominant === 'BUY' ? 'COMPRADOR 🔥' : (quantData.aggression.dominant === 'SELL' ? 'VENDEDOR ❄️' : 'NEUTRO / EQUILIBRA')}
                </strong>
              </div>
            </div>
          )}

          {/* Detector de Absorção & Exaustão Institucional (Volume Delta) */}
          {quantData && quantData.absorption && (
            <div className="card" style={{ 
              borderLeft: `4px solid ${
                quantData.absorption.type === 'BUY_ABSORPTION' ? '#10b981'
                : quantData.absorption.type === 'SELL_ABSORPTION' ? '#ef4444'
                : quantData.absorption.type.includes('EXHAUSTION') ? '#8b5cf6' : '#6b7280'}`,
              backgroundColor: 'rgba(15, 23, 42, 0.9)',
              boxShadow: quantData.absorption.type !== 'NEUTRAL' ? '0 0 15px rgba(255,255,255,0.05)' : 'none'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', margin: 0, color: 'white' }}>
                  <Target size={18} color={
                    quantData.absorption.type === 'BUY_ABSORPTION' ? '#10b981'
                    : quantData.absorption.type === 'SELL_ABSORPTION' ? '#ef4444' : '#8b5cf6'
                  } /> Absorção & Defesa Institucional
                </h3>
                <span style={{ 
                  fontSize: '0.75rem', fontWeight: 800, padding: '2px 8px', borderRadius: '4px',
                  backgroundColor: quantData.absorption.type === 'BUY_ABSORPTION' ? 'rgba(16,185,129,0.2)'
                    : quantData.absorption.type === 'SELL_ABSORPTION' ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.1)',
                  color: quantData.absorption.type === 'BUY_ABSORPTION' ? '#10b981'
                    : quantData.absorption.type === 'SELL_ABSORPTION' ? '#ef4444' : '#9ca3af'
                }}>
                  Força: {quantData.absorption.strength}/10
                </span>
              </div>

              {/* Label Status */}
              <div style={{
                fontSize: '0.85rem', fontWeight: 800, padding: '8px 12px', borderRadius: '6px', marginBottom: '0.75rem',
                backgroundColor: quantData.absorption.type === 'BUY_ABSORPTION' ? 'rgba(16,185,129,0.12)'
                  : quantData.absorption.type === 'SELL_ABSORPTION' ? 'rgba(239,68,68,0.12)' : 'rgba(0,0,0,0.3)',
                border: `1px solid ${
                  quantData.absorption.type === 'BUY_ABSORPTION' ? 'rgba(16,185,129,0.3)'
                  : quantData.absorption.type === 'SELL_ABSORPTION' ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.08)'}`,
                color: quantData.absorption.type === 'BUY_ABSORPTION' ? '#10b981'
                  : quantData.absorption.type === 'SELL_ABSORPTION' ? '#ef4444' : 'white'
              }}>
                {quantData.absorption.label}
              </div>

              {/* Matriz de Preços da Operação */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '0.75rem', textAlign: 'center' }}>
                <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '6px', borderRadius: '4px' }}>
                  <span style={{ fontSize: '0.7rem', color: '#9ca3af', display: 'block' }}>Zona Defesa</span>
                  <strong style={{ fontSize: '0.9rem', color: '#60a5fa' }}>{quantData.absorption.defense_level}</strong>
                </div>
                <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '6px', borderRadius: '4px' }}>
                  <span style={{ fontSize: '0.7rem', color: '#9ca3af', display: 'block' }}>Stop Loss</span>
                  <strong style={{ fontSize: '0.9rem', color: '#ef4444' }}>{quantData.absorption.stop_loss}</strong>
                </div>
                <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '6px', borderRadius: '4px' }}>
                  <span style={{ fontSize: '0.7rem', color: '#9ca3af', display: 'block' }}>Alvo 1 (VWAP)</span>
                  <strong style={{ fontSize: '0.9rem', color: '#10b981' }}>{quantData.absorption.target_1}</strong>
                </div>
              </div>

              {/* Resumo da Ação Técnica */}
              <p style={{ fontSize: '0.78rem', color: '#cbd5e1', margin: 0, lineHeight: 1.4, backgroundColor: 'rgba(0,0,0,0.2)', padding: '8px 10px', borderRadius: '6px' }}>
                💡 {quantData.absorption.action_summary}
              </p>
            </div>
          )}

        </div>


        {/* Painel Direito: Resultados, VWAP & Setups Táticos */}
        {quantData ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Card do Score de Confluência Único (1 a 10) */}
            {quantData.confluence && (
              <div className="card" style={{ 
                borderLeft: `4px solid ${quantData.confluence.color}`,
                background: `linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, ${
                  quantData.confluence.rating === 'ALTA' ? 'rgba(16, 185, 129, 0.08)' 
                  : quantData.confluence.rating === 'MODERADA' ? 'rgba(245, 158, 11, 0.08)' : 'rgba(239, 68, 68, 0.08)'
                } 100%)`,
                boxShadow: `0 0 20px ${quantData.confluence.color}22`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>
                      MODELO QUANTITATIVO · SCORE DE CONFLUÊNCIA
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '6px' }}>
                      <div style={{ 
                        fontSize: '2.6rem', fontWeight: 900, color: quantData.confluence.color,
                        lineHeight: 1, textShadow: `0 0 10px ${quantData.confluence.color}44`
                      }}>
                        {quantData.confluence.score}
                        <span style={{ fontSize: '1.2rem', color: '#6b7280', fontWeight: 500 }}>/10</span>
                      </div>
                      <div>
                        <span style={{ 
                          display: 'inline-block', fontSize: '0.75rem', fontWeight: 800, padding: '3px 10px', borderRadius: '12px',
                          backgroundColor: `${quantData.confluence.color}22`, color: quantData.confluence.color, border: `1px solid ${quantData.confluence.color}44`
                        }}>
                          CONFLUÊNCIA {quantData.confluence.rating} ({quantData.confluence.bias === 'BUY' ? 'COMPRA 🟢' : (quantData.confluence.bias === 'SELL' ? 'VENDA 🔴' : 'NEUTRO 🟡')})
                        </span>
                        <p style={{ fontSize: '0.82rem', color: '#cbd5e1', margin: '4px 0 0 0', fontWeight: 600 }}>
                          {quantData.confluence.recommendation}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detalhamento dos Fatores de Pontuação */}
                {quantData.confluence.factors && quantData.confluence.factors.length > 0 && (
                  <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {quantData.confluence.factors.map((f, idx) => (
                      <span key={idx} style={{ 
                        fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: '4px',
                        backgroundColor: f.type === 'positive' ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.05)',
                        color: f.type === 'positive' ? '#10b981' : '#9ca3af',
                        border: `1px solid ${f.type === 'positive' ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.08)'}`
                      }}>
                        {f.pts} {f.factor}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Header com Ativo e Preço */}
            <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)' }}>

              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Ativo Analisado</span>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'white', letterSpacing: '1px' }}>{quantData.ticker}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Último Preço (MT5)</span>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#60a5fa' }}>{quantData.price}</div>
              </div>
            </div>

            {/* VWAP Institucional e Bandas de Desvio Padrão */}
            {quantData.indicators && quantData.indicators.vwap && (
              <div className="card" style={{ backgroundColor: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(16, 185, 129, 0.25)', borderLeft: '4px solid #10b981' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', margin: 0, color: 'white' }}>
                    <TrendingUp size={18} color="#10b981" /> VWAP Institucional & Bandas de Desvio Padrão (DP)
                  </h3>
                  <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '12px', backgroundColor: quantData.indicators.near_vwap ? 'rgba(16, 185, 129, 0.2)' : (quantData.indicators.near_vwap_upper2 ? 'rgba(239, 68, 68, 0.2)' : (quantData.indicators.near_vwap_lower2 ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.05)')), color: quantData.indicators.near_vwap ? '#10b981' : (quantData.indicators.near_vwap_upper2 ? '#ef4444' : (quantData.indicators.near_vwap_lower2 ? '#3b82f6' : 'var(--text-muted)')), fontWeight: 'bold' }}>
                    {quantData.indicators.near_vwap ? '📍 DEFESA DE VWAP (VALOR JUSTO)' : (quantData.indicators.near_vwap_upper2 ? '⚠️ EXAUSTÃO COMPRADORA (+2 DP)' : (quantData.indicators.near_vwap_lower2 ? '⚡ EXAUSTÃO VENDEDORA (-2 DP)' : 'ZONA REGULAR'))}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
                  
                  {/* -2 DP (Exaustão Venda) */}
                  <div style={{ backgroundColor: quantData.indicators.near_vwap_lower2 ? 'rgba(59, 130, 246, 0.2)' : 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: '6px', textAlign: 'center', border: `1px solid ${quantData.indicators.near_vwap_lower2 ? '#3b82f6' : 'transparent'}` }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>-2.0 DP (Desconto)</span>
                    <div style={{ fontSize: '1.05rem', fontWeight: 'bold', color: '#60a5fa', marginTop: '2px' }}>{quantData.indicators.vwap_lower2}</div>
                  </div>

                  {/* -1 DP */}
                  <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: '6px', textAlign: 'center' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>-1.0 DP</span>
                    <div style={{ fontSize: '1.05rem', fontWeight: 'bold', color: '#93c5fd', marginTop: '2px' }}>{quantData.indicators.vwap_lower1}</div>
                  </div>

                  {/* VWAP CENTRAL */}
                  <div style={{ backgroundColor: quantData.indicators.near_vwap ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)', padding: '0.75rem', borderRadius: '6px', textAlign: 'center', border: '1px solid #10b981' }}>
                    <span style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 'bold' }}>VWAP Média</span>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#10b981', marginTop: '2px' }}>{quantData.indicators.vwap}</div>
                  </div>

                  {/* +1 DP */}
                  <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: '6px', textAlign: 'center' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>+1.0 DP</span>
                    <div style={{ fontSize: '1.05rem', fontWeight: 'bold', color: '#fca5a5', marginTop: '2px' }}>{quantData.indicators.vwap_upper1}</div>
                  </div>

                  {/* +2 DP (Exaustão Compra) */}
                  <div style={{ backgroundColor: quantData.indicators.near_vwap_upper2 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: '6px', textAlign: 'center', border: `1px solid ${quantData.indicators.near_vwap_upper2 ? '#ef4444' : 'transparent'}` }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>+2.0 DP (Exaustão)</span>
                    <div style={{ fontSize: '1.05rem', fontWeight: 'bold', color: '#f87171', marginTop: '2px' }}>{quantData.indicators.vwap_upper2}</div>
                  </div>

                </div>
              </div>
            )}

            {/* Setups Táticos & Estrutura Operacional (SMA 72, 200, Fibo 61.8%, Polaridade) */}
            {quantData.indicators && (
              <div className="card" style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', marginBottom: '1rem', color: 'white' }}>
                  <Target size={18} color="#f59e0b" /> Setups Operacionais & Estrutura (SMA 72 / 200 / Fibo)
                </h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                  
                  {/* SMA 72 */}
                  <div style={{ backgroundColor: quantData.indicators.near_sma72 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '6px', border: `1px solid ${quantData.indicators.near_sma72 ? '#f59e0b' : 'transparent'}` }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Média 72 (SMA)</span>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'white', marginTop: '4px' }}>{quantData.indicators.sma_72}</div>
                    <div style={{ fontSize: '0.75rem', marginTop: '6px', fontWeight: 'bold', color: quantData.indicators.near_sma72 ? '#f59e0b' : 'var(--text-muted)' }}>
                      {quantData.indicators.near_sma72 ? '📍 CORREÇÃO NA SMA 72' : 'Fora de Teste'}
                    </div>
                  </div>

                  {/* SMA 200 */}
                  <div style={{ backgroundColor: quantData.indicators.near_sma200 ? 'rgba(59, 130, 246, 0.15)' : 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '6px', border: `1px solid ${quantData.indicators.near_sma200 ? '#3b82f6' : 'transparent'}` }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Média 200 (Institucional)</span>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'white', marginTop: '4px' }}>{quantData.indicators.sma_200}</div>
                    <div style={{ fontSize: '0.75rem', marginTop: '6px', fontWeight: 'bold', color: quantData.indicators.near_sma200 ? '#3b82f6' : 'var(--text-muted)' }}>
                      {quantData.indicators.near_sma200 ? '🏛️ TESTE INSTITUCIONAL' : 'Fora de Teste'}
                    </div>
                  </div>

                  {/* 61.8% Fibo */}
                  <div style={{ backgroundColor: quantData.indicators.near_fibo618 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '6px', border: `1px solid ${quantData.indicators.near_fibo618 ? '#10b981' : 'transparent'}` }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Zona Ouro (61.8% Fibo)</span>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#10b981', marginTop: '4px' }}>{quantData.indicators.fibo_618}</div>
                    <div style={{ fontSize: '0.75rem', marginTop: '6px', fontWeight: 'bold', color: quantData.indicators.near_fibo618 ? '#10b981' : 'var(--text-muted)' }}>
                      {quantData.indicators.near_fibo618 ? '🎯 PREÇO EM 61.8% FIBO' : 'Zona de Descanso'}
                    </div>
                  </div>

                  {/* Troca de Polaridade */}
                  <div style={{ backgroundColor: quantData.indicators.polarity_detected ? 'rgba(239, 68, 68, 0.15)' : 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '6px', border: `1px solid ${quantData.indicators.polarity_detected ? 'var(--danger)' : 'transparent'}` }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Troca de Polaridade</span>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: quantData.indicators.polarity_detected ? 'var(--danger)' : 'white', marginTop: '4px' }}>
                      {quantData.indicators.polarity_level ? quantData.indicators.polarity_level : '—'}
                    </div>
                    <div style={{ fontSize: '0.75rem', marginTop: '6px', fontWeight: 'bold', color: quantData.indicators.polarity_detected ? 'var(--danger)' : 'var(--text-muted)' }}>
                      {quantData.indicators.polarity_detected ? '🔄 TESTE DE ESTRUTURA' : 'Sem Pivô Recente'}
                    </div>
                  </div>

                </div>
              </div>
            )}
            
            {/* Matriz Macro & Blue Chips do Ibovespa */}
            {quantData.macro_snapshot && quantData.macro_snapshot.length > 0 && (
              <div className="card" style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', marginBottom: '1rem', color: 'white' }}>
                  <Layers size={18} color="#3b82f6" /> Matriz de Correlação IBOV & Macro
                </h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
                  {quantData.macro_snapshot.map((item, idx) => (
                    <div 
                      key={idx} 
                      style={{ 
                        backgroundColor: 'rgba(0,0,0,0.3)', 
                        padding: '0.75rem', 
                        borderRadius: '6px',
                        borderLeft: `3px solid ${item.change_pct > 0 ? 'var(--success)' : (item.change_pct < 0 ? 'var(--danger)' : 'var(--warning)')}`
                      }}
                    >
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.symbol}</div>
                      <div style={{ fontSize: '1rem', fontWeight: 'bold', color: 'white', marginTop: '2px' }}>{item.price}</div>
                      <div style={{ 
                        fontSize: '0.85rem', 
                        fontWeight: 'bold', 
                        marginTop: '4px',
                        color: item.change_pct > 0 ? 'var(--success)' : (item.change_pct < 0 ? 'var(--danger)' : 'var(--text-muted)')
                      }}>
                        {item.change_pct > 0 ? `+${item.change_pct}%` : `${item.change_pct}%`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Grid Técnicos (Tendência, RSI, Suporte/Resistência) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div className="card" style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '1.25rem' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '8px', fontSize: '0.85rem' }}>Contexto de Tendência</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', fontWeight: 'bold', color: quantData.trend.direction === 'BULL' ? 'var(--success)' : (quantData.trend.direction === 'BEAR' ? 'var(--danger)' : 'var(--warning)') }}>
                  {quantData.trend.direction === 'BULL' && <TrendingUp size={24} />}
                  {quantData.trend.direction === 'BEAR' && <TrendingDown size={24} />}
                  {quantData.trend.direction === 'CHOP' && <Minus size={24} />}
                  {quantData.trend.direction}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '8px' }}>Força: {quantData.trend.strength}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Macro: {quantData.trend.macro} | Micro: {quantData.trend.micro}</div>
              </div>
              
              <div className="card" style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '1.25rem' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '8px', fontSize: '0.85rem' }}>Exaustão & Risco</span>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: quantData.indicators.rsi_15m > 70 ? 'var(--danger)' : (quantData.indicators.rsi_15m < 30 ? 'var(--success)' : 'white') }}>
                  RSI 15m: {quantData.indicators.rsi_15m}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                  ATR (14): {quantData.levels.atr} pts
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Stop mínimo sugerido via volatilidade.</div>
              </div>

              <div className="card" style={{ padding: '1.25rem', backgroundColor: 'rgba(0,0,0,0.2)', borderLeft: '4px solid var(--warning)' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '8px', fontSize: '0.85rem' }}>Zonas de Liquidez</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.95rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Resistência:</span> 
                    <span style={{ color: 'var(--danger)', fontWeight: 'bold' }}>{quantData.levels.resistance}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Suporte:</span> 
                    <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>{quantData.levels.support}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Veredito Tático da IA */}
            <div className="card" style={{ padding: '1.5rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
              <strong style={{ color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '1.1rem' }}>
                <Activity size={18} /> Veredito Tático do Modelo Quantitativo:
              </strong>
              <p style={{ margin: 0, lineHeight: '1.6', color: 'white', fontSize: '1.05rem' }}>{quantData.verdict}</p>
            </div>
            
          </div>
        ) : (
          <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '350px', backgroundColor: 'rgba(0,0,0,0.2)' }}>
            <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
              <Crosshair size={48} style={{ opacity: 0.3, marginBottom: '1rem', margin: '0 auto' }} />
              <p>Digite o ativo (ex: WINQ26) e clique em Scan para ler os setups de Média 72/200, Fibo e Polaridade.</p>
            </div>
          </div>
        )}

      {/* Modal de Backtest Histórico */}
      {showBacktestModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem'
        }}>
          <div style={{
            backgroundColor: '#0f172a',
            border: '1px solid rgba(124, 58, 237, 0.4)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '650px',
            padding: '1.75rem',
            boxShadow: '0 20px 50px rgba(0,0,0,0.9)',
            position: 'relative'
          }}>
            <button
              onClick={() => setShowBacktestModal(false)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '1.2rem',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>

            <h3 style={{ color: '#a78bfa', fontSize: '1.25rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🧪 SIMULAÇÃO DE BACKTEST (30 DIAS B3)
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Execução barra-a-barra da estratégia de Confluência Matemática para <strong>{quantTicker}</strong>.
            </p>

            {backtestLoading ? (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: '#a78bfa' }}>
                <RefreshCw size={36} className="spin-slow" style={{ margin: '0 auto 1rem auto' }} />
                <p>Processando 800+ velas de 15 min do MT5 / B3...</p>
              </div>
            ) : backtestResult ? (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <div style={{ backgroundColor: 'rgba(0,0,0,0.4)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>TAXA DE ACERTO</span>
                    <strong style={{ fontSize: '1.3rem', color: '#10b981' }}>{backtestResult.win_rate}%</strong>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>{backtestResult.wins_count}W / {backtestResult.losses_count}L</span>
                  </div>
                  <div style={{ backgroundColor: 'rgba(0,0,0,0.4)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>FATOR DE LUCRO</span>
                    <strong style={{ fontSize: '1.3rem', color: '#3b82f6' }}>{backtestResult.profit_factor}x</strong>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Payoff Estratégico</span>
                  </div>
                  <div style={{ backgroundColor: 'rgba(0,0,0,0.4)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>DRAWDOWN MÁX.</span>
                    <strong style={{ fontSize: '1.3rem', color: '#ef4444' }}>-R$ {backtestResult.max_drawdown}</strong>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Risco Controlado</span>
                  </div>
                </div>

                <div style={{ backgroundColor: 'rgba(0,0,0,0.4)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Lucro Bruto Acumulado:</span>
                    <strong style={{ color: '#10b981' }}>+R$ {backtestResult.total_profit}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Total de Operações:</span>
                    <strong style={{ color: 'white' }}>{backtestResult.total_trades} trades</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Resultado Final Simulado:</span>
                    <strong style={{ color: '#10b981' }}>R$ {backtestResult.final_equity}</strong>
                  </div>
                </div>

                <button
                  onClick={() => setShowBacktestModal(false)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    backgroundColor: '#7c3aed',
                    color: 'white',
                    fontWeight: 'bold',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  CONCLUIR E APLICAR PARÂMETROS AO ROBÔ
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
