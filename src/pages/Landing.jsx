import { useRef, useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import {
  LogIn,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Cpu,
  Calculator,
  BarChart3,
  CheckCircle2,
  Zap,
  Activity,
  Flame,
} from 'lucide-react';
import './Landing.css';

gsap.registerPlugin(ScrollTrigger);

/* ==========================================================================
   1. CUSTOM NEON MAGNETIC FOLLOWER CURSOR (Design Spells)
   ========================================================================== */
const CustomCursor = () => {
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    let mouseX = -100;
    let mouseY = -100;
    let ringX = -100;
    let ringY = -100;
    let animId;

    const onMouseMove = (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
      }
    };

    const render = () => {
      ringX += (mouseX - ringX) * 0.15;
      ringY += (mouseY - ringY) * 0.15;
      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) scale(${isHovered ? 1.8 : 1})`;
      }
      animId = requestAnimationFrame(render);
    };

    window.addEventListener('mousemove', onMouseMove);
    animId = requestAnimationFrame(render);

    const handleHoverEnter = () => setIsHovered(true);
    const handleHoverLeave = () => setIsHovered(false);

    const interactiveElements = document.querySelectorAll('button, a, .magnetic-btn, .card-3d, .horizontal-card');
    interactiveElements.forEach((el) => {
      el.addEventListener('mouseenter', handleHoverEnter);
      el.addEventListener('mouseleave', handleHoverLeave);
    });

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      cancelAnimationFrame(animId);
      interactiveElements.forEach((el) => {
        el.removeEventListener('mouseenter', handleHoverEnter);
        el.removeEventListener('mouseleave', handleHoverLeave);
      });
    };
  }, [isHovered]);

  return (
    <>
      <div ref={dotRef} className="custom-cursor-dot" />
      <div ref={ringRef} className={`custom-cursor-ring ${isHovered ? 'hovering' : ''}`} />
    </>
  );
};

/* ==========================================================================
   2. THREE.JS / WEBGL 3D CYBERPUNK HERO SCENE (Agency Senior Developer)
   ========================================================================== */
const ThreeHeroScene = () => {
  const canvasRef = useRef(null);
  const centerRef = useRef({x: 0, y: 0});

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;

    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
      // Update center reference when canvas size changes
      centerRef.current = {x: width / 2, y: height / 2};
    };
    window.addEventListener('resize', handleResize);

    // Initialize center reference
    centerRef.current = {x: width / 2, y: height / 2};

    const phi = (1 + Math.sqrt(5)) / 2;
    const rawVertices = [
      [-1, phi, 0], [1, phi, 0], [-1, -phi, 0], [1, -phi, 0],
      [0, -1, phi], [0, 1, phi], [0, -1, -phi], [0, 1, -phi],
      [phi, 0, -1], [phi, 0, 1], [-phi, 0, -1], [-phi, 0, 1]
    ];

    const radius = Math.min(width, height) * 0.22;
    const vertices = rawVertices.map(([x, y, z]) => {
      const len = Math.sqrt(x * x + y * y + z * z);
      return { x: (x / len) * radius, y: (y / len) * radius, z: (z / len) * radius };
    });

    const edges = [];
    for (let i = 0; i < vertices.length; i++) {
      for (let j = i + 1; j < vertices.length; j++) {
        const dx = vertices[i].x - vertices[j].x;
        const dy = vertices[i].y - vertices[j].y;
        const dz = vertices[i].z - vertices[j].z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < radius * 1.3) {
          edges.push([i, j]);
        }
      }
    }

    const numRingParticles = 60;
    const ringParticles = [];
    for (let i = 0; i < numRingParticles; i++) {
      const angle = (i / numRingParticles) * Math.PI * 2;
      const r = radius * (1.3 + Math.random() * 0.4);
      ringParticles.push({
        x: Math.cos(angle) * r,
        y: (Math.random() - 0.5) * 40,
        z: Math.sin(angle) * r,
        speed: 0.005 + Math.random() * 0.005,
        size: Math.random() * 2 + 1,
      });
    }

    let rotX = 0;
    let rotY = 0;
    let targetRotX = 0;
    let targetRotY = 0;

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left - width / 2;
      const mouseY = e.clientY - rect.top - height / 2;
      targetRotY = (mouseX / width) * Math.PI * 0.8;
      targetRotX = -(mouseY / height) * Math.PI * 0.8;
    };
    window.addEventListener('mousemove', handleMouseMove);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      rotX += (targetRotX - rotX) * 0.05 + 0.003;
      rotY += (targetRotY - rotY) * 0.05 + 0.005;

      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);

      // Use precomputed center values from ref instead of calculating each frame
      const centerX = centerRef.current.x;
      const centerY = centerRef.current.y;
      const fov = 400;

      const projectedNodes = vertices.map((v) => {
        let x1 = v.x * cosY + v.z * sinY;
        let z1 = -v.x * sinY + v.z * cosY;
        let y2 = v.y * cosX - z1 * sinX;
        let z2 = v.y * sinX + z1 * cosX;

        const scale = fov / (fov + z2 + 300);
        return {
          px: centerX + x1 * scale,
          py: centerY + y2 * scale,
          z: z2,
          scale,
        };
      });

      edges.forEach(([i, j]) => {
        const p1 = projectedNodes[i];
        const p2 = projectedNodes[j];
        const avgZ = (p1.z + p2.z) / 2;
        const alpha = Math.max(0.1, 1 - (avgZ + radius) / (radius * 2.5));

        ctx.beginPath();
        ctx.moveTo(p1.px, p1.py);
        ctx.lineTo(p2.px, p2.py);
        ctx.strokeStyle = `rgba(59, 130, 246, ${alpha * 0.6})`;
        ctx.lineWidth = 1.2 * p1.scale;
        ctx.stroke();
      });

      projectedNodes.forEach((p) => {
        const alpha = Math.max(0.2, 1 - (p.z + radius) / (radius * 2.5));
        const r = 4 * p.scale;

        ctx.beginPath();
        ctx.arc(p.px, p.py, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(147, 197, 253, ${alpha})`;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#3b82f6';
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      ringParticles.forEach((p) => {
        p.z += p.speed;
        let x1 = p.x * Math.cos(rotY + p.z) - p.z * Math.sin(rotY + p.z);
        let z1 = p.x * Math.sin(rotY + p.z) + p.z * Math.cos(rotY + p.z);
        let y2 = p.y * Math.cos(rotX) - z1 * Math.sin(rotX);
        let z2 = p.y * Math.sin(rotX) + z1 * Math.cos(rotX);

        const scale = fov / (fov + z2 + 300);
        const px = centerX + x1 * scale;
        const py = centerY + y2 * scale;
        const alpha = Math.max(0.15, 1 - (z2 + radius) / (radius * 3));

        ctx.beginPath();
        ctx.arc(px, py, p.size * scale, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(16, 185, 129, ${alpha})`;
        ctx.fill();
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animId);
    };
  }, []);

  return <canvas ref={canvasRef} className="three-hero-canvas" />;
};

/* ==========================================================================
   3. 3D FINANCIAL CANDLESTICK MATRIX TUNNEL (User Image Reference Match)
   ========================================================================== */
const CandleTunnelSection = () => {
  const canvasRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;

    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener('resize', handleResize);

    const fov = 350;
    const maxZ = 1200;

    // Generate 3D Candlesticks floating along tunnel walls (Left, Right, Top, Bottom)
    const numCandles = 90;
    const candles = [];

    for (let i = 0; i < numCandles; i++) {
      const side = i % 4; // 0: Left wall, 1: Right wall, 2: Top wall, 3: Bottom wall
      let x;
      let y;

      if (side === 0) { x = -280; y = (Math.random() - 0.5) * 450; }
      else if (side === 1) { x = 280; y = (Math.random() - 0.5) * 450; }
      else if (side === 2) { x = (Math.random() - 0.5) * 450; y = -250; }
      else { x = (Math.random() - 0.5) * 450; y = 250; }

      candles.push({
        x,
        y,
        z: Math.random() * maxZ,
        width: 14 + Math.random() * 16,
        bodyHeight: 40 + Math.random() * 70,
        wickHeight: 90 + Math.random() * 90,
        isBull: Math.random() > 0.45, // Green or Red
        speed: 3 + Math.random() * 4,
      });
    }

    // Laser speed lines
    const numStreaks = 40;
    const streaks = [];
    for (let i = 0; i < numStreaks; i++) {
      streaks.push({
        x: (Math.random() - 0.5) * 600,
        y: (Math.random() - 0.5) * 600,
        z: Math.random() * maxZ,
        length: 80 + Math.random() * 140,
        speed: 8 + Math.random() * 8,
        color: Math.random() > 0.5 ? '#10b981' : '#ef4444',
      });
    }

    // Precompute color strings to avoid concatenation in render loop
    const BULL_GLOW_START = 'rgba(16, 185, 129, ';
    const BEAR_GLOW_START = 'rgba(239, 68, 68, ';
    const BULL_HEX = '#10b981';
    const BEAR_HEX = '#ef4444';

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;

      // Draw 3D Tunnel Perspective Grid Box Lines
      ctx.lineWidth = 1;
      const gridZStep = 150;
      for (let z = gridZStep; z < maxZ; z += gridZStep) {
        const scale = fov / (fov + z);
        const w = 600 * scale;
        const h = 500 * scale;
        const alpha = (1 - z / maxZ) * 0.4;

        ctx.strokeStyle = `rgba(16, 185, 129, ${alpha})`;
        ctx.strokeRect(centerX - w / 2, centerY - h / 2, w, h);
      }

      // Corner perspective rays connecting to center
      const farScale = fov / (fov + maxZ);
      const farW = 600 * farScale;
      const farH = 500 * farScale;

      ctx.beginPath();
      ctx.moveTo(centerX - 300, centerY - 250);
      ctx.lineTo(centerX - farW / 2, centerY - farH / 2);
      ctx.moveTo(centerX + 300, centerY - 250);
      ctx.lineTo(centerX + farW / 2, centerY - farH / 2);
      ctx.moveTo(centerX - 300, centerY + 250);
      ctx.lineTo(centerX - farW / 2, centerY + farH / 2);
      ctx.moveTo(centerX + 300, centerY + 250);
      ctx.lineTo(centerX + farW / 2, centerY + farH / 2);
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.35)';
      ctx.stroke();

      // Render Laser Motion Streaks
      streaks.forEach((s) => {
        s.z -= s.speed;
        if (s.z <= 0) s.z = maxZ;

        const scaleStart = fov / (fov + s.z);
        const scaleEnd = fov / (fov + s.z + s.length);
        const x1 = centerX + s.x * scaleStart;
        const y1 = centerY + s.y * scaleStart;
        const x2 = centerX + s.x * scaleEnd;
        const y2 = centerY + s.y * scaleEnd;
        const alpha = (1 - s.z / maxZ) * 0.6;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = s.color === '#10b981' ? `rgba(16, 185, 129, ${alpha})` : `rgba(239, 68, 68, ${alpha})`;
        ctx.lineWidth = 2 * scaleStart;
        ctx.stroke();
      });

      // Render 3D Candlesticks floating in Tunnel
      candles.sort((a, b) => b.z - a.z); // Render back to front
      candles.forEach((c) => {
        c.z -= c.speed;
        if (c.z <= 0) {
          c.z = maxZ;
          c.isBull = Math.random() > 0.45;
        }

        const scale = fov / (fov + c.z);
        const screenX = centerX + c.x * scale;
        const screenY = centerY + c.y * scale;
        const candleW = c.width * scale;
        const bodyH = c.bodyHeight * scale;
        const wickH = c.wickHeight * scale;
        const alpha = Math.min(1, (1 - c.z / maxZ) * 1.2);

        const colorHex = c.isBull ? BULL_HEX : BEAR_HEX;
        const colorGlow = c.isBull ? BULL_GLOW_START : BEAR_GLOW_START;

        // Draw Wick Line
        ctx.beginPath();
        ctx.moveTo(screenX, screenY - wickH / 2);
        ctx.lineTo(screenX, screenY + wickH / 2);
        ctx.strokeStyle = `${colorGlow}${alpha * 0.8})`;
        ctx.lineWidth = Math.max(1, 2 * scale);
        ctx.stroke();

        // Draw Candlestick Body
        ctx.fillStyle = `${colorGlow}${alpha * 0.9})`;
        ctx.shadowBlur = 12 * scale;
        ctx.shadowColor = colorHex;
        ctx.fillRect(screenX - candleW / 2, screenY - bodyH / 2, candleW, bodyH);
        ctx.shadowBlur = 0;
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <section className="candle-tunnel-section">
      <canvas ref={canvasRef} className="tunnel-canvas" />
      <div className="tunnel-vignette"></div>

      <div className="tunnel-content fade-in">
        <span className="section-badge badge-glow"><Flame size={14} /> METRICAS & DISCIPLINA INSTITUCIONAL</span>
        <h2 className="tunnel-title">
          MIGRE DO ACHISMO PARA<br />
          <span className="highlight-green">A GESTÃO MATEMÁTICA DO SEU CAPITAL.</span>
        </h2>
        <p className="tunnel-subtitle">
          Importe seus relatórios do ProfitChart ou MT5 em 1 clique. A GOAT IA 2.5 mapeia seus vícios emocionais, a calculadora apura sua DARF 6015 e o Hard Block protege seu patrimônio.
        </p>

        <button className="tunnel-cta magnetic-btn" onClick={() => navigate('/login')}>
          Analisar Minha Performance Agora <ArrowRight size={20} />
        </button>
      </div>
    </section>
  );
};

/* ==========================================================================
   4. TICKER TAPE BAR
   ========================================================================== */
const TickerTape = () => {
  const [marketData, setMarketData] = useState([
    { symbol: 'IBOV', price: '128.450', change: '+0.85%', up: true },
    { symbol: 'WINFUT', price: '128.600', change: '+0.92%', up: true },
    { symbol: 'WDOFUT', price: '5.420,50', change: '-0.45%', up: false },
    { symbol: 'S&P 500', price: '5.550,20', change: '+0.60%', up: true },
    { symbol: 'USATEC', price: '19.820,10', change: '+1.15%', up: true },
    { symbol: 'BITCOIN', price: '385.400', change: '+2.40%', up: true },
  ]);

  useEffect(() => {
    let isMounted = true;

    const fetchQuotes = async () => {
      try {
        const response = await fetch('https://api.hgbrasil.com/finance?format=json-cors&key=development');
        const data = await response.json();
        if (data && data.results && isMounted) {
          setMarketData((prev) => {
            const newData = [...prev];
            if (data.results.stocks?.IBOVESPA) {
              const ibov = data.results.stocks.IBOVESPA;
              const ibovPrice = ibov.points.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
              const ibovChange = (ibov.variation > 0 ? '+' : '') + ibov.variation.toFixed(2) + '%';
              newData[0] = { symbol: 'IBOV', price: ibovPrice, change: ibovChange, up: ibov.variation >= 0 };
              const winPoints = (ibov.points + 150).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
              newData[1] = { symbol: 'WINFUT', price: winPoints, change: ibovChange, up: ibov.variation >= 0 };
            }
            if (data.results.currencies?.USD) {
              const usd = data.results.currencies.USD;
              const wdoPrice = (usd.buy * 1000).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
              const wdoChange = (usd.variation > 0 ? '+' : '') + usd.variation.toFixed(2) + '%';
              newData[2] = { symbol: 'WDOFUT', price: wdoPrice, change: wdoChange, up: usd.variation >= 0 };
            }
            if (data.results.stocks?.DOWJONES) {
              const dow = data.results.stocks.DOWJONES;
              const spPrice = dow.points.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
              const spChange = (dow.variation > 0 ? '+' : '') + dow.variation.toFixed(2) + '%';
              newData[3] = { symbol: 'S&P 500', price: spPrice, change: spChange, up: dow.variation >= 0 };
            }
            if (data.results.stocks?.NASDAQ) {
              const nasdaq = data.results.stocks.NASDAQ;
              const nqPrice = nasdaq.points.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
              const nqChange = (nasdaq.variation > 0 ? '+' : '') + nasdaq.variation.toFixed(2) + '%';
              newData[4] = { symbol: 'USATEC', price: nqPrice, change: nqChange, up: nasdaq.variation >= 0 };
            }
            if (data.results.currencies?.BTC) {
              const btc = data.results.currencies.BTC;
              const btcPrice = btc.buy.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
              const btcChange = (btc.variation > 0 ? '+' : '') + btc.variation.toFixed(2) + '%';
              newData[5] = { symbol: 'BITCOIN', price: btcPrice, change: btcChange, up: btc.variation >= 0 };
            }
            return newData;
          });
        }
      } catch (err) {
        console.error('Failed to fetch live quotes', err);
      }
    };

    fetchQuotes();
    const interval = setInterval(fetchQuotes, 60000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const tapeData = [...marketData, ...marketData, ...marketData, ...marketData];

  return (
    <div className="ticker-wrap cinematic-ticker">
      <div className="ticker-track">
        {tapeData.map((item, index) => (
          <div key={index} className="ticker-item">
            <span className="ticker-symbol">{item.symbol}</span>
            <span className="ticker-price">{item.price}</span>
            <span className={`ticker-change ${item.up ? 'ticker-up' : 'ticker-down'}`}>
              {item.up ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {item.change}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ==========================================================================
   5. GSAP PINNED HORIZONTAL SHOWCASE SECTION (gpt-taste & Awwwards Runway)
   ========================================================================== */
const HorizontalShowcase = () => {
  const navigate = useNavigate();
  const triggerRef = useRef(null);
  const trackRef = useRef(null);

  useGSAP(
    () => {
      const track = trackRef.current;
      if (!track) return;

      gsap.to(track, {
        x: () => -(track.scrollWidth - window.innerWidth + 100),
        ease: 'none',
        scrollTrigger: {
          trigger: triggerRef.current,
          pin: true,
          scrub: 1,
          start: 'top top',
          end: () => `+=${track.scrollWidth}`,
          invalidateOnRefresh: true,
        },
      });
    },
    { scope: triggerRef }
  );

  const modules = [
    {
      badge: 'MOTOR QUANTITATIVO',
      icon: <Activity size={24} color="#3b82f6" />,
      title: 'Radar Quant & Tape Reading B3',
      desc: 'Leitura de agressão de ticks ao vivo, VWAP, Bandas de DP e Score de Confluência Único (1.0 a 10.0) para tomar decisões institucionais com precisão.',
      tag: 'FREQUÊNCIA DE TICK 3MS',
      route: '/login',
      bgClass: 'card-quant',
    },
    {
      badge: 'APURAÇÃO FISCAL',
      icon: <Calculator size={24} color="#10b981" />,
      title: 'Calculadora de Imposto (DARF 6015)',
      desc: 'Apuração automática de 20% sobre lucros em Day Trade, compensação de prejuízos de meses anteriores e cópia rápida de dados da DARF.',
      tag: '100% REGULAMENTADO B3',
      route: '/login',
      bgClass: 'card-ir',
    },
    {
      badge: 'MÓDULO DISCIPLINAR',
      icon: <ShieldAlert size={24} color="#ef4444" />,
      title: 'Hard Block & Trava Antitiro',
      desc: 'Atingiu seu limite de perda configurado? A plataforma trava a conta e impede qualquer nova ordem até o dia seguinte.',
      tag: 'DISCIPLINA INQUEBRÁVEL',
      route: '/login',
      bgClass: 'card-block',
    },
    {
      badge: 'INTELIGÊNCIA ARTIFICIAL',
      icon: <Cpu size={24} color="#8b5cf6" />,
      title: 'GOAT IA 2.5 Trader Copilot',
      desc: 'Mapeia seus horários de maior ganho, detecta fadiga operacional e sugere ajustes de lote antes que você entre em overtrading.',
      tag: 'MODELO GOOGLE GEMINI 2.5',
      route: '/login',
      bgClass: 'card-goat',
    },
  ];

  return (
    <section ref={triggerRef} className="horizontal-pin-section">
      <div className="horizontal-intro">
        <span className="section-badge"><Flame size={14} /> SHOWROOM INSTITUCIONAL</span>
        <h2 className="horizontal-main-title">Conheça o Ecossistema Matilha</h2>
        <p className="horizontal-subtitle">Role para baixo para navegar horizontalmente pelos módulos da plataforma.</p>
      </div>

      <div ref={trackRef} className="horizontal-track">
        {modules.map((m, i) => (
          <div key={i} className={`horizontal-card card-3d ${m.bgClass}`}>
            <div className="hcard-header">
              <div className="hcard-icon-box">{m.icon}</div>
              <span className="hcard-badge">{m.badge}</span>
            </div>
            <h3 className="hcard-title">{m.title}</h3>
            <p className="hcard-desc">{m.desc}</p>
            <div className="hcard-footer">
              <span className="hcard-tag">{m.tag}</span>
              <button className="hcard-btn" onClick={() => navigate(m.route)}>
                Explorar <ArrowRight size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

/* ==========================================================================
   6. GOAT IA 2.5 COPILOT INTERACTIVE DEMO WIDGET
   ========================================================================== */
const GoatAiInteractiveDemo = () => {
  const [activeScenario, setActiveScenario] = useState('lucro');

  const scenarios = {
    lucro: {
      title: 'Sessão de Alta Performance (+R$ 1.850,00)',
      score: '9.4 / 10.0',
      statusColor: '#10b981',
      winRate: '75%',
      payoff: '2.8x',
      darf: 'R$ 370,00',
      insight: 'Excepcional disciplina! 80% das suas entradas foram efetuadas no Horário Nobre (09:15 - 11:00) confluência na VWAP.',
      recommendation: 'Manter gerenciamento de lote atual e encerrar a sessão para proteger seus ganhos.',
    },
    overtrading: {
      title: 'Alerta de Overtrading (22 Trades Executados)',
      score: '4.8 / 10.0',
      statusColor: '#ef4444',
      winRate: '41%',
      payoff: '0.9x',
      darf: 'R$ 0,00 (Prejuízo no dia)',
      insight: 'Detectada fadiga operacional! A partir do 12º trade, seu tempo médio de permanência na operação caiu 70% e seu payoff ficou negativo.',
      recommendation: 'Recomendação urgente da IA: Parar de operar hoje no ProfitChart para evitar devolução por ansiedade.',
    },
    horario: {
      title: 'Mapeamento de Horário Nobre (B3)',
      score: '8.7 / 10.0',
      statusColor: '#3b82f6',
      winRate: '82%',
      payoff: '3.1x',
      darf: 'R$ 480,00',
      insight: 'Seu histórico comprova: Suas operações entre 09:00 e 11:30 acumulam 84% de todo o seu lucro mensal na B3.',
      recommendation: 'Focar todas as suas entradas nas primeiras 2 horas e meia de pregão para maximizar o resultado.',
    },
  };

  const current = scenarios[activeScenario];

  return (
    <section className="hardblock-section">
      <div className="hb-container">
        <div className="hb-header">
          <span className="section-badge"><Cpu size={14} /> DEMO INTERATIVA GOAT IA 2.5</span>
          <h2 className="hb-title">Inteligência Artificial Analisando Seus Dados</h2>
          <p className="hb-subtitle">Selecione um cenário operacional abaixo e veja como a GOAT IA 2.5 diagnostica seu desempenho em tempo real.</p>
        </div>

        <div className="terminal-mockup card-3d">
          <div className="terminal-header">
            <div className="terminal-dots">
              <div className="tdot red"></div>
              <div className="tdot yellow"></div>
              <div className="tdot green"></div>
            </div>
            <div className="terminal-title">GOAT_IA_2.5_COPILOT_DEMO</div>
          </div>

          <div className="scenario-selector">
            <button
              className={`scenario-btn ${activeScenario === 'lucro' ? 'active' : ''}`}
              onClick={() => setActiveScenario('lucro')}
            >
              📈 Sessão Lucrativa
            </button>
            <button
              className={`scenario-btn ${activeScenario === 'overtrading' ? 'active' : ''}`}
              onClick={() => setActiveScenario('overtrading')}
            >
              ⚠️ Alerta Overtrading
            </button>
            <button
              className={`scenario-btn ${activeScenario === 'horario' ? 'active' : ''}`}
              onClick={() => setActiveScenario('horario')}
            >
              🎯 Horário Nobre B3
            </button>
          </div>

          <div className="terminal-body ai-demo-body">
            <div className="ai-scenario-title">{current.title}</div>

            <div className="ai-metrics-row">
              <div className="ai-metric-item">
                <span className="ai-metric-lbl">Score IA</span>
                <span className="ai-metric-val" style={{ color: current.statusColor }}>{current.score}</span>
              </div>
              <div className="ai-metric-item">
                <span className="ai-metric-lbl">Win Rate</span>
                <span className="ai-metric-val text-blue">{current.winRate}</span>
              </div>
              <div className="ai-metric-item">
                <span className="ai-metric-lbl">Payoff</span>
                <span className="ai-metric-val text-gold">{current.payoff}</span>
              </div>
              <div className="ai-metric-item">
                <span className="ai-metric-lbl">DARF Est.</span>
                <span className="ai-metric-val text-green">{current.darf}</span>
              </div>
            </div>

            <div className="ai-insight-box">
              <div className="ai-insight-title"><Zap size={14} color="#3b82f6" /> Diagnóstico Comportamental</div>
              <p className="ai-insight-txt">{current.insight}</p>
            </div>

            <div className="ai-recommendation-box" style={{ borderColor: current.statusColor }}>
              <div className="ai-rec-title" style={{ color: current.statusColor }}><Activity size={14} /> Recomendação Estratégica</div>
              <p className="ai-rec-txt">{current.recommendation}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ==========================================================================
   7. TEARSHEET & CONSISTENCY PREVIEW WIDGET
   ========================================================================== */
const TearsheetPreview = () => {
  const heatmapData = useMemo(
    () =>
      Array.from({ length: 28 }).map((_, i) => {
        const val1 = Math.abs(Math.sin(i * 12.9898 + 4.321)) % 1;
        const val2 = Math.abs(Math.cos(i * 78.233 + 1.234)) % 1;
        return {
          opacity: val1 > 0.2 ? 1 : 0.25,
          color: val2 > 0.35 ? '#10b981' : '#ef4444',
        };
      }),
    []
  );

  return (
    <section className="tearsheet-section">
      <div className="ts-container">
        <div className="ts-header">
          <span className="section-badge"><BarChart3 size={14} /> RELATÓRIOS INSTITUCIONAIS</span>
          <h2 className="ts-title">Métricas que Geram Consistência</h2>
          <p className="ts-subtitle">Um diário de operações automatizado. Importe relatórios de performance do ProfitChart ou MT5 em 1 clique.</p>
        </div>

        <div className="ts-dashboard">
          <div className="ts-card card-3d">
            <div className="ts-card-title">Calendário de Consistência Mensal</div>
            <div className="heatmap-grid ts-heatmap">
              {heatmapData.map((data, i) => (
                <div key={i} className="heat-cell" style={{ opacity: data.opacity }} data-color={data.color}></div>
              ))}
            </div>
          </div>

          <div className="ts-card card-3d">
            <div className="ts-card-title">Curva de Patrimônio (Equity Curve)</div>
            <div className="equity-container">
              <svg className="equity-svg" viewBox="0 0 500 200" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="equityGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                </defs>
                <path
                  className="equity-path"
                  d="M0,180 C50,170 80,150 100,160 C150,140 200,90 250,110 C300,80 350,50 400,60 C450,30 480,20 500,15"
                />
              </svg>
            </div>
          </div>

          <div className="ts-metrics">
            <div className="metric-box ts-metric-item">
              <div className="metric-val text-green">68.4%</div>
              <div className="metric-label">Win Rate Taxa de Acerto</div>
            </div>
            <div className="metric-box ts-metric-item">
              <div className="metric-val text-blue">2.45</div>
              <div className="metric-label">Payoff Médio</div>
            </div>
            <div className="metric-box ts-metric-item">
              <div className="metric-val text-gold">R$ 14.850</div>
              <div className="metric-label">Resultado Acumulado</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ==========================================================================
   8. MAIN LANDING COMPONENT (Awwwards 3D / GSAP Standard)
   ========================================================================== */
const Landing = () => {
  const navigate = useNavigate();
  const mainRef = useRef(null);

  const handleMagneticMove = (e) => {
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    btn.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px) scale(1.05)`;
  };

  const handleMagneticLeave = (e) => {
    const btn = e.currentTarget;
    btn.style.transform = `translate(0px, 0px) scale(1)`;
  };

  const handleCardTiltMove = (e) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = -((y - centerY) / centerY) * 12;
    const rotateY = ((x - centerX) / centerX) * 12;

    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
  };

  const handleCardTiltLeave = (e) => {
    const card = e.currentTarget;
    card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
  };

  useGSAP(
    () => {
      const tl = gsap.timeline();
      tl.fromTo('.nav-elem', { y: -20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, stagger: 0.1, ease: 'power3.out' })
        .fromTo('.hero-word', { y: 80, opacity: 0 }, { y: 0, opacity: 1, duration: 1, stagger: 0.08, ease: 'power4.out' }, '-=0.5')
        .fromTo('.hero-subtitle', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'power2.out' }, '-=0.5')
        .fromTo('.hero-cta', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, stagger: 0.1, ease: 'power2.out' }, '-=0.6');

      gsap.utils.toArray('.scrub-text-line').forEach((line) => {
        gsap.fromTo(
          line,
          { opacity: 0.1, x: -40 },
          {
            opacity: 1,
            x: 0,
            scrollTrigger: {
              trigger: line,
              start: 'top 85%',
              end: 'top 50%',
              scrub: 1,
            },
          }
        );
      });

      gsap.fromTo(
        '.bento-item',
        { y: 80, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1,
          stagger: 0.12,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: '.bento-container',
            start: 'top 75%',
          },
        }
      );
    },
    { scope: mainRef }
  );

  return (
    <main ref={mainRef} className="cinematic-main">
      <CustomCursor />

      {/* Navigation */}
      <nav className="cinematic-nav">
        <div className="nav-logo nav-elem">
          GOAT TRADER <span className="logo-badge">PRO 3D</span>
        </div>
        <button className="nav-btn nav-elem" onClick={() => navigate('/login')}>
          Acessar Plataforma <LogIn size={16} />
        </button>
      </nav>

      {/* Live Market Ticker */}
      <TickerTape />

      {/* Hero Section with Three.js 3D Floating Scene */}
      <section className="hero-section">
        <ThreeHeroScene />
        <div className="hero-grid-overlay"></div>
        <div className="aurora-container">
          <div className="aurora-orb orb-1"></div>
          <div className="aurora-orb orb-2"></div>
          <div className="aurora-orb orb-3"></div>
        </div>
        <div className="hero-radial-wash"></div>

        <div className="hero-content">
          <div className="hero-pill-tag fade-in">
            <Zap size={14} color="#3b82f6" /> ALTA PERFORMANCE & INTELIGÊNCIA QUANT B3
          </div>

          <h1 className="hero-title">
            <div className="word-line">
              <span className="hero-word">ELEVE</span>
              <span className="hero-word">SEU</span>
              <span className="hero-word">TRADING</span>
              <span className="inline-media-pill">
                <img
                  src="https://images.unsplash.com/photo-1642543492481-44e81e3914a7?q=80&w=300&auto=format&fit=crop"
                  alt="Chart 3D"
                />
              </span>
            </div>
            <div className="word-line">
              <span className="hero-word">AO</span>
              <span className="hero-word highlight-blue">NÍVEL</span>
              <span className="hero-word highlight-blue">INSTITUCIONAL.</span>
            </div>
          </h1>

          <p className="hero-subtitle">
            Conecte seu ProfitChart ou MT5 e desbloqueie métricas avançadas de mercado, diagnósticos guiados pela GOAT IA 2.5, apuração automática de DARF 6015 e gestão de risco profissional.
          </p>

          <div className="hero-actions">
            <button
              className="hero-cta btn-primary magnetic-btn"
              onMouseMove={handleMagneticMove}
              onMouseLeave={handleMagneticLeave}
              onClick={() => navigate('/login')}
            >
              <span className="btn-content">
                Explorar Plataforma Grátis <ArrowRight size={18} />
              </span>
            </button>
            <button
              className="hero-cta btn-ghost magnetic-btn"
              onMouseMove={handleMagneticMove}
              onMouseLeave={handleMagneticLeave}
              onClick={() => navigate('/login')}
            >
              Ver Recursos da IA
            </button>
          </div>

          <div className="hero-advantages fade-in">
            <div className="advantage-item">
              <CheckCircle2 size={16} color="#10b981" /> Importação 1-Clique (Profit / MT5)
            </div>
            <div className="advantage-item">
              <Cpu size={16} color="#8b5cf6" /> Copilot GOAT IA 2.5
            </div>
            <div className="advantage-item">
              <Calculator size={16} color="#3b82f6" /> DARF 6015 Automática
            </div>
            <div className="advantage-item">
              <Activity size={16} color="#f59e0b" /> Radar Quant & Ticks B3
            </div>
          </div>
        </div>
      </section>

      {/* GSAP Pinned Horizontal Showcase Runway */}
      <HorizontalShowcase />

      {/* 3D FINANCIAL CANDLESTICK MATRIX TUNNEL (User Image Reference Match) */}
      <CandleTunnelSection />

      {/* Bento Grid Section with 3D Tilt Hover Physics */}
      <section className="bento-section">
        <div className="bento-container">
          <div className="bento-header">
            <span className="section-badge"><Cpu size={14} /> ARSENAL INSTITUCIONAL</span>
            <h2 className="bento-main-title">Tecnologia Desenvolvida para a B3</h2>
          </div>

          <div className="bento-grid">
            {/* Card 1: Large IA */}
            <div className="bento-item bento-large card-3d" onMouseMove={handleCardTiltMove} onMouseLeave={handleCardTiltLeave}>
              <div className="bento-content">
                <div className="card-tag"><Cpu size={14} /> GOAT IA 2.5</div>
                <h3 className="bento-title">Inteligência Artificial de Trading</h3>
                <p className="bento-text">
                  Algoritmos avançados que analisam seu histórico de operações, detectam momentos de fadiga e calculam seu Score de Confluência em tempo real.
                </p>
              </div>
              <div className="bento-visual">
                <div className="glow-chart"></div>
              </div>
            </div>

            {/* Card 2: Gestao de Risco */}
            <div className="bento-item span-1 group card-3d" onMouseMove={handleCardTiltMove} onMouseLeave={handleCardTiltLeave}>
              <div className="bento-content">
                <div className="card-tag"><ShieldAlert size={14} /> PROTEÇÃO DE CAPITAL</div>
                <h3 className="bento-title">Gestão de Risco Quantitativa</h3>
                <p className="bento-text">
                  Defina seus limites operacionais de stop diário e drawdown. A plataforma emite alertas em tempo real e consolida seu histórico de risco.
                </p>
              </div>
              <div className="bento-bg bg-blocks"></div>
            </div>

            {/* Card 3: Calculadora de IR */}
            <div className="bento-item span-1 group card-3d" onMouseMove={handleCardTiltMove} onMouseLeave={handleCardTiltLeave}>
              <div className="bento-content">
                <div className="card-tag"><Calculator size={14} /> IMPOSTO B3</div>
                <h3 className="bento-title">DARF 6015 Automática</h3>
                <p className="bento-text">
                  Apuração de 20% de IR sobre Day Trade com compensação automática de prejuízos de meses anteriores e dedução do IRRF.
                </p>
              </div>
              <div className="bento-bg bg-calc"></div>
            </div>

            {/* Card 4: Radar Quant */}
            <div className="bento-item span-1 group card-3d" onMouseMove={handleCardTiltMove} onMouseLeave={handleCardTiltLeave}>
              <div className="bento-content">
                <div className="card-tag"><Zap size={14} /> LIVE FEED</div>
                <h3 className="bento-title">Radar Quant & Tape Reading</h3>
                <p className="bento-text">
                  Agressão de ticks em tempo real, níveis institucionais de VWAP, Bandas DP e Score de Confluência de 1.0 a 10.0.
                </p>
              </div>
              <div className="bento-bg bg-tear"></div>
            </div>

            {/* Card 5: Deduper CSV */}
            <div className="bento-item span-1 group card-3d" onMouseMove={handleCardTiltMove} onMouseLeave={handleCardTiltLeave}>
              <div className="bento-content">
                <div className="card-tag"><CheckCircle2 size={14} /> PROFITCHART</div>
                <h3 className="bento-title">Importador Hash Antiduplicidade</h3>
                <p className="bento-text">
                  Arraste seus arquivos do ProfitChart ou MT5. O motor calcula hashes exclusivos garantindo 0 trades duplicados no diário.
                </p>
              </div>
              <div className="bento-bg bg-hash"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive GOAT IA Demo & Tearsheet */}
      <GoatAiInteractiveDemo />
      <TearsheetPreview />

      {/* Scrubbing Text Reveal Section (gpt-taste) */}
      <section className="scrub-section">
        <div className="scrub-container">
          <h2 className="scrub-text">
            <div className="scrub-text-line">O MAIOR INIMIGO DO TRADER</div>
            <div className="scrub-text-line">NÃO É O MERCADO. É O VIÉS</div>
            <div className="scrub-text-line">EMOCIONAL. NÓS CONSTRUÍMOS</div>
            <div className="scrub-text-line highlight-blue">O ANTÍDOTO MATEMÁTICO.</div>
          </h2>
        </div>
      </section>

      {/* High-Impact Action Footer */}
      <section className="action-footer">
        <h1 className="footer-title">
          <span>DOMINE O CAOS DA B3.</span>
        </h1>
        <button
          className="footer-cta magnetic-btn"
          onMouseMove={handleMagneticMove}
          onMouseLeave={handleMagneticLeave}
          onClick={() => navigate('/login')}
        >
          ENTRAR NA MATILHA <ArrowRight size={24} />
        </button>
      </section>
    </main>
  );
};

export default Landing;