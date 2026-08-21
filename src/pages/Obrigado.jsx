import { Link } from 'react-router-dom';
import { CheckCircle2, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

const Obrigado = () => {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-main, #0b0d14)',
      color: 'var(--text-main, #fff)',
      padding: '2rem',
      textAlign: 'center',
      fontFamily: 'Outfit, sans-serif'
    }}>
      <div style={{
        maxWidth: '540px',
        padding: '3.5rem 2.5rem',
        borderRadius: '24px',
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(56, 189, 248, 0.2)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 30px 60px rgba(0,0,0,0.6)'
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: 'rgba(16, 185, 129, 0.15)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1.5rem',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          boxShadow: '0 0 30px rgba(16,185,129,0.3)'
        }}>
          <CheckCircle2 size={44} color="#10b981" />
        </div>

        <span style={{
          fontSize: '0.75rem',
          fontWeight: 800,
          color: '#38bdf8',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          padding: '4px 12px',
          borderRadius: '20px',
          background: 'rgba(56,189,248,0.1)',
          border: '1px solid rgba(56,189,248,0.2)'
        }}>
          ACECSSO CONFIRMADO — 5 DIAS VIP ATIVADOS
        </span>

        <h1 style={{ fontSize: '2.25rem', fontWeight: 800, margin: '1rem 0 0.5rem 0', color: 'var(--text-main, #fff)' }}>
          Seja bem-vindo ao GOAT TRADER! 🎉
        </h1>
        <p style={{ color: 'var(--text-muted, #94a3b8)', lineHeight: 1.6, marginBottom: '2rem', fontSize: '1rem' }}>
          Seu acesso à inteligência quant, controle de drawdown e diário comportamental foi liberado com sucesso.
        </p>

        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px',
          padding: '1.25rem',
          textAlign: 'left',
          marginBottom: '2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: '#e2e8f0' }}>
            <Zap size={18} color="#f59e0b" />
            <span><strong>Passo 1:</strong> Importe seu primeiro relatório do Profit Pro ou MT5</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: '#e2e8f0' }}>
            <ShieldCheck size={18} color="#38bdf8" />
            <span><strong>Passo 2:</strong> Defina seu limite de perda diária na Calculadora de Risco</span>
          </div>
        </div>

        <Link to="/app" style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          width: '100%',
          padding: '1rem',
          borderRadius: '12px',
          background: 'var(--primary-accent, #38bdf8)',
          color: '#0f172a',
          fontWeight: 800,
          textDecoration: 'none',
          fontSize: '1rem',
          boxShadow: '0 0 25px rgba(56,189,248,0.3)'
        }}>
          Acessar o Cockpit Agora <ArrowRight size={20} />
        </Link>
      </div>
    </div>
  );
};

export default Obrigado;
