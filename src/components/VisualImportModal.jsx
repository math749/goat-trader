import { useState, useRef, useEffect } from 'react';
import { UploadCloud, FileText, CheckCircle, AlertTriangle, X } from 'lucide-react';
import Papa from 'papaparse';
import gsap from 'gsap';
import './VisualImportModal.css';

const VisualImportModal = ({ isOpen, onClose, addTradesBulk }) => {
  const modalRef = useRef(null);
  const overlayRef = useRef(null);
  const progressRef = useRef(null);
  
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState('idle'); // idle, reading, success, error
  const [message, setMessage] = useState('');
  
  // Handle Animations
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        setStatus('idle');
        setMessage('');
      }, 0);
      
      gsap.fromTo(overlayRef.current, 
        { opacity: 0 }, 
        { opacity: 1, duration: 0.3 }
      );
      gsap.fromTo(modalRef.current, 
        { y: 50, opacity: 0, scale: 0.95 }, 
        { y: 0, opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.5)' }
      );
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleClose = () => {
    gsap.to(modalRef.current, { y: 30, opacity: 0, scale: 0.95, duration: 0.3, ease: 'power2.in' });
    gsap.to(overlayRef.current, { opacity: 0, duration: 0.3, onComplete: onClose });
  };

  // Drag and Drop Logic
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file) => {
    if (!file.name.endsWith('.csv')) {
      setStatus('error');
      setMessage('Por favor, envie um arquivo .csv válido.');
      return;
    }

    setStatus('reading');
    setMessage('Processando os dados...');

    // Fake progress animation for premium feel
    gsap.fromTo(progressRef.current, 
      { width: '0%' }, 
      { width: '80%', duration: 1.5, ease: 'power2.out' }
    );

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      const lines = text.split('\n');
      
      let delimiter = ',';
      let headerText = '';
      for (let i = 0; i < Math.min(lines.length, 20); i++) {
        const line = lines[i].toLowerCase();
        if (line.includes('ativo') && (line.includes('resultado') || line.includes('líquido') || line.includes('total'))) {
          headerText = line;
          break;
        }
      }

      if (headerText.includes(';')) delimiter = ';';
      else if (headerText.includes('\t')) delimiter = '\t';

      Papa.parse(text, {
        header: false,
        skipEmptyLines: true,
        delimiter: delimiter,
        complete: (results) => {
          const rawData = results.data;
          
          let headerIndex = -1;
          for (let i = 0; i < rawData.length; i++) {
            const rowText = rawData[i].join(' ').toLowerCase();
            if (rowText.includes('ativo') && (rowText.includes('resultado') || rowText.includes('líquido') || rowText.includes('total'))) {
              headerIndex = i;
              break;
            }
          }

          if (headerIndex === -1) {
            setStatus('error');
            setMessage(`Não conseguimos encontrar a linha de cabeçalho no seu arquivo.`);
            return;
          }

          const headers = rawData[headerIndex].map(h => h ? h.trim().toLowerCase() : '');
          const dataRows = rawData.slice(headerIndex + 1);

          const parsedTrades = dataRows.map(row => {
            const tradeObj = {};
            headers.forEach((header, index) => {
              if (header) {
                tradeObj[header] = row[index] ? row[index].trim() : '';
              }
            });
            return tradeObj;
          });

          const validTrades = parsedTrades.filter(t => 
            t['ativo'] || t['resultado'] || t['total'] || t['resultado líquido'] || t['resultado liquido'] || t['res. operação'] || t['resultado (r$)']
          );

          if (validTrades.length === 0) {
            setStatus('error');
            setMessage(`Nenhuma operação válida. Colunas detectadas: ${headers.join(', ')}`);
            return;
          }

          const result = addTradesBulk(validTrades);
          
          gsap.to(progressRef.current, { 
            width: '100%', 
            duration: 0.5, 
            onComplete: () => {
              setStatus('success');
              if (result.added > 0 || result.skipped > 0) {
                setMessage(`Importação concluída: ${result.added} novas operações. ${result.skipped} duplicatas ignoradas.`);
              } else {
                setMessage('Nenhuma operação nova foi adicionada.');
              }
              // Auto close after 2.5s
              setTimeout(() => {
                handleClose();
              }, 2500);
            }
          });
        },
        error: (err) => {
          setStatus('error');
          setMessage("Erro ao ler o arquivo: " + err.message);
        }
      });
    };
    reader.readAsText(file, "ISO-8859-1");
  };

  if (!isOpen) return null;

  return (
    <div className="visual-modal-overlay" ref={overlayRef}>
      <div className="visual-modal-content" ref={modalRef}>
        <button className="visual-modal-close" onClick={handleClose}>
          <X size={20} />
        </button>
        
        <div className="visual-modal-header">
          <h2>Importar Relatório</h2>
          <p>Faça o upload do CSV gerado pelo seu Profit Pro</p>
        </div>

        {status === 'idle' && (
          <div 
            className={`dropzone ${isDragging ? 'dragging' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="dropzone-content">
              <div className="drop-icon-wrapper">
                <UploadCloud size={48} className="drop-icon" />
              </div>
              <h3>Arraste seu arquivo CSV para cá</h3>
              <p>ou</p>
              <label className="btn btn-primary dropzone-btn">
                Procurar no Computador
                <input type="file" accept=".csv" onChange={handleFileChange} style={{display:'none'}}/>
              </label>
            </div>
          </div>
        )}

        {status === 'reading' && (
          <div className="import-status-container">
            <div className="pulsing-icon">
              <FileText size={48} color="var(--primary-accent)" />
            </div>
            <h3>Analisando Dados</h3>
            <p>{message}</p>
            <div className="progress-bar-container">
              <div className="progress-bar-fill" ref={progressRef}></div>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="import-status-container success-state">
            <CheckCircle size={56} color="var(--success)" />
            <h3>Sucesso!</h3>
            <p>{message}</p>
          </div>
        )}

        {status === 'error' && (
          <div className="import-status-container error-state">
            <AlertTriangle size={56} color="var(--danger)" />
            <h3>Opa, algo deu errado.</h3>
            <p>{message}</p>
            <button className="btn btn-outline" onClick={() => setStatus('idle')} style={{marginTop: '1rem'}}>
              Tentar Novamente
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default VisualImportModal;
