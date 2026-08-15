import { Outlet, Link } from 'react-router-dom';
import { Bot } from 'lucide-react';
import './MarketingLayout.css';

const MarketingLayout = () => {
  return (
    <div className="marketing-layout">
      <nav className="marketing-nav">
        <div className="nav-brand">
          <Bot className="brand-icon" size={28} />
          <span className="brand-name">MATILHA</span>
        </div>
        <div className="nav-actions">
          <Link to="/login" className="nav-btn-primary">Acessar Plataforma</Link>
        </div>
      </nav>
      <main className="marketing-main">
        <Outlet />
      </main>
      <footer className="marketing-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <Bot size={20} />
            <span>Matilha Quant</span>
          </div>
          <p className="footer-text">© 2026 Matilha. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default MarketingLayout;
