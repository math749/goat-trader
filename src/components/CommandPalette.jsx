import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowRight } from 'lucide-react';
import './CommandPalette.css';

export default function CommandPalette({ isOpen, onClose, navItems = [] }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // Filter items based on query
  const filteredItems = navItems.filter((item) =>
    item.label.toLowerCase().includes(query.toLowerCase()) ||
    item.path.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = useCallback((path) => {
    navigate(path);
    onClose();
  }, [navigate, onClose]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(filteredItems.length, 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(filteredItems.length, 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          handleSelect(filteredItems[selectedIndex].path);
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex, handleSelect, onClose]);

  if (!isOpen) return null;

  return (
    <div className="cmd-palette-backdrop" onClick={onClose}>
      <div className="cmd-palette-modal" onClick={(e) => e.stopPropagation()}>
        
        {/* Input Header */}
        <div className="cmd-palette-input-wrapper">
          <Search size={20} color="var(--primary-accent, #818cf8)" />
          <input
            ref={inputRef}
            type="text"
            className="cmd-palette-input"
            placeholder="Buscar ferramenta, página ou comando..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
          />
          <span className="cmd-palette-badge">ESC</span>
        </div>

        {/* Results List */}
        <div className="cmd-palette-results">
          {filteredItems.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Nenhuma ferramenta encontrada para "{query}"
            </div>
          ) : (
            filteredItems.map((item, index) => (
              <div
                key={item.path}
                className={`cmd-palette-item ${index === selectedIndex ? 'selected' : ''}`}
                onClick={() => handleSelect(item.path)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="cmd-palette-item-left">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: index === selectedIndex ? 1 : 0.4 }}>
                  <span style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>{item.path}</span>
                  <ArrowRight size={16} />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="cmd-palette-footer">
          <span>Central de Controle Matilha</span>
          <div className="cmd-palette-hints">
            <span className="cmd-palette-hint">
              <span className="cmd-palette-badge">↑↓</span> navegar
            </span>
            <span className="cmd-palette-hint">
              <span className="cmd-palette-badge">↵</span> selecionar
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
