import { Link } from 'react-router-dom';
import { AlertOctagon, ArrowLeft, Home } from 'lucide-react';

const NotFound = () => {
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
        maxWidth: '500px',
        padding: '3rem 2rem',
        borderRadius: '20px',
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 30px 60px rgba(0,0,0,0.6)'
      }}>
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: 'rgba(239, 68, 68, 0.15)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1.5rem',
          border: '1px solid rgba(239, 68, 68, 0.3)'
        }}>
          <AlertOctagon size={36} color="#ef4444" />
        </div>

        <h1 style={{ fontSize: '4rem', fontWeight: 900, margin: 0, color: '#ef4444', lineHeight: 1 }}>404</h1>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.75rem 0 1rem 0' }}>Página Não Encontrada</h2>
        <p style={{ color: 'var(--text-muted, #94a3b8)', lineHeight: 1.6, marginBottom: '2rem', fontSize: '0.95rem' }}>
          O sinal operacional foi interrompido ou este link não existe mais no Cockpit do GOAT TRADER.
        </p>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <Link to="/" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.85rem 1.5rem',
            borderRadius: '10px',
            background: 'var(--primary-accent, #38bdf8)',
            color: '#0f172a',
            fontWeight: 800,
            textDecoration: 'none',
            fontSize: '0.9rem'
          }}>
            <Home size={18} /> Início
          </Link>
          <Link to="/app" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.85rem 1.5rem',
            borderRadius: '10px',
            background: 'rgba(255, 255, 255, 0.05)',
            color: 'var(--text-main, #fff)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            fontWeight: 700,
            textDecoration: 'none',
            fontSize: '0.9rem'
          }}>
            <ArrowLeft size={18} /> Ir para a Plataforma
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
