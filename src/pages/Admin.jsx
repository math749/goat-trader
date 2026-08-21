import { useState } from 'react';
import { Crown, Users, Activity, ShieldCheck, UserCheck, Zap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTrades } from '../contexts/TradeContext';
import { isAdminUser } from '../services/trialService';
import './Admin.css';

const Admin = () => {
  const { user } = useAuth();
  const { trades } = useTrades();
  const [userList, setUserList] = useState([
    {
      id: '1',
      email: 'matheusben749@gmail.com',
      name: 'Matheus (Administrador Master)',
      role: 'ADMIN MASTER',
      status: 'ATIVO (PRO)',
      createdAt: '2026-08-15',
      tradesCount: trades.length,
      isPro: true
    },
    {
      id: '2',
      email: 'trader.beta1@gmail.com',
      name: 'Carlos Trader (Beta)',
      role: 'TRADER',
      status: 'TESTE VIP (3 dias)',
      createdAt: '2026-08-18',
      tradesCount: 42,
      isPro: false
    },
    {
      id: '3',
      email: 'investidor.pro@hotmail.com',
      name: 'Luciana M. (Quant)',
      role: 'TRADER',
      status: 'ASSINANTE PRO',
      createdAt: '2026-08-16',
      tradesCount: 128,
      isPro: true
    }
  ]);

  const isAdmin = isAdminUser(user);

  const toggleUserPro = (userId) => {
    setUserList(prev => prev.map(u => {
      if (u.id === userId) {
        const nextState = !u.isPro;
        return {
          ...u,
          isPro: nextState,
          status: nextState ? 'ASSINANTE PRO' : 'STARTER (GRÁTIS)'
        };
      }
      return u;
    }));
  };

  if (!isAdmin) {
    return (
      <div className="admin-container" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <Crown size={48} color="#ef4444" style={{ marginBottom: '1rem' }} />
        <h2 style={{ color: '#ef4444' }}>Acesso Restrito ao Administrador</h2>
        <p style={{ color: '#94a3b8' }}>Você precisa estar conectado com a conta master ({user?.email || 'admin'}) para acessar o Painel Admin.</p>
      </div>
    );
  }

  const totalUsers = userList.length;
  const activePro = userList.filter(u => u.isPro).length;
  const totalPlatformTrades = userList.reduce((acc, u) => acc + u.tradesCount, 0);

  return (
    <div className="admin-container">
      {/* Header Admin */}
      <div className="admin-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Crown size={24} color="#fbbf24" />
            <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#ffffff' }}>Painel Master do Administrador</h2>
          </div>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
            Operador Master: <strong>{user?.email || 'matheusben749@gmail.com'}</strong> • Controle Total do SaaS GOAT TRADER
          </p>
        </div>
        <span className="admin-badge">👑 ACESSO MASTER</span>
      </div>

      {/* Cards com Métricas da Plataforma */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8', fontSize: '0.8rem', fontWeight: 700 }}>
            <Users size={16} /> TOTAL DE TRADERS
          </div>
          <div className="admin-stat-value">{totalUsers}</div>
          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Cadastros na plataforma</span>
        </div>

        <div className="admin-stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontSize: '0.8rem', fontWeight: 700 }}>
            <UserCheck size={16} /> ASSINANTES PRO
          </div>
          <div className="admin-stat-value" style={{ color: '#10b981' }}>{activePro}</div>
          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Assinaturas ativas (R$ 47/mês)</span>
        </div>

        <div className="admin-stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#c084fc', fontSize: '0.8rem', fontWeight: 700 }}>
            <Activity size={16} /> TRADES REGISTRADOS
          </div>
          <div className="admin-stat-value" style={{ color: '#c084fc' }}>{totalPlatformTrades}</div>
          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Volume de operações salvas</span>
        </div>

        <div className="admin-stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fbbf24', fontSize: '0.8rem', fontWeight: 700 }}>
            <Zap size={16} /> STATUS DO BANCO
          </div>
          <div className="admin-stat-value" style={{ color: '#fbbf24', fontSize: '1.2rem' }}>Supabase OK</div>
          <span style={{ fontSize: '0.72rem', color: '#10b981' }}>● 100% Operacional</span>
        </div>
      </div>

      {/* Tabela de Gestão de Usuários */}
      <div className="admin-table-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={20} color="#38bdf8" /> Gerenciador de Acessos & Licenças
          </h3>
          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
            Você pode conceder acesso VIP manual para qualquer usuário
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Usuário / E-mail</th>
                <th>Função</th>
                <th>Status da Licença</th>
                <th>Trades Salvos</th>
                <th>Ações de Admin</th>
              </tr>
            </thead>
            <tbody>
              {userList.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div style={{ fontWeight: 700, color: '#f8fafc' }}>{u.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{u.email}</div>
                  </td>
                  <td>
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: u.role.includes('ADMIN') ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                      color: u.role.includes('ADMIN') ? '#fbbf24' : '#94a3b8'
                    }}>
                      {u.role}
                    </span>
                  </td>
                  <td>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: u.isPro ? '#10b981' : '#f59e0b'
                    }}>
                      {u.isPro ? '● ASSINANTE PRO' : u.status}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{u.tradesCount}</td>
                  <td>
                    {u.role.includes('ADMIN') ? (
                      <span style={{ fontSize: '0.75rem', color: '#fbbf24', fontWeight: 700 }}>Acesso Master Cativado</span>
                    ) : (
                      <button className="admin-action-btn" onClick={() => toggleUserPro(u.id)}>
                        {u.isPro ? 'Revogar PRO' : 'Conceder PRO VIP'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Admin;
