
import { useState, useEffect } from 'react';
import { NavLink, useOutlet, useLocation } from 'react-router-dom';
import CommandPalette from '../components/CommandPalette';
import {
  Calculator,
  TrendingUp,
  BookOpen,
  History,
  Crosshair,
  Beaker,
  Bot,
  Map,
  CheckSquare,
  ActivitySquare,
  Home,
  ShieldAlert,
  GitCompare,
  Briefcase,
  LogOut,
  Sun,
  Moon,
  BarChart2,
  Newspaper,
  FileText,
  Brain,
  Search,
  Menu,
  X,
  Crown
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { getTrialStatus, PRICING_CONFIG, isAdminUser } from '../services/trialService';

const PlatformLayout = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const outlet = useOutlet();
  const [isCmdPaletteOpen, setIsCmdPaletteOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsCmdPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navGroups = [
    {
      title: 'OPERACIONAL',
      items: [
        { path: '/app', label: 'Início', icon: <Home size={18} /> },
        { path: '/app/rotina', label: 'Rotina Diária', icon: <CheckSquare size={18} /> },
        { path: '/app/abertura', label: 'Abertura', icon: <Calculator size={18} /> },
        { path: '/app/diario', label: 'Diário do Dia', icon: <BookOpen size={18} /> },
        { path: '/app/historico', label: 'Histórico', icon: <History size={18} /> },
      ]
    },
    {
      title: 'INTEL & QUANT',
      items: [
        { path: '/app/quant', label: 'Radar Quant', icon: <BarChart2 size={18} /> },
        { path: '/app/raiox', label: 'Raio-X RP', icon: <Crosshair size={18} /> },
        { path: '/app/noticias', label: 'Notícias & Calendário', icon: <Newspaper size={18} /> },
        { path: '/app/laboratorio', label: 'Laboratório', icon: <Beaker size={18} /> },
        { path: '/app/goatia', label: 'A GOAT IA', icon: <Bot size={18} /> },
      ]
    },
    {
      title: 'GESTÃO & RISCO',
      items: [
        { path: '/app/calculadora', label: 'Gestão de Risco & MC', icon: <ShieldAlert size={18} /> },
        { path: '/app/evolucao', label: 'Evolução do Trader', icon: <TrendingUp size={18} /> },
        { path: '/app/psicologia', label: 'Psicologia', icon: <Brain size={18} /> },
        { path: '/app/correlacao', label: 'Correlação', icon: <GitCompare size={18} /> },
        { path: '/app/carteiras', label: 'Carteiras B3', icon: <Briefcase size={18} /> },
        { path: '/app/imposto', label: 'Imposto de Renda', icon: <FileText size={18} /> },
        { path: '/app/plano', label: 'Plano & Jornada', icon: <Map size={18} /> },
      ]
    }
  ];

  if (isAdminUser(user)) {
    navGroups.push({
      title: 'ADMINISTRADOR',
      items: [
        { path: '/app/admin', label: 'Painel Admin Master', icon: <Crown size={18} color="#fbbf24" /> }
      ]
    });
  }

  const flatNavItems = navGroups.flatMap(g => g.items);

  return (
    <div className="platform-layout">
      <CommandPalette 
        isOpen={isCmdPaletteOpen} 
        onClose={() => setIsCmdPaletteOpen(false)} 
        navItems={flatNavItems} 
      />

      {/* Mobile Top Header Bar */}
      <header className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <ActivitySquare size={22} color="var(--primary-accent)" />
          <span style={{ fontSize: '1rem', fontWeight: 800, letterSpacing: '0.04em', color: 'var(--text-main)' }}>GOAT TRADER</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button 
            onClick={() => setIsCmdPaletteOpen(true)}
            aria-label="Buscar"
            className="mobile-header-btn"
          >
            <Search size={18} />
          </button>
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Menu"
            className="mobile-header-btn"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Mobile Backdrop Overlay */}
      {isMobileMenuOpen && (
        <div className="mobile-drawer-overlay" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`sidebar glass-panel ${isMobileMenuOpen ? 'mobile-open' : ''}`} style={{ backgroundColor: 'var(--tactic-sidebar)', borderRight: '1px solid var(--border-subtle)' }}>
        <div className="sidebar-header" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ActivitySquare size={26} color="var(--primary-accent)" />
            <h1 style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '0.04em', color: 'var(--text-main)', margin: 0 }}>
              GOAT TRADER <span style={{ fontSize: '0.6rem', fontWeight: 800, padding: '2px 8px', background: 'linear-gradient(135deg, #38bdf8, #3b82f6)', color: '#0f172a', borderRadius: '12px', verticalAlign: 'middle', marginLeft: '4px', textTransform: 'uppercase' }}>PRO QUANT</span>
            </h1>
          </div>
          <button 
            className="mobile-close-btn"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        {/* Command Palette Trigger Button */}
        <button
          onClick={() => setIsCmdPaletteOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.5rem 0.75rem',
            marginBottom: '1rem',
            borderRadius: '7px',
            background: 'var(--tactic-btn-bg)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: '0.8rem',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Search size={14} />
            <span>Buscar menu...</span>
          </div>
          <span style={{
            fontSize: '0.65rem',
            background: 'var(--border-subtle)',
            padding: '2px 5px',
            borderRadius: '4px',
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-main)'
          }}>
            Ctrl K
          </span>
        </button>
        
        <nav className="nav-menu" style={{ gap: '1.25rem' }}>
          {navGroups.map((group) => (
            <div key={group.title}>
              <div style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                color: 'var(--text-muted)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                padding: '0 0.75rem',
                marginBottom: '0.4rem',
                fontFamily: 'var(--font-mono)',
                opacity: 0.85
              }}>
                {group.title}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {group.items.map((item) => (
                  <NavLink 
                    key={item.path} 
                    to={item.path} 
                    end={item.path === '/app'}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    style={{ fontSize: '0.85rem', padding: '0.5rem 0.75rem' }}
                  >
                    {item.icon}
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
        
        <div style={{ padding: '0.75rem 1rem 1rem', marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          
          {/* Banner de Teste VIP de 5 Dias / Upgrade */}
          {(() => {
            const trial = getTrialStatus(user);
            return (
              <div style={{
                background: trial.isPro
                  ? 'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(15,23,42,0.6) 100%)'
                  : 'linear-gradient(135deg, rgba(56,189,248,0.15) 0%, rgba(30,41,59,0.8) 100%)',
                border: `1px solid ${trial.isPro ? 'rgba(16,185,129,0.3)' : 'rgba(56,189,248,0.3)'}`,
                borderRadius: '10px',
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: trial.isPro ? '#10b981' : '#38bdf8', letterSpacing: '0.05em' }}>
                    {trial.isPro ? '● ASSINANTE PRO' : '⚡ TESTE VIP 5 DIAS'}
                  </span>
                  {!trial.isPro && (
                    <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600 }}>
                      {trial.daysLeft}d {trial.hoursLeft}h restantes
                    </span>
                  )}
                </div>
                
                {!trial.isPro && (
                  <>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#cbd5e1', lineHeight: 1.3 }}>
                      Acesse a GOAT IA 2.5, FinGPT e Trava de Risco por apenas <strong>{PRICING_CONFIG.monthlyFormatted}/mês</strong>.
                    </p>
                    <a
                      href={PRICING_CONFIG.asaasCheckoutUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'block',
                        textAlign: 'center',
                        textDecoration: 'none',
                        background: '#38bdf8',
                        color: '#0f172a',
                        fontWeight: 800,
                        fontSize: '0.75rem',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        marginTop: '2px',
                        transition: 'opacity 0.2s'
                      }}
                    >
                      Assinar GOAT PRO ({PRICING_CONFIG.monthlyFormatted})
                    </a>
                  </>
                )}
              </div>
            );
          })()}

          <button 
            onClick={toggleTheme}
            className="nav-item"
            style={{ background: 'transparent', border: 'none', width: '100%', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            {theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
          </button>
          <button 
            onClick={logout}
            className="nav-item"
            style={{ background: 'transparent', border: 'none', width: '100%', cursor: 'pointer', color: 'var(--danger)' }}
          >
            <LogOut size={20} />
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <div key={location.pathname} style={{ width: '100%', minHeight: '100%' }}>
          {outlet}
        </div>
      </main>
    </div>
  );
};

export default PlatformLayout;
