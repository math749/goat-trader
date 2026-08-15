import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Bot, MessageSquare, Zap, ShieldAlert, AlertOctagon, Settings, Send, Star, Trash2, Activity, Target, ShieldCheck, Shield, ShieldOff, ChevronDown, ChevronUp } from 'lucide-react';
import { useTrades } from '../contexts/TradeContext';
import { askGeminiMentorStream, askGeminiProactive } from '../services/gemini';
import ReactMarkdown from 'react-markdown';

const GoatIA = () => {
  const { getIAInsights, getMetrics, trades, reminders, addReminder, removeReminder } = useTrades();
  const iaInsights = useMemo(() => getIAInsights(), [getIAInsights]);
  const { toxicHour, currentDrawdownAlert, dailyDrawdownLimit, setDailyDrawdownLimit } = iaInsights;
  const metrics = useMemo(() => getMetrics(), [getMetrics]);
  
  const [showSettings, setShowSettings] = useState(false);
  
  // Chave lida do .env (VITE_GEMINI_API_KEY) — nunca hardcode aqui
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';

  // ── GOAT PROATIVO: Modo Vigia ────────────────────────────
  const [watchdogActive, setWatchdogActive] = useState(false);
  const [proactiveAlerts, setProactiveAlerts] = useState([]);
  const [watchdogCountdown, setWatchdogCountdown] = useState(60);
  const [showAlertPanel, setShowAlertPanel] = useState(true);
  const alertedTypesRef = useRef(new Set()); // evita alertas repetidos
  const watchdogIntervalRef = useRef(null);
  const countdownRef = useRef(null);

  // Calcula perdas consecutivas a partir do histórico
  const getConsecutiveLosses = useCallback(() => {
    const sorted = [...trades].sort((a, b) => new Date(b.date) - new Date(a.date));
    let count = 0;
    for (const t of sorted) {
      if ((t.result || 0) < 0) count++;
      else break;
    }
    return count;
  }, [trades]);

  // PnL do dia atual
  const getDailyPnl = useCallback(() => {
    const today = new Date().toISOString().slice(0, 10);
    return trades
      .filter(t => (t.date || '').slice(0, 10) === today)
      .reduce((acc, t) => acc + (t.result || 0), 0);
  }, [trades]);

  // Trades de hoje
  const getTradesToday = useCallback(() => {
    const today = new Date().toISOString().slice(0, 10);
    return trades.filter(t => (t.date || '').slice(0, 10) === today).length;
  }, [trades]);

  // Função principal do watchdog
  const runMonitor = useCallback(async () => {
    try {
      const body = {
        daily_pnl: getDailyPnl(),
        daily_drawdown_limit: dailyDrawdownLimit || 300,
        trades_today: getTradesToday(),
        consecutive_losses: getConsecutiveLosses(),
        toxic_hour: toxicHour ? toxicHour.hour : null,
      };
      const resp = await fetch('http://127.0.0.1:8000/monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!resp.ok) return;
      const data = await resp.json();
      setProactiveAlerts(data.alerts || []);

      // Filtra apenas alertas ainda não notificados nesta sessão
      const newAlerts = (data.alerts || []).filter(a => !alertedTypesRef.current.has(a.type));
      if (newAlerts.length === 0) return;

      // Marca como notificados
      newAlerts.forEach(a => alertedTypesRef.current.add(a.type));

      // Som de alerta
      const hasHigh = newAlerts.some(a => a.severity === 'HIGH');
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const freqs = hasHigh ? [880, 660, 440] : [660, 880];
        freqs.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain); gain.connect(ctx.destination);
          osc.frequency.value = freq;
          osc.type = 'triangle';
          gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.15);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.3);
          osc.start(ctx.currentTime + i * 0.15);
          osc.stop(ctx.currentTime + i * 0.15 + 0.35);
        });
      } catch (e) {
        console.warn('Erro ao tocar áudio:', e);
      }

      // Push notification
      if (Notification.permission === 'granted' && hasHigh) {
        new Notification('🚨 GOAT IA — Alerta Crítico!', {
          body: newAlerts.filter(a => a.severity === 'HIGH').map(a => a.title).join(' | '),
          icon: '/favicon.ico'
        });
      }

      // Gera intervenção da IA no chat
      if (apiKey && newAlerts.length > 0) {
        const fullMetrics = { ...metrics, toxicHour };
        setChatMessages(prev => [
          ...prev,
          { role: 'ai', text: '', isProactive: true }
        ]);
        setIsTyping(true);
        try {
          const stream = askGeminiProactive(apiKey, newAlerts, fullMetrics);
          for await (const chunk of stream) {
            setChatMessages(prev => {
              const msgs = [...prev];
              msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], text: msgs[msgs.length - 1].text + chunk };
              return msgs;
            });
          }
        } catch (e) {
          console.warn('Erro ao obter resposta do Gemini:', e);
        }
        setIsTyping(false);
      }
    } catch (err) {
      console.warn('[Watchdog] Erro no monitor:', err.message);
    }
  }, [getDailyPnl, getTradesToday, getConsecutiveLosses, dailyDrawdownLimit, toxicHour, apiKey, metrics]);

  const runMonitorRef = useRef(runMonitor);
  useEffect(() => {
    runMonitorRef.current = runMonitor;
  }, [runMonitor]);

  // Ativa/desativa watchdog
  useEffect(() => {
    if (watchdogActive) {
      runMonitorRef.current(); // Executa imediatamente ao ativar
      setWatchdogCountdown(60);
      watchdogIntervalRef.current = setInterval(() => {
        runMonitorRef.current();
        setWatchdogCountdown(60);
      }, 60000);
      countdownRef.current = setInterval(() => {
        setWatchdogCountdown(c => c > 0 ? c - 1 : 60);
      }, 1000);
    } else {
      clearInterval(watchdogIntervalRef.current);
      clearInterval(countdownRef.current);
      setProactiveAlerts([]);
      alertedTypesRef.current.clear();
    }
    return () => {
      clearInterval(watchdogIntervalRef.current);
      clearInterval(countdownRef.current);
    };
  }, [watchdogActive]);

  // Gemini Chat States
  const [chatMessages, setChatMessages] = useState([
    { role: 'ai', text: 'Olá! Sou o GOAT, seu Risk Manager Institucional. Eu uso matemática e psicologia para impedir que você devolva dinheiro pro mercado. Como posso te ajudar hoje?' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);



  // Auto-scroll para a última mensagem
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const sendToGemini = async (userText) => {
    if (!userText.trim()) return;

    setChatMessages(prev => [
      ...prev, 
      { role: 'user', text: userText },
      { role: 'ai', text: '' }
    ]);
    setIsTyping(true);

    try {
      const fullMetrics = { ...metrics, toxicHour };
      const stream = askGeminiMentorStream(apiKey, userText, trades, fullMetrics);
      for await (const chunk of stream) {
        setChatMessages(prev => {
          const newMessages = [...prev];
          const lastIndex = newMessages.length - 1;
          newMessages[lastIndex] = {
            ...newMessages[lastIndex],
            text: newMessages[lastIndex].text + chunk
          };
          return newMessages;
        });
      }
    } catch (err) {
      setChatMessages(prev => {
        const newMessages = [...prev];
        const lastIndex = newMessages.length - 1;
        newMessages[lastIndex] = {
          ...newMessages[lastIndex],
          text: `Erro: ${err.message}`
        };
        return newMessages;
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleSendMessage = () => {
    const txt = inputValue;
    setInputValue('');
    sendToGemini(txt);
  };

  const handleQuickAction = (action) => {
    let prompt = "";
    if (action === 'dia') prompt = "Faça uma análise dura do meu pregão de hoje e aponte meus erros e acertos principais (baseado nos dados).";
    if (action === 'raiox') prompt = "Faça um Raio-X implacável do meu histórico geral e identifique matematicamente meus 3 maiores comportamentos perdedores.";
    if (action === 'regras') prompt = "Com base nas minhas métricas matemáticas atuais, crie 3 Regras de Ouro inquebráveis focadas 100% no meu perfil de risco.";
    
    sendToGemini(prompt);
  };

  return (
    <div style={{ height: 'calc(100vh - 4rem)', display: 'flex', flexDirection: 'column', paddingBottom: '1rem' }}>
      <div className="page-header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <Bot size={28} color="var(--primary-accent)" /> A GOAT IA
          </h2>
          <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-muted)' }}>Edge Scanner Ativo e Gerenciamento de Risco Institucional</p>
        </div>
        
        {/* Barra de Ações Rápidas */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>

          <button onClick={() => handleQuickAction('dia')} className="action-button" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '6px' }} disabled={isTyping}>
            <Activity size={16} color="var(--success)" /> Resumo do Dia
          </button>
          <button onClick={() => handleQuickAction('raiox')} className="action-button" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '6px' }} disabled={isTyping}>
            <Target size={16} color="var(--danger)" /> Raio-X de Erros
          </button>
          <button onClick={() => handleQuickAction('regras')} className="action-button" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '6px' }} disabled={isTyping}>
            <ShieldCheck size={16} color="var(--warning)" /> Criar Regras
          </button>
        </div>
      </div>
      
      {/* ── PAINEL MODO VIGIA ─────────────────────────── */}
      <div style={{
        marginBottom: '1.25rem',
        border: watchdogActive
          ? `1px solid ${proactiveAlerts.some(a => a.severity === 'HIGH') ? 'rgba(239,68,68,0.6)' : 'rgba(245,158,11,0.5)'}`
          : '1px solid rgba(255,255,255,0.06)',
        borderRadius: '12px',
        background: watchdogActive
          ? (proactiveAlerts.some(a => a.severity === 'HIGH') ? 'rgba(239,68,68,0.08)' : 'rgba(30,41,59,0.6)')
          : 'rgba(255,255,255,0.02)',
        overflow: 'hidden',
        transition: 'all 0.3s',
      }}>
        {/* Header do painel */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', cursor: 'pointer' }}
          onClick={() => setShowAlertPanel(s => !s)}>
          {watchdogActive
            ? <Shield size={16} color={proactiveAlerts.some(a => a.severity === 'HIGH') ? '#ef4444' : '#f59e0b'} />
            : <ShieldOff size={16} color="#4b5563" />}
          <span style={{ fontWeight: 700, fontSize: '0.82rem', color: watchdogActive ? 'white' : '#6b7280', flex: 1 }}>
            MODO VIGIA
            {watchdogActive && <span style={{ marginLeft: '8px', fontSize: '0.7rem', color: '#10b981', fontWeight: 400 }}>
              ● ATIVO — próxima verificação em {watchdogCountdown}s
            </span>}
            {!watchdogActive && <span style={{ marginLeft: '8px', fontSize: '0.7rem', color: '#4b5563', fontWeight: 400 }}>desativado</span>}
          </span>
          {proactiveAlerts.length > 0 && <span style={{
            background: proactiveAlerts.some(a => a.severity === 'HIGH') ? '#ef4444' : '#f59e0b',
            color: 'white', borderRadius: '10px', padding: '1px 8px', fontSize: '0.7rem', fontWeight: 800
          }}>{proactiveAlerts.length} alerta{proactiveAlerts.length !== 1 ? 's' : ''}</span>}
          <button
            onClick={e => { e.stopPropagation(); setWatchdogActive(w => !w); }}
            style={{
              padding: '4px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: '0.75rem',
              background: watchdogActive ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)',
              color: watchdogActive ? '#ef4444' : '#10b981',
              transition: 'all 0.2s',
            }}>{watchdogActive ? 'DESATIVAR' : 'ATIVAR'}</button>
          {showAlertPanel ? <ChevronUp size={14} color="#6b7280" /> : <ChevronDown size={14} color="#6b7280" />}
        </div>

        {/* Alertas */}
        {showAlertPanel && watchdogActive && (
          <div style={{ padding: '0 16px 12px' }}>
            {proactiveAlerts.length === 0 ? (
              <div style={{ color: '#4b5563', fontSize: '0.78rem', padding: '6px 0' }}>
                ✅ Nenhum alerta no momento. Sistema monitorando...
              </div>
            ) : (
              proactiveAlerts.map((alert, i) => (
                <div key={i} style={{
                  display: 'flex', flexDirection: 'column', gap: '2px',
                  padding: '8px 12px', marginBottom: '6px', borderRadius: '8px',
                  background: alert.severity === 'HIGH' ? 'rgba(239,68,68,0.12)'
                    : alert.severity === 'MEDIUM' ? 'rgba(245,158,11,0.1)' : 'rgba(99,102,241,0.08)',
                  borderLeft: `3px solid ${
                    alert.severity === 'HIGH' ? '#ef4444'
                    : alert.severity === 'MEDIUM' ? '#f59e0b' : '#818cf8'}`,
                }}>
                  <span style={{ fontWeight: 700, fontSize: '0.8rem', color: 'white' }}>
                    {alert.emoji} {alert.title}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{alert.message}</span>
                  <span style={{ fontSize: '0.72rem', color: '#60a5fa', fontWeight: 600 }}>→ {alert.action}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2.5fr', gap: '1.5rem', flex: 1, overflow: 'hidden' }}>
        
        {/* Painel Esquerdo: Insights e Regras ou Radar Quant */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', paddingRight: '0.5rem' }}>
          


          <div className="card" style={{ borderLeft: '4px solid var(--primary-accent)', position: 'relative', background: 'linear-gradient(135deg, rgba(30,41,59,0.5) 0%, rgba(15,23,42,0.8) 100%)' }}>
            <div style={{ position: 'absolute', top: '1rem', right: '1rem', cursor: 'pointer' }} onClick={() => setShowSettings(!showSettings)}>
              <Settings size={18} color="var(--text-muted)" />
            </div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', marginBottom: '0.5rem', color: 'white' }}>
              <Zap size={18} color="var(--primary-accent)" /> Inteligência Comportamental
            </h3>
            
            {showSettings ? (
              <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
                <div style={{ marginBottom: '0' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Definir Limite de Perda Diária (R$)</label>
                  <input 
                    type="number" 
                    value={dailyDrawdownLimit}
                    onChange={(e) => setDailyDrawdownLimit(Number(e.target.value))}
                    style={{ width: '100%', backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-subtle)', color: 'white', padding: '0.5rem', borderRadius: '4px' }}
                  />
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '0.95rem', lineHeight: '1.6', color: 'var(--text-muted)' }}>
                {toxicHour ? (
                  <p>O seu <strong>Horário Tóxico</strong> matemático é por volta das <strong style={{color: 'var(--danger)'}}>{toxicHour.hour}h</strong> (Saldo Negativo Acumulado: <strong style={{color: 'var(--danger)'}}>R$ {toxicHour.pnl}</strong>). O sistema recomenda bloqueio total de operações neste período.</p>
                ) : (
                  <p>Mais dados necessários para identificar seu Horário Tóxico estatístico.</p>
                )}
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px dashed var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span>Seu Payoff Geral:</span>
                    <strong style={{ color: metrics.payoff >= 1.5 ? 'var(--success)' : 'var(--danger)' }}>{metrics.payoff}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Win Rate Atual:</span>
                    <strong style={{ color: metrics.winRate >= 50 ? 'var(--success)' : 'var(--danger)' }}>{metrics.winRate}%</strong>
                  </div>
                </div>
              </div>
            )}
          </div>

          {currentDrawdownAlert ? (
            <div className="card" style={{ borderLeft: '4px solid var(--danger)', backgroundColor: currentDrawdownAlert.level === 'critical' ? 'rgba(239, 68, 68, 0.1)' : 'var(--card-bg)' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--danger)' }}>
                {currentDrawdownAlert.level === 'critical' ? <AlertOctagon size={18} color="var(--danger)" /> : <ShieldAlert size={18} color="var(--danger)" />} 
                {currentDrawdownAlert.level === 'critical' ? 'TRAVA DE RISCO ATIVADA' : 'ALERTA DE DRAWDOWN'}
              </h3>
              <p style={{ fontSize: '0.95rem', lineHeight: '1.5', color: currentDrawdownAlert.level === 'critical' ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: currentDrawdownAlert.level === 'critical' ? 'bold' : 'normal' }}>
                {currentDrawdownAlert.message}
              </p>
              {currentDrawdownAlert.level === 'critical' && (
                <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: 'var(--danger)', color: 'white', textAlign: 'center', borderRadius: '4px', fontWeight: 'bold' }}>
                  A PLATAFORMA SUGERE O ENCERRAMENTO DO PREGÃO HOJE.
                </div>
              )}
            </div>
          ) : (
             <div className="card" style={{ borderLeft: '4px solid var(--success)' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', marginBottom: '0.5rem', color: 'white' }}>
                <ShieldAlert size={18} color="var(--success)" /> Risco Controlado
              </h3>
              <p style={{ fontSize: '0.95rem', lineHeight: '1.5', color: 'var(--text-muted)' }}>
                Seu limite de drawdown está protegido. Siga fielmente sua gestão de lote.
              </p>
            </div>
          )}

          {/* Lembretes / Regras de Ouro (CONTRATO DE SANGUE) */}
          <div className="card" style={{ borderLeft: '4px solid var(--danger)', backgroundColor: 'rgba(239, 68, 68, 0.05)', flex: 1, overflowY: 'auto' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              <AlertOctagon size={18} color="var(--danger)" /> CONTRATO INQUEBRÁVEL
            </h3>
            {reminders.length === 0 ? (
              <div style={{ padding: '2rem 0', textAlign: 'center', opacity: 0.5 }}>
                <ShieldAlert size={32} style={{ marginBottom: '1rem', color: 'var(--danger)' }} />
                <p style={{ fontSize: '0.9rem', color: 'var(--danger)', margin: 0 }}>Nenhuma regra ativa.</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Use a IA para assinar suas regras de sobrevivência.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {reminders.map(rem => (
                  <div key={rem.id} style={{ 
                    backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: '4px', 
                    fontSize: '0.9rem', color: 'white', border: '1px solid rgba(239, 68, 68, 0.4)',
                    position: 'relative', borderLeft: '4px solid var(--danger)'
                  }}>
                    <button 
                      onClick={() => removeReminder(rem.id)}
                      style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', opacity: 0.7, transition: 'all 0.2s' }}
                      title="Quebrar Regra (Não Recomendado)"
                      onMouseOver={(e) => e.target.style.opacity = 1}
                      onMouseOut={(e) => e.target.style.opacity = 0.7}
                    >
                      <Trash2 size={16} />
                    </button>
                    <div className="markdown-body blood-contract" style={{ fontSize: '0.95rem', paddingRight: '1.5rem', lineHeight: '1.5', fontFamily: 'monospace' }}>
                      <ReactMarkdown>{rem.text}</ReactMarkdown>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chat com o GOAT */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
          <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'rgba(59, 130, 246, 0.2)', padding: '8px', borderRadius: '8px' }}>
              <MessageSquare size={20} color="var(--primary-accent)" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'white' }}>
                Terminal da IA
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Respostas baseadas em estatísticas puras</p>
            </div>
          </div>
          
          <div style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto', backgroundColor: 'var(--background-dark)' }}>
            {chatMessages.map((msg, index) => (
              <div key={index} style={{ 
                alignSelf: msg.role === 'ai' ? 'flex-start' : 'flex-end', 
                backgroundColor: msg.isProactive
                  ? 'rgba(245,158,11,0.08)'
                  : msg.role === 'ai' ? 'var(--card-bg)' : 'var(--primary-accent)', 
                color: 'white',
                padding: '1.25rem', 
                borderRadius: msg.role === 'ai' ? '2px 16px 16px 16px' : '16px 2px 16px 16px',
                maxWidth: '85%',
                border: msg.isProactive
                  ? '1px solid rgba(245,158,11,0.5)'
                  : msg.role === 'ai' ? '1px solid var(--border-subtle)' : 'none',
                lineHeight: '1.6',
                boxShadow: msg.isProactive ? '0 0 20px rgba(245,158,11,0.15)' : '0 4px 12px rgba(0,0,0,0.1)'
              }}>
                {msg.isProactive && (
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#f59e0b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Shield size={12} /> INTERVENÇÃO AUTOMÁTICA — MODO VIGIA
                  </div>
                )}
                {msg.role === 'ai' ? (
                  <div className="markdown-body" style={{ fontSize: '1rem' }}>
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                    {!(isTyping && index === chatMessages.length - 1) && msg.text && (
                      <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'flex-end' }}>
                        <button 
                          onClick={() => addReminder(msg.text)}
                          style={{ 
                            background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', color: 'var(--warning)', 
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem',
                            fontWeight: 'bold', padding: '6px 12px', borderRadius: '4px', transition: 'all 0.2s'
                          }}
                          onMouseOver={(e) => e.target.style.background = 'rgba(245, 158, 11, 0.2)'}
                          onMouseOut={(e) => e.target.style.background = 'rgba(245, 158, 11, 0.1)'}
                        >
                          <Star size={14} /> Salvar como Regra de Ouro
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <p style={{ fontSize: '1rem', margin: 0 }}>{msg.text}</p>
                )}
              </div>
            ))}
            {isTyping && (
              <div style={{ alignSelf: 'flex-start', backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-subtle)', padding: '1rem', borderRadius: '2px 16px 16px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bot size={18} color="var(--primary-accent)" className="animate-pulse" />
                <p style={{ fontSize: '0.9rem', margin: 0, color: 'var(--text-muted)' }}>Analisando dados matemáticos...</p>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          
          <div style={{ padding: '1.25rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: '0.75rem', backgroundColor: 'rgba(0,0,0,0.2)' }}>
            <input 
              type="text" 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Digite sua dúvida, peça para revisar seu dia ou digite /ajuda..." 
              disabled={isTyping}
              style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '1rem', borderRadius: '8px', fontSize: '0.95rem' }}
            />
            <button 
              className="btn-quant-primary" 
              onClick={handleSendMessage}
              disabled={isTyping}
              style={{ padding: '0.85rem 1.6rem', opacity: isTyping ? 0.5 : 1 }}
            >
              <Send size={18} /> Enviar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default GoatIA;

