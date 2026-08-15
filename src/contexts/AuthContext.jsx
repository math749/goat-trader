/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('matilha_auth') === 'true';
  });
  const [loading, setLoading] = useState(() => isSupabaseConfigured());

  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) return;

    // Verifica a sessão atual do Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setIsAuthenticated(true);
        localStorage.setItem('matilha_auth', 'true');
      }
      setLoading(false);
    });

    // Escuta mudanças de estado da autenticação (login, logout, refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setIsAuthenticated(true);
        localStorage.setItem('matilha_auth', 'true');
      } else {
        setIsAuthenticated(false);
        localStorage.removeItem('matilha_auth');
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email, password) => {
    if (isSupabaseConfigured() && supabase && email && password) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setUser(data.user);
      setIsAuthenticated(true);
      localStorage.setItem('matilha_auth', 'true');
      return true;
    }

    // Fallback Local Storage
    localStorage.setItem('matilha_auth', 'true');
    setIsAuthenticated(true);
    return true;
  };

  const register = async (email, password, fullName) => {
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } }
      });
      if (error) throw error;
      return data;
    }
    return login(email, password);
  };

  const logout = async () => {
    if (isSupabaseConfigured() && supabase) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem('matilha_auth');
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
