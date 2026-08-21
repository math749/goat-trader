import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, ArrowRight, Lock, User, ArrowLeft, Activity, TrendingUp, DollarSign } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import './Login.css';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [terminalLogs, setTerminalLogs] = useState([
    { time: '19:30:14', type: 'sec', text: 'SOCKET SEGURO CONECTADO // STATUS: OK' },
    { time: '19:30:15', type: 'success', text: 'GERENCIAMENTO DE RISCO ATIVADO' },
    { time: '19:30:16', type: 'info', text: 'MONITORAMENTO DE MERCADO ATIVO' }
  ]);
  
  const [authError, setAuthError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const formRef = useRef(null);

  useEffect(() => {
    const logs = [
      'ALGORITMO M15 DETECTOU EXAUSTÃO',
      'CORRELAÇÃO DXY vs EUR/USD ATUALIZADA',
      'MÉTRICA SHARPE DA CARTEIRA: 2.84',
      'MÁXIMO DRAWDOWN DIÁRIO LIMITADO A 2%',
      'ESTADO EMOCIONAL: PLANO SEGUIDO',
      'INSIGHT DA GOAT IA GERADO',
      'DIÁRIO ATUALIZADO AUTOMATICAMENTE',
      'CALCULADORA DE RISCO PARAMETRIZADA'
    ];
    
    const interval = setInterval(() => {
      const randomLog = logs[Math.floor(Math.random() * logs.length)];
      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0];
      
      setTerminalLogs(prev => [
        ...prev.slice(1),
        { time: timeStr, type: 'info', text: randomLog }
      ]);
    }, 4000);
    
    return () => clearInterval(interval);
  }, []);

  useGSAP(() => {
    // Animate form in - Using fromTo for React 18 Strict Mode compatibility
    gsap.fromTo('.login-card', 
      { y: 50, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 1,
        ease: 'power3.out'
      }
    );
  }, []);

  const toggleMode = (mode) => {
    if ((mode === 'login' && isLogin) || (mode === 'register' && !isLogin)) return;
    
    // Capture current card height before transition
    const card = document.querySelector('.login-card');
    const startHeight = card.offsetHeight;
    const nextIsLogin = mode === 'login';

    // Fade out form content
    gsap.to(formRef.current, {
      opacity: 0,
      x: nextIsLogin ? -15 : 15,
      duration: 0.15,
      onComplete: () => {
        setIsLogin(nextIsLogin);
        // Clear fields
        setName('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        
        // Wait for next tick so React renders new fields, then measure the new height
        setTimeout(() => {
          const endHeight = card.offsetHeight;
          
          // Animate card height smoothly
          gsap.fromTo(card,
            { height: startHeight },
            { 
              height: endHeight, 
              duration: 0.35, 
              ease: 'power3.out',
              clearProps: 'height'
            }
          );
          
          // Fade in new form content
          gsap.fromTo(formRef.current, 
            { opacity: 0, x: nextIsLogin ? 15 : -15 },
            { opacity: 1, x: 0, duration: 0.25, ease: 'power2.out' }
          );
        }, 0);
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setIsSubmitting(true);

    try {
      if (isLogin) {
        if (email && password) {
          await login(email, password);
          navigate('/app');
        }
      } else {
        if (password !== confirmPassword) {
          setAuthError('As senhas digitadas não coincidem.');
          setIsSubmitting(false);
          return;
        }

        if (name && email && password) {
          await register(email, password, name);
          navigate('/app');
        }
      }
    } catch (err) {
      setAuthError(err.message || 'Erro ao autenticar. Verifique suas credenciais.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-container">
      {/* Aurora and Grid Background */}
      <div className="hero-grid-overlay"></div>
      <div className="aurora-container">
        <div className="aurora-orb orb-1"></div>
        <div className="aurora-orb orb-2"></div>
        <div className="aurora-orb orb-3"></div>
      </div>
      <div className="hero-radial-wash"></div>

      <div className="login-split-wrapper">
        {/* Left Side: Interactive Live Dashboard Preview */}
        <div className="login-preview-side">
          <div className="preview-glass">
            <div className="terminal-header">
              <span className="terminal-dot red"></span>
              <span className="terminal-dot yellow"></span>
              <span className="terminal-dot green"></span>
              <span className="terminal-title">MATILHA MONITOR // LIVE_FEED</span>
            </div>
            
            <div className="terminal-content">
              {terminalLogs.map((log, index) => (
                <div key={index} className="terminal-row">
                  <span className="term-timestamp">[{log.time}]</span>
                  <span className={`term-${log.type}`}>{log.text}</span>
                </div>
              ))}
            </div>

            {/* Glowing Widget Grid */}
            <div className="preview-widget-grid">
              <div className="preview-widget">
                <div className="widget-icon-row">
                  <Activity size={14} className="widget-icon-green" />
                  <span className="widget-label">Taxa de Acerto</span>
                </div>
                <span className="widget-value highlight-green">68.4%</span>
              </div>
              <div className="preview-widget">
                <div className="widget-icon-row">
                  <TrendingUp size={14} className="widget-icon-red" />
                  <span className="widget-label">Drawdown</span>
                </div>
                <span className="widget-value highlight-red">-1.2%</span>
              </div>
              <div className="preview-widget">
                <div className="widget-icon-row">
                  <DollarSign size={14} className="widget-icon-green" />
                  <span className="widget-label">P&L Diário</span>
                </div>
                <span className="widget-value highlight-green">+$1,450.00</span>
              </div>
            </div>

            {/* SVG Candlestick Chart */}
            <div className="preview-chart-wrapper">
              <span className="chart-label">Mercado em Tempo Real</span>
              <svg className="preview-svg-chart" viewBox="0 0 300 100">
                <path 
                  d="M 10 80 L 40 70 L 70 75 L 100 45 L 130 50 L 160 20 L 190 35 L 220 15 L 250 25 L 280 5" 
                  fill="none" 
                  stroke="url(#chart-grad)" 
                  strokeWidth="3"
                  strokeLinecap="round"
                  className="chart-line-anim"
                />
                <defs>
                  <linearGradient id="chart-grad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#2b5aff" />
                    <stop offset="50%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
        </div>

        {/* Right Side: Sleek Login Form */}
        <div className="login-form-side">
          <div className="login-card">
            <div className="login-header">
              <div className="login-icon-wrapper">
                <Shield className="login-icon" size={32} />
                <span className="login-brand">GOAT TRADER</span>
              </div>
              <h2>Acesso Restrito</h2>
              <p>Credenciais exigidas para acessar a infraestrutura.</p>
            </div>
            
            <div className="auth-tabs">
              <div 
                className={`auth-tab ${isLogin ? 'active' : ''}`}
                onClick={() => toggleMode('login')}
              >
                Entrar
              </div>
              <div 
                className={`auth-tab ${!isLogin ? 'active' : ''}`}
                onClick={() => toggleMode('register')}
              >
                Solicitar Acesso
              </div>
            </div>

            {authError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '0.65rem 1rem', borderRadius: '8px', fontSize: '0.82rem', marginBottom: '1rem', fontWeight: 600 }}>
                ⚠️ {authError}
              </div>
            )}

            <form ref={formRef} onSubmit={handleSubmit} className="login-form">
              {!isLogin && (
                <div className="form-group">
                  <label>Nome do Operador</label>
                  <div className="input-with-icon">
                    <User size={16} className="input-icon" />
                    <input 
                      type="text" 
                      placeholder="Nome Completo" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required={!isLogin}
                    />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>Email Corporativo</label>
                <input 
                  type="email" 
                  placeholder="trader@matilha.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                />
              </div>
              
              <div className="form-group">
                <label>Senha de Acesso</label>
                <div className="input-with-icon">
                  <Lock size={16} className="input-icon" />
                  <input 
                    type="password" 
                    placeholder="••••••••" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required 
                  />
                </div>
              </div>

              {!isLogin && (
                <div className="form-group">
                  <label>Confirmar Senha</label>
                  <div className="input-with-icon">
                    <Lock size={16} className="input-icon" />
                    <input 
                      type="password" 
                      placeholder="••••••••" 
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required={!isLogin}
                    />
                  </div>
                </div>
              )}
              
              <button type="submit" disabled={isSubmitting} className={`login-btn ${!isLogin ? 'register-btn' : ''}`}>
                {isSubmitting ? 'Autenticando...' : (isLogin ? 'Autenticar' : 'Criar Conta')}
                <ArrowRight size={18} />
              </button>
            </form>
            
            <div className="login-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Link to="/">
                <ArrowLeft size={14} /> Voltar para a Base
              </Link>
              <Link to="/termos" style={{ fontSize: '0.75rem', color: '#94a3b8', textDecoration: 'none' }}>
                Termos & Privacidade
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
