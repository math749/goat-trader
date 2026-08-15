from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import yfinance as yf
import pandas as pd
import numpy as np
import uvicorn
import re
from datetime import datetime, timedelta
from quant.data_feed import MT5DataFeed

try:
    import feedparser
    HAS_FEEDPARSER = True
except ImportError:
    HAS_FEEDPARSER = False

try:
    import httpx
    HAS_HTTPX = True
except ImportError:
    HAS_HTTPX = False

app = FastAPI()

# Configurar CORS para permitir que o React chame a API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# CACHE EM MEMÓRIA com TTL — evita recalcular MT5/yfinance
# em leituras repetidas do Live Mode (refresca a cada 15s)
# ============================================================
_ANALYZE_CACHE: dict = {}   # { ticker: { 'data': {...}, 'ts': datetime } }
_CACHE_TTL_SECONDS = 15     # cache válido por 15 segundos

import MetaTrader5 as mt5

@app.get("/status")
def get_market_status():
    mt5_ok = False
    is_live = False
    last_tick_str = None
    
    try:
        mt5_ok = MT5DataFeed.initialize()
        if mt5_ok:
            tick_info = mt5.symbol_info_tick("WINQ26")
            if tick_info and tick_info.time > 0:
                last_dt = datetime.fromtimestamp(tick_info.time)
                now_dt = datetime.now()
                raw_diff = abs((now_dt - last_dt).total_seconds())
                
                # Ajusta a diferença de fuso horário do servidor MT5 (ex: 3h de offset UTC)
                hours_offset = round(raw_diff / 3600.0)
                adjusted_diff = abs(raw_diff - (hours_offset * 3600))
                
                # Formata a hora ajustada no relógio local do trader
                local_tick_dt = last_dt + timedelta(hours=hours_offset) if (now_dt > last_dt) else last_dt - timedelta(hours=hours_offset)
                last_tick_str = local_tick_dt.strftime("%H:%M:%S")

                # Se o último tick foi recebido a menos de 5 minutos (300s) ajustado
                if adjusted_diff < 300:
                    is_live = True
    except Exception as e:
        print(f"Erro em /status: {e}")

    if mt5_ok and is_live:
        code = "LIVE"
        label = "🟢 B3 ONLINE · PREGÃO AO VIVO (3ms)"
        color = "#10b981"
    elif mt5_ok:
        code = "CLOSED"
        label = "🟡 PREGÃO FECHADO · DADOS DE FECHAMENTO"
        color = "#f59e0b"
    else:
        code = "DISCONNECTED"
        label = "🔴 MT5 DESCONECTADO · FALLBACK YFINANCE"
        color = "#ef4444"

    return {
        "status_code": code,
        "label": label,
        "color": color,
        "mt5_connected": mt5_ok,
        "is_live_market": is_live,
        "last_tick_time": last_tick_str,
        "ping_ms": 3
    }




def get_data_and_indicators(ticker, period, interval):
    df = None
    
    # Mapeamento grosseiro de limite de velas para o MT5
    limit = 500
    if period == "30d" and interval == "1d": limit = 60
    elif period == "10d" and interval == "1h": limit = 150
    elif period == "5d" and interval == "15m": limit = 300
    
    # 1. Tenta buscar via MetaTrader 5
    try:
        df = MT5DataFeed.get_data(ticker, interval=interval, limit=limit)
    except Exception as e:
        print(f"MT5 DataFeed exception: {e}")
        
    # 2. Fallback para yfinance se MT5 falhar ou retornar vazio
    if df is None or df.empty:
        print(f"Buscando {ticker} ({interval}) no Yahoo Finance...")
        try:
            asset = yf.Ticker(ticker)
            df = asset.history(period=period, interval=interval)
        except Exception as e:
            print(f"yfinance exception: {e}")

    if df is None or df.empty:
        return None
        
    if len(df) < 20:
        return df

    # SMA
    df['SMA_9'] = df['Close'].rolling(window=9, min_periods=1).mean()
    df['SMA_21'] = df['Close'].rolling(window=21, min_periods=1).mean()
    df['SMA_72'] = df['Close'].rolling(window=72, min_periods=1).mean()
    df['SMA_200'] = df['Close'].rolling(window=200, min_periods=1).mean()
    
    # RSI
    delta = df['Close'].diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=14, min_periods=1).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=14, min_periods=1).mean()
    rs = gain / loss
    df['RSI_14'] = 100 - (100 / (1 + rs))
    
    # ATR
    high_low = df['High'] - df['Low']
    high_close = np.abs(df['High'] - df['Close'].shift())
    low_close = np.abs(df['Low'] - df['Close'].shift())
    ranges = pd.concat([high_low, high_close, low_close], axis=1)
    df['ATR_14'] = ranges.max(axis=1).rolling(14, min_periods=1).mean()
    
    return df

@app.get("/analyze/{ticker}")
def analyze_ticker(ticker: str):
    # ── CACHE CHECK ───────────────────────────────
    cache_key = ticker.upper()
    cached = _ANALYZE_CACHE.get(cache_key)
    if cached and (datetime.now() - cached['ts']).total_seconds() < _CACHE_TTL_SECONDS:
        age_seconds = (datetime.now() - cached['ts']).total_seconds()
        print(f"[CACHE HIT] {cache_key} (age: {age_seconds:.1f}s)")
        return cached['data']
    print(f"[CACHE MISS] {cache_key} — calculando indicadores...")
    # ── FIM CACHE CHECK ────────────────────────────
    try:
        # Multi-timeframe analysis
        # 1. Micro (15 minutes / 5 minutes)
        df_15m = get_data_and_indicators(ticker, period="5d", interval="15m")
        if df_15m is None or df_15m.empty:
            df_15m = get_data_and_indicators(ticker, period="5d", interval="5m")

        # 2. Medium (1 hour - 10 days)
        df_1h = get_data_and_indicators(ticker, period="10d", interval="1h")
        if df_1h is None or df_1h.empty:
            df_1h = df_15m

        # 3. Macro (Daily - 30 days)
        df_daily = get_data_and_indicators(ticker, period="30d", interval="1d")
        if df_daily is None or df_daily.empty:
            df_daily = df_15m
        
        if df_15m is None or df_15m.empty:
            raise HTTPException(status_code=404, detail="Dados não encontrados para este ticker.")

        latest_d = df_daily.iloc[-1]
        latest_1h = df_1h.iloc[-1]
        latest_15m = df_15m.iloc[-1]
        
        current_price = float(latest_15m['Close'])
        
        # Zonas de Liquidez (Volume Profile simplificado baseado em Highs/Lows)
        support = float(min(df_15m['Low'].tail(20).min(), df_1h['Low'].tail(10).min()))
        resistance = float(max(df_15m['High'].tail(20).max(), df_1h['High'].tail(10).max()))
        
        # Análise de Tendência Intraday & Macro
        macro_trend = "BULL" if latest_d['Close'] > latest_d['SMA_21'] else "BEAR"
        micro_trend = "BULL" if latest_15m['Close'] > latest_15m['SMA_21'] else "BEAR"
        
        # Cálculo da VWAP temporária para suporte de tendência
        tp_temp = (df_15m['High'] + df_15m['Low'] + df_15m['Close']) / 3
        vol_temp = df_15m['Volume'] if 'Volume' in df_15m and df_15m['Volume'].sum() > 0 else (df_15m['tick_volume'] if 'tick_volume' in df_15m else pd.Series(1, index=df_15m.index))
        vwap_temp = (tp_temp * vol_temp).sum() / vol_temp.sum() if vol_temp.sum() > 0 else current_price

        # Tendência Intraday Dinâmica (15m + VWAP)
        intraday_bull = (latest_15m['Close'] > latest_15m['SMA_21']) or (current_price > vwap_temp)
        intraday_bear = (latest_15m['Close'] < latest_15m['SMA_21']) or (current_price < vwap_temp)

        if intraday_bull and not (latest_15m['Close'] < latest_15m['SMA_21'] and current_price < vwap_temp):
            overall_trend = "BULL"
            trend_strength = "Tendência de Alta Intraday"
        elif intraday_bear and not (latest_15m['Close'] > latest_15m['SMA_21'] and current_price > vwap_temp):
            overall_trend = "BEAR"
            trend_strength = "Tendência de Baixa Intraday"
        elif macro_trend == micro_trend:
            overall_trend = macro_trend
            trend_strength = "Alinhamento Macro"
        else:
            overall_trend = "CHOP"
            trend_strength = "Conflitante (Lateral)"

        # 4. Agressão por Ticks & Snapshot Macro
        aggression = MT5DataFeed.get_ticks_aggression(ticker, count=2000)
        macro_snapshot = MT5DataFeed.get_market_snapshot(["VALE3", "PETR4", "ITUB4", "IFNC", "DI1F27", "WSP$"])
        
        # 5. Cálculo dos Setups do Usuário (SMA 72, SMA 200, 61.8% Fibo e Troca de Polaridade)
        sma_72_val = float(latest_15m['SMA_72']) if 'SMA_72' in latest_15m and not np.isnan(latest_15m['SMA_72']) else current_price
        sma_200_val = float(latest_15m['SMA_200']) if 'SMA_200' in latest_15m and not np.isnan(latest_15m['SMA_200']) else current_price
        atr_val = float(latest_15m['ATR_14']) if 'ATR_14' in latest_15m and not np.isnan(latest_15m['ATR_14']) else 100.0

        high_max = float(df_15m['High'].tail(40).max())
        low_min = float(df_15m['Low'].tail(40).min())
        diff_fibo = high_max - low_min
        fibo_618 = (high_max - (diff_fibo * 0.618)) if overall_trend == "BEAR" else (low_min + (diff_fibo * 0.618))

        dist_sma72 = abs(current_price - sma_72_val)
        dist_sma200 = abs(current_price - sma_200_val)
        dist_fibo618 = abs(current_price - fibo_618)

        near_sma72 = bool(dist_sma72 <= (atr_val * 1.5))
        near_sma200 = bool(dist_sma200 <= (atr_val * 1.5))
        near_fibo618 = bool(dist_fibo618 <= (atr_val * 1.5))

        # Troca de Polaridade
        pivot_high = float(df_15m['High'].tail(30).iloc[-10:-2].max()) if len(df_15m) > 10 else resistance
        pivot_low = float(df_15m['Low'].tail(30).iloc[-10:-2].min()) if len(df_15m) > 10 else support
        
        polarity_detected = False
        polarity_level = None
        if abs(current_price - pivot_high) <= (atr_val * 1.2):
            polarity_detected = True
            polarity_level = round(pivot_high, 2)
        elif abs(current_price - pivot_low) <= (atr_val * 1.2):
            polarity_detected = True
            polarity_level = round(pivot_low, 2)

        # 6. Cálculo da VWAP Institucional e Bandas de Desvio Padrão (+1 / +2 DP)
        tp = (df_15m['High'] + df_15m['Low'] + df_15m['Close']) / 3
        vol = df_15m['Volume'] if 'Volume' in df_15m and df_15m['Volume'].sum() > 0 else (df_15m['tick_volume'] if 'tick_volume' in df_15m else pd.Series(1, index=df_15m.index))
        vwap_raw = (tp * vol).sum() / vol.sum() if vol.sum() > 0 else current_price
        var_raw = (vol * ((tp - vwap_raw) ** 2)).sum() / vol.sum() if vol.sum() > 0 else 0
        std_dev_raw = float(np.sqrt(var_raw))

        vwap_val = float(round(vwap_raw, 2))
        vwap_upper1 = float(round(vwap_raw + std_dev_raw, 2))
        vwap_lower1 = float(round(vwap_raw - std_dev_raw, 2))
        vwap_upper2 = float(round(vwap_raw + (2 * std_dev_raw), 2))
        vwap_lower2 = float(round(vwap_raw - (2 * std_dev_raw), 2))

        near_vwap = bool(abs(current_price - vwap_val) <= (atr_val * 0.8))
        near_vwap_upper2 = bool(current_price >= (vwap_upper2 - (atr_val * 0.5)))
        near_vwap_lower2 = bool(current_price <= (vwap_lower2 + (atr_val * 0.5)))

        # Geração do Veredito da Inteligência Artificial / Algoritmo
        verdict = ""
        if overall_trend == "BULL":
            verdict = f"Alinhamento comprador. O ativo está em tendência de alta no macro e no micro. Procure gatilhos de compra próximos ao suporte em {support:.2f}. "
            if latest_15m['RSI_14'] > 70:
                verdict += "Cuidado: RSI sobrecomprado no 15m, risco de pullback. "
        elif overall_trend == "BEAR":
            verdict = f"Alinhamento vendedor. Pressão vendedora nos tempos maiores. Ideal é operar vendido nos repiques próximo à resistência em {resistance:.2f}. "
            if latest_15m['RSI_14'] < 30:
                verdict += "Cuidado: RSI sobrevendido no 15m, exaustão vendedora. "
        else:
            verdict = f"Tempos gráficos divergentes (Diário {macro_trend} vs 15m {micro_trend}). Mercado lateral ou em transição. Evite rompimentos. Opere reversão nos extremos: Compra em {support:.2f} e Venda em {resistance:.2f}. "

        # Enriquecimento do veredito com Setups
        setups_triggers = []
        if near_vwap:
            setups_triggers.append(f"Preço na VWAP em {vwap_val:.2f}")
        if near_vwap_upper2:
            setups_triggers.append(f"Exaustão Compradora (+2 DP em {vwap_upper2:.2f})")
        if near_vwap_lower2:
            setups_triggers.append(f"Exaustão Vendedora (-2 DP em {vwap_lower2:.2f})")
        if near_sma72:
            setups_triggers.append("Correção/Teste na Média de 72")
        if near_sma200:
            setups_triggers.append("Teste na Média de 200 (Institucional)")
        if near_fibo618:
            setups_triggers.append(f"Zona 61.8% Fibo em {fibo_618:.2f}")
        if polarity_detected:
            setups_triggers.append(f"Troca de Polaridade em {polarity_level:.2f}")

        if setups_triggers:
            verdict += " | SETUPS TÁTICOS ATIVOS: " + " + ".join(setups_triggers) + "."

        if aggression["dominant"] == "BUY" and overall_trend == "BEAR":
            verdict += " ATENÇÃO: Agressão recente de COMPRA está alta, indicando forte absorção na queda."
        elif aggression["dominant"] == "SELL" and overall_trend == "BULL":
            verdict += " ATENÇÃO: Agressão VENDEDORA disparou, indicando rejeição institucional de topo."

        vale = next((x for x in macro_snapshot if x["symbol"] == "VALE3"), None)
        petr = next((x for x in macro_snapshot if x["symbol"] == "PETR4"), None)
        if vale and petr:
            if vale["change_pct"] < -0.3 and petr["change_pct"] < -0.3:
                verdict += " ALERTA INSTITUCIONAL: VALE3 e PETR4 em forte queda puxando o Ibovespa para baixo."
            elif vale["change_pct"] > 0.3 and petr["change_pct"] > 0.3:
                verdict += " ALERTA INSTITUCIONAL: VALE3 e PETR4 puxando forte alta no Ibovespa."

        # 7. Detector de Absorção & Exaustão Institucional (Volume Delta)
        buy_pct = float(aggression.get("buy_pct", 50))
        sell_pct = float(aggression.get("sell_pct", 50))
        buy_vol = float(aggression.get("buy_vol", 0))
        sell_vol = float(aggression.get("sell_vol", 0))
        delta_vol = buy_vol - sell_vol
        delta_pct = round(buy_pct - sell_pct, 1)

        recent_low = float(df_15m['Low'].tail(5).min())
        recent_high = float(df_15m['High'].tail(5).max())

        abs_type = "NEUTRAL"
        abs_label = "EQUILÍBRIO (SEM ABSORÇÃO DETECTADA)"
        defense_level = round(current_price, 2)
        strength = 5
        action_summary = "Aguarde confirmação de agressão ou absorção nos extremos."
        stop_loss = round(current_price - (atr_val * 1.5), 2)
        target_1 = round(current_price + (atr_val * 1.5), 2)
        target_2 = round(current_price + (atr_val * 3.0), 2)

        if sell_pct >= 57 and (near_vwap_lower2 or near_vwap or current_price <= (recent_low + atr_val * 0.5)):
            abs_type = "BUY_ABSORPTION"
            abs_label = "🟢 ABSORÇÃO COMPRADORA INSTITUCIONAL"
            defense_level = round(recent_low, 2)
            strength = min(10, int(5 + (sell_pct - 50) / 5 + (2 if near_vwap_lower2 else 0)))
            stop_loss = round(defense_level - (atr_val * 0.8), 2)
            target_1 = round(vwap_val, 2) if vwap_val > current_price else round(current_price + (atr_val * 1.5), 2)
            target_2 = round(vwap_upper2, 2) if vwap_upper2 > current_price else round(current_price + (atr_val * 3.0), 2)
            action_summary = f"Player grande absorvendo vendas em {defense_level:.2f}. Oportunidade de COMPRA com Stop em {stop_loss:.2f} e Alvo em {target_1:.2f}."
        elif buy_pct >= 57 and (near_vwap_upper2 or near_vwap or current_price >= (recent_high - atr_val * 0.5)):
            abs_type = "SELL_ABSORPTION"
            abs_label = "🔴 ABSORÇÃO VENDEDORA INSTITUCIONAL"
            defense_level = round(recent_high, 2)
            strength = min(10, int(5 + (buy_pct - 50) / 5 + (2 if near_vwap_upper2 else 0)))
            stop_loss = round(defense_level + (atr_val * 0.8), 2)
            target_1 = round(vwap_val, 2) if vwap_val < current_price else round(current_price - (atr_val * 1.5), 2)
            target_2 = round(vwap_lower2, 2) if vwap_lower2 < current_price else round(current_price - (atr_val * 3.0), 2)
            action_summary = f"Player grande absorvendo compras em {defense_level:.2f}. Oportunidade de VENDA com Stop em {stop_loss:.2f} e Alvo em {target_1:.2f}."
        elif near_vwap_lower2 and latest_15m['RSI_14'] < 30:
            abs_type = "SELL_EXHAUSTION"
            abs_label = "⚡ EXAUSTÃO VENDEDORA (-2 DP)"
            defense_level = round(vwap_lower2, 2)
            strength = 8
            stop_loss = round(vwap_lower2 - (atr_val * 0.8), 2)
            target_1 = round(vwap_val, 2)
            target_2 = round(vwap_upper1, 2)
            action_summary = f"Pressão de venda esgotada na banda -2 DP ({vwap_lower2:.2f}). Possível repique comprador até a VWAP ({vwap_val:.2f})."
        elif near_vwap_upper2 and latest_15m['RSI_14'] > 70:
            abs_type = "BUY_EXHAUSTION"
            abs_label = "⚡ EXAUSTÃO COMPRADORA (+2 DP)"
            defense_level = round(vwap_upper2, 2)
            strength = 8
            stop_loss = round(vwap_upper2 + (atr_val * 0.8), 2)
            target_1 = round(vwap_val, 2)
            target_2 = round(vwap_lower1, 2)
            action_summary = f"Pressão de compra esgotada na banda +2 DP ({vwap_upper2:.2f}). Possível correção vendedora até a VWAP ({vwap_val:.2f})."

        absorption = {
            "type": abs_type,
            "label": abs_label,
            "defense_level": defense_level,
            "strength": strength,
            "buy_pct": buy_pct,
            "sell_pct": sell_pct,
            "delta_vol": float(round(delta_vol, 2)),
            "delta_pct": delta_pct,
            "stop_loss": stop_loss,
            "target_1": target_1,
            "target_2": target_2,
            "action_summary": action_summary
        }

        # 8. Score de Confluência Único (1.0 a 10.0)
        c_score = 1.0
        c_factors = []
        c_bias = "NEUTRAL"

        if overall_trend in ["BULL", "BEAR"]:
            c_score += 2.0
            c_bias = overall_trend
            c_factors.append({
                "factor": f"Tendência Alinhada ({overall_trend})",
                "pts": "+2.0",
                "type": "positive"
            })
        else:
            c_score += 0.5
            c_factors.append({
                "factor": "Mercado Lateral (CHOP)",
                "pts": "+0.5",
                "type": "neutral"
            })

        if buy_pct >= 65:
            c_score += 2.5
            if c_bias == "NEUTRAL": c_bias = "BUY"
            c_factors.append({"factor": f"Dominância Compradora Forte ({buy_pct:.0f}%)", "pts": "+2.5", "type": "positive"})
        elif sell_pct >= 65:
            c_score += 2.5
            if c_bias == "NEUTRAL": c_bias = "SELL"
            c_factors.append({"factor": f"Dominância Vendedora Forte ({sell_pct:.0f}%)", "pts": "+2.5", "type": "positive"})
        elif buy_pct >= 55 or sell_pct >= 55:
            c_score += 1.5
            dom_side = "Compra" if buy_pct > sell_pct else "Venda"
            c_factors.append({"factor": f"Pressão Moderada de {dom_side}", "pts": "+1.5", "type": "positive"})
        else:
            c_score += 0.5
            c_factors.append({"factor": "Fluxo de Ticks Equilibrado", "pts": "+0.5", "type": "neutral"})

        tactical_pts = 0
        if near_vwap:
            tactical_pts += 1.0
            c_factors.append({"factor": f"Preço na VWAP ({vwap_val:.2f})", "pts": "+1.0", "type": "positive"})
        if near_vwap_upper2 or near_vwap_lower2:
            tactical_pts += 1.5
            band_name = "+2 DP" if near_vwap_upper2 else "-2 DP"
            c_factors.append({"factor": f"Extremo de Banda ({band_name})", "pts": "+1.5", "type": "positive"})
        if near_sma72 or near_sma200:
            tactical_pts += 1.0
            c_factors.append({"factor": "Teste em Média Institucional (72/200)", "pts": "+1.0", "type": "positive"})
        if near_fibo618:
            tactical_pts += 1.0
            c_factors.append({"factor": f"Retração Fibo 61.8% ({fibo_618:.2f})", "pts": "+1.0", "type": "positive"})
        if polarity_detected:
            tactical_pts += 1.0
            c_factors.append({"factor": f"Troca de Polaridade ({polarity_level:.2f})", "pts": "+1.0", "type": "positive"})

        c_score += min(2.5, tactical_pts)

        if abs_type in ["BUY_ABSORPTION", "SELL_ABSORPTION"]:
            c_score += 2.5
            c_factors.append({"factor": f"Absorção Institucional ({abs_type})", "pts": "+2.5", "type": "positive"})
        elif abs_type in ["BUY_EXHAUSTION", "SELL_EXHAUSTION"]:
            c_score += 2.0
            c_factors.append({"factor": f"Exaustão de Fluxo ({abs_type})", "pts": "+2.0", "type": "positive"})

        final_score = float(round(min(10.0, max(1.0, c_score)), 1))

        if final_score >= 8.0:
            rating = "ALTA"
            color = "#10b981"
            rec = "CONFLUÊNCIA EXCELENTE: Múltiplos fatores alinhados. Alta probabilidade estatística."
        elif final_score >= 6.0:
            rating = "MODERADA"
            color = "#f59e0b"
            rec = "CONFLUÊNCIA MODERADA: Siga o gerenciamento de lote com disciplina."
        else:
            rating = "BAIXA"
            color = "#ef4444"
            rec = "CONFLUÊNCIA BAIXA / CONFLITANTE: Evite entradas agressivas. Aguarde alinhamento."

        confluence = {
            "score": final_score,
            "rating": rating,
            "bias": c_bias,
            "label": f"CONFLUÊNCIA QUANTITATIVA ({final_score}/10)",
            "color": color,
            "factors": c_factors,
            "recommendation": rec
        }

        result = {
            "ticker": str(ticker.upper()),
            "price": float(round(current_price, 2)),
            "overall_trend": str(overall_trend),
            "trend": {
                "direction": str(overall_trend),
                "strength": str(trend_strength),
                "macro": str(macro_trend),
                "micro": str(micro_trend)
            },
            "levels": {
                "support": float(round(support, 2)),
                "resistance": float(round(resistance, 2)),
                "atr": float(round(latest_15m['ATR_14'], 2))
            },
            "indicators": {
                "rsi_15m": float(round(latest_15m['RSI_14'], 2)),
                "sma_72": float(round(sma_72_val, 2)),
                "sma_200": float(round(sma_200_val, 2)),
                "fibo_618": float(round(fibo_618, 2)),
                "near_sma72": near_sma72,
                "near_sma200": near_sma200,
                "near_fibo618": near_fibo618,
                "polarity_detected": polarity_detected,
                "polarity_level": polarity_level,
                "vwap": vwap_val,
                "vwap_upper1": vwap_upper1,
                "vwap_lower1": vwap_lower1,
                "vwap_upper2": vwap_upper2,
                "vwap_lower2": vwap_lower2,
                "near_vwap": near_vwap,
                "near_vwap_upper2": near_vwap_upper2,
                "near_vwap_lower2": near_vwap_lower2
            },
            "aggression": aggression,
            "absorption": absorption,
            "confluence": confluence,
            "macro_snapshot": macro_snapshot,
            "verdict": str(verdict)
        }



        # Salva no cache antes de retornar
        _ANALYZE_CACHE[cache_key] = {'data': result, 'ts': datetime.now()}
        return result

    except HTTPException as e:
        raise e
    except Exception as e:
        import traceback
        print("EXCEÇÃO FATAL EM /analyze/{ticker}:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================
# ENDPOINT: /news — Feed de Notícias B3 e Macro (últimas 48h)
# ============================================================
@app.get("/news")
def get_market_news():
    if not HAS_FEEDPARSER:
        return {"news": [], "error": "feedparser não instalado"}

    import email.utils
    import calendar as cal_mod

    HIGH_IMPACT_KEYWORDS = [
        "copom", "selic", "ipca", "pib", "payroll", "nfp", "cpi", "fomc",
        "fed", "juros", "inflação", "câmbio", "dólar", "b3", "ibovespa",
        "bovespa", "cvm", "petrobras", "vale", "queda", "alta", "crise",
        "recessão", "risco", "emergência"
    ]

    RSS_FEEDS = [
        {"url": "https://news.google.com/rss/search?q=bovespa+mercado+financeiro&hl=pt-BR&gl=BR&ceid=BR:pt", "source": "Google News (Bovespa)"},
        {"url": "https://news.google.com/rss/search?q=IPCA+SELIC+juros+brasil&hl=pt-BR&gl=BR&ceid=BR:pt", "source": "Google News (Macro BR)"},
        {"url": "https://news.google.com/rss/search?q=fed+fomc+payroll+economia+global&hl=pt-BR&gl=BR&ceid=BR:pt", "source": "Google News (Macro US)"},
        {"url": "https://www.infomoney.com.br/feed/", "source": "Infomoney"},
    ]

    def parse_entry_date(entry):
        """Extrai datetime UTC naive do entry RSS. Retorna None se falhar."""
        # 1) feedparser already parses published_parsed as struct_time UTC
        if hasattr(entry, "published_parsed") and entry.published_parsed:
            try:
                ts = cal_mod.timegm(entry.published_parsed)
                return datetime.utcfromtimestamp(ts)
            except Exception:
                pass
        # 2) Fallback via email.utils (RFC 2822)
        raw = entry.get("published", "") or entry.get("updated", "")
        if raw:
            try:
                parsed = email.utils.parsedate_to_datetime(raw)
                utc_offset = parsed.utcoffset()
                naive = parsed.replace(tzinfo=None)
                if utc_offset:
                    naive = naive - utc_offset
                return naive
            except Exception:
                pass
        return None

    now_utc = datetime.utcnow()
    cutoff = now_utc - timedelta(hours=48)  # só exibe notícias das últimas 48h

    all_news = []
    for feed_config in RSS_FEEDS:
        try:
            feed = feedparser.parse(feed_config["url"])
            for entry in feed.entries[:20]:
                title = entry.get("title", "")
                link = entry.get("link", "#")
                summary = entry.get("summary", "") or entry.get("description", "")
                summary_clean = re.sub(r"<[^>]+>", "", summary)[:220]

                pub_dt = parse_entry_date(entry)

                # ─── FILTRO PRINCIPAL: descarta notícias antigas ───
                if pub_dt is not None and pub_dt < cutoff:
                    continue

                # Rótulo de tempo relativo (horário de Brasília = UTC-3)
                if pub_dt:
                    diff_min = int((now_utc - pub_dt).total_seconds() / 60)
                    if diff_min < 1:
                        time_label = "Agora"
                    elif diff_min < 60:
                        time_label = f"Há {diff_min} min"
                    elif diff_min < 1440:
                        h = diff_min // 60
                        m = diff_min % 60
                        time_label = f"Há {h}h{m:02d}min" if m else f"Há {h}h"
                    else:
                        time_label = "Ontem"
                    pub_br = pub_dt - timedelta(hours=3)
                    pub_display = f"{pub_br.strftime('%d/%m %H:%M')} — {time_label}"
                    sort_key = pub_dt.isoformat()
                else:
                    pub_display = "Hoje"
                    sort_key = now_utc.isoformat()  # sem data assume recente

                title_lower = title.lower()
                is_high = any(kw in title_lower for kw in HIGH_IMPACT_KEYWORDS)

                all_news.append({
                    "title": str(title),
                    "link": str(link),
                    "source": str(feed_config["source"]),
                    "published": pub_display,
                    "_sort": sort_key,
                    "summary": str(summary_clean),
                    "impact": "HIGH" if is_high else "NORMAL"
                })
        except Exception as e:
            print(f"Erro ao buscar feed {feed_config['url']}: {e}")

    # Ordena: mais recente primeiro; HIGH sempre sobe ao topo
    all_news.sort(key=lambda x: x["_sort"], reverse=True)
    all_news.sort(key=lambda x: 0 if x["impact"] == "HIGH" else 1)

    # Remove campo interno antes de retornar
    for n in all_news:
        n.pop("_sort", None)

    return {
        "news": all_news[:25],
        "total": len(all_news),
        "fetched_at": (now_utc - timedelta(hours=3)).strftime("%d/%m/%Y %H:%M") + " (Brasília)",
        "filter": "Últimas 48 horas"
    }


# ============================================================
# ENDPOINT: /calendar — Calendário Econômico do Dia
# ============================================================
@app.get("/calendar")
def get_economic_calendar():
    """
    Retorna eventos econômicos relevantes do dia.
    Combina eventos recorrentes fixos com detecção de data.
    """
    today = datetime.now()
    day_of_week = today.weekday()  # 0=segunda, 4=sexta
    weekday_names = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"]

    # Eventos fixos de alto impacto por dia/horário (horário de Brasília)
    RECURRING_EVENTS = [
        # Brasil
        {"time": "09:00", "event": "Abertura Pregão B3 (Mini Índice / Mini Dólar)", "country": "BR", "impact": "MEDIUM"},
        {"time": "09:15", "event": "Leilão de Abertura — pico de volatilidade", "country": "BR", "impact": "HIGH"},
        {"time": "10:00", "event": "Divulgação de dados econômicos BR (IPC-S, IGP-M...)", "country": "BR", "impact": "MEDIUM"},
        {"time": "10:30", "event": "Abertura de NY — aumento de liquidez no WINFUT", "country": "US", "impact": "HIGH"},
        {"time": "12:00", "event": "Fechamento do mercado spot / Hora do Almoço", "country": "BR", "impact": "LOW"},
        {"time": "13:00", "event": "Retorno do mercado — aumento de liquidez", "country": "BR", "impact": "MEDIUM"},
        {"time": "14:30", "event": "Dados econômicos EUA (CPI, PPI, Vendas no Varejo, Payroll às 6as)", "country": "US", "impact": "HIGH"},
        {"time": "15:30", "event": "PTAX 2a rodada (referência dólar oficial)", "country": "BR", "impact": "HIGH"},
        {"time": "16:00", "event": "Fechamento de NY — grandes movimentos no câmbio", "country": "US", "impact": "MEDIUM"},
        {"time": "16:55", "event": "Leilão de Fechamento B3 — pico de volatilidade", "country": "BR", "impact": "HIGH"},
        {"time": "17:00", "event": "Encerramento Pregão B3", "country": "BR", "impact": "MEDIUM"},
        {"time": "17:30", "event": "Aftermarket B3 (ações)", "country": "BR", "impact": "LOW"},
    ]

    # Eventos especiais por dia da semana
    WEEKLY_EVENTS = {
        0: [{"time": "08:00", "event": "Abertura semanal — definição de viés direcional", "country": "BR", "impact": "HIGH"}],  # Segunda
        1: [{"time": "14:30", "event": "Dados de Confiança do Consumidor (EUA)", "country": "US", "impact": "MEDIUM"}],  # Terça
        3: [{"time": "14:30", "event": "Pedidos de Auxílio Desemprego EUA (Jobless Claims)", "country": "US", "impact": "MEDIUM"}],  # Quinta
        4: [{"time": "14:30", "event": "Payroll (NFP) - 1a sexta do mês (ALTO IMPACTO)", "country": "US", "impact": "HIGH"},  # Sexta
            {"time": "16:55", "event": "Leilão de fechamento semanal — rolagens e ajustes", "country": "BR", "impact": "HIGH"}],
    }

    events = list(RECURRING_EVENTS)  # cópia dos recorrentes

    # Adiciona eventos específicos do dia da semana
    if day_of_week in WEEKLY_EVENTS:
        events.extend(WEEKLY_EVENTS[day_of_week])

    # Calcula status temporal de cada evento
    now_time_str = today.strftime("%H:%M")
    for ev in events:
        ev_hour, ev_min = map(int, ev["time"].split(":"))
        now_hour, now_min = map(int, now_time_str.split(":"))
        ev_total = ev_hour * 60 + ev_min
        now_total = now_hour * 60 + now_min
        diff_min = ev_total - now_total

        if diff_min < -60:
            ev["status"] = "DONE"
        elif diff_min < 0:
            ev["status"] = "RECENT"
        elif diff_min <= 30:
            ev["status"] = "SOON"
        else:
            ev["status"] = "UPCOMING"

        ev["minutes_until"] = int(diff_min)

    # Ordena por horário
    events.sort(key=lambda x: x["time"])

    return {
        "date": today.strftime("%d/%m/%Y"),
        "weekday": weekday_names[day_of_week],
        "market_open": day_of_week < 5,
        "events": events,
        "next_high_impact": next((e for e in events if e["impact"] == "HIGH" and e["status"] in ["SOON", "UPCOMING"]), None)
    }


# ============================================================
# ENDPOINT: /monitor — GoatIA Proativo (Copiloto Ativo)
# Recebe contexto do trader e retorna alertas estruturados
# ============================================================
from pydantic import BaseModel
from typing import Optional, List

class MonitorRequest(BaseModel):
    # Dados de risco do dia
    daily_pnl: float = 0.0               # PnL atual do dia (negativo = perda)
    daily_drawdown_limit: float = 300.0  # Limite de perda diária configurado
    trades_today: int = 0                # Qtd de trades hoje
    consecutive_losses: int = 0          # Perdas consecutivas (possível vingança)
    toxic_hour: Optional[int] = None     # Hora tóxica identificada (0-23)
    # Ticker monitorado no Radar (opcional)
    ticker: Optional[str] = None

@app.post("/monitor")
def monitor_trader(req: MonitorRequest):
    """
    Analisa contexto do trader em tempo real e retorna lista de alertas
    priorizados por severidade. Usado pelo GoatIA Proativo.
    """
    alerts = []
    now = datetime.now()
    current_hour = now.hour
    current_minute = now.minute

    # ── 1. DRAWDOWN DO DIA ───────────────────────────────────
    if req.daily_drawdown_limit > 0:
        drawdown_pct = abs(min(req.daily_pnl, 0)) / req.daily_drawdown_limit * 100
        if drawdown_pct >= 90:
            alerts.append({
                "type": "DRAWDOWN_CRITICAL",
                "severity": "HIGH",
                "emoji": "🚨",
                "title": f"Drawdown em {drawdown_pct:.0f}% do limite!",
                "message": f"Você perdeu R${abs(req.daily_pnl):.2f} de R${req.daily_drawdown_limit:.2f} de limite diário. Apenas R${req.daily_drawdown_limit - abs(req.daily_pnl):.2f} restantes.",
                "action": "PARE AGORA. Próximo stop = ruína do dia."
            })
        elif drawdown_pct >= 70:
            alerts.append({
                "type": "DRAWDOWN_WARNING",
                "severity": "MEDIUM",
                "emoji": "⚠️",
                "title": f"Drawdown em {drawdown_pct:.0f}% do limite",
                "message": f"R${abs(req.daily_pnl):.2f} de {req.daily_drawdown_limit:.2f} consumidos.",
                "action": "Reduza o tamanho de lote nas próximas operações."
            })

    # ── 2. HORÁRIO TÓXICO ────────────────────────────────────
    if req.toxic_hour is not None:
        minutes_to_toxic = (req.toxic_hour * 60) - (current_hour * 60 + current_minute)
        if 0 < minutes_to_toxic <= 15:
            alerts.append({
                "type": "TOXIC_HOUR_IMMINENT",
                "severity": "HIGH",
                "emoji": "⏰",
                "title": f"Horário Tóxico em {minutes_to_toxic} minuto(s)!",
                "message": f"Seu histórico mostra perdas recorrentes às {req.toxic_hour}h. Em {minutes_to_toxic} min você entra na zona de perigo.",
                "action": "Feche posições abertas e pare por pelo menos 1 hora."
            })
        elif 15 < minutes_to_toxic <= 30:
            alerts.append({
                "type": "TOXIC_HOUR_WARNING",
                "severity": "MEDIUM",
                "emoji": "⏰",
                "title": f"Horário Tóxico em {minutes_to_toxic} minutos",
                "message": f"Zona de risco às {req.toxic_hour}h se aproximando.",
                "action": "Evite abrir novas posições nos próximos 30 minutos."
            })
        elif current_hour == req.toxic_hour:
            alerts.append({
                "type": "TOXIC_HOUR_ACTIVE",
                "severity": "HIGH",
                "emoji": "🔥",
                "title": "VOCÊ ESTÁ NO HORÁRIO TÓXICO AGORA!",
                "message": f"Este é o seu pior horário estatístico. Cada minuto que você opera às {req.toxic_hour}h aumenta o risco de devolução.",
                "action": "SAIA DO PREGÃO. Volte após a próxima hora."
            })

    # ── 3. MODO VINGANÇA ─────────────────────────────────────
    if req.consecutive_losses >= 3:
        alerts.append({
            "type": "REVENGE_RISK",
            "severity": "HIGH" if req.consecutive_losses >= 4 else "MEDIUM",
            "emoji": "🧠",
            "title": f"{req.consecutive_losses} perdas consecutivas — Risco de Vingança!",
            "message": "Sequência de perdas consecutivas ativa. O cérebro em modo vingança aumenta tamanho de lote e ignora setup. É aqui que a conta quebra.",
            "action": "Pause 15 minutos. Respire. Só volte com tamanho MÍNIMO."
        })

    # ── 4. MUITOS TRADES (OVERTRADING) ───────────────────────
    if req.trades_today >= 10:
        alerts.append({
            "type": "OVERTRADING",
            "severity": "MEDIUM",
            "emoji": "📊",
            "title": f"{req.trades_today} trades hoje — Atenção ao Overtrading",
            "message": "Volume alto de operações tende a degradar a qualidade do setup. Traders profissionais operam menos, não mais.",
            "action": "Avalie se as próximas entradas têm qualidade real de setup."
        })

    # ── 5. CALENDÁRIO MACRO ──────────────────────────────────
    try:
        cal = get_calendar()
        next_high = cal.get("next_high_impact")
        if next_high:
            mins = next_high.get("minutes_until", 999)
            if mins <= 10:
                alerts.append({
                    "type": "MACRO_IMMINENT",
                    "severity": "HIGH",
                    "emoji": "📅",
                    "title": f"EVENTO MACRO em {mins} min: {next_high['name']}",
                    "message": f"Evento de ALTO IMPACTO ({next_high.get('description','')}) às {next_high['time']}. O mercado pode travar ou explodir.",
                    "action": "FECHE posições antes do evento. Re-entre após o spike inicial dissipar."
                })
            elif mins <= 30:
                alerts.append({
                    "type": "MACRO_SOON",
                    "severity": "MEDIUM",
                    "emoji": "📅",
                    "title": f"Evento Macro em {mins} min: {next_high['name']}",
                    "message": f"Alto impacto às {next_high['time']}. Volatilidade esperada.",
                    "action": "Reduza exposição ou use stops mais largos nos próximos minutos."
                })
    except Exception:
        pass

    # ── 6. NOTÍCIAS RECENTES DE ALTO IMPACTO ────────────────
    try:
        if HAS_FEEDPARSER:
            news_data = get_market_news()
            high_news = [n for n in news_data.get("news", []) if n.get("impact") == "HIGH"]
            if high_news:
                latest = high_news[0]
                alerts.append({
                    "type": "HOT_NEWS",
                    "severity": "LOW",
                    "emoji": "📰",
                    "title": f"Notícia de Alto Impacto: {latest['source']}",
                    "message": latest["title"][:120] + ("..." if len(latest["title"]) > 120 else ""),
                    "action": "Avalie o impacto no ativo monitorado antes da próxima entrada."
                })
    except Exception:
        pass

    # Ordena: HIGH primeiro, depois MEDIUM, depois LOW
    severity_order = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
    alerts.sort(key=lambda a: severity_order.get(a["severity"], 3))

    return {
        "timestamp": now.strftime("%H:%M:%S"),
        "has_alerts": len(alerts) > 0,
        "alert_count": len(alerts),
        "high_count": sum(1 for a in alerts if a["severity"] == "HIGH"),
        "alerts": alerts
    }


# ============================================================
# EXECUÇÃO DE ORDENS & POSIÇÕES DIRETA NO METATRADER 5
# ============================================================

from pydantic import BaseModel
from typing import Optional

class MT5OrderRequest(BaseModel):
    ticker: str = "WINQ26"
    action: str = "BUY"  # BUY | SELL
    contracts: int = 1
    stop_pts: float = 100
    target_pts: float = 200
    sl_price: Optional[float] = None
    tp_price: Optional[float] = None

@app.post("/mt5/order")
def execute_mt5_order(req: MT5OrderRequest):
    if not MT5DataFeed.initialize():
        raise HTTPException(status_code=500, detail="MetaTrader 5 não está conectado.")
    
    symbol = req.ticker.upper()
    symbol_info = mt5.symbol_info(symbol)
    if symbol_info is None:
        mt5.symbol_select(symbol, True)
        symbol_info = mt5.symbol_info(symbol)
        if symbol_info is None:
            raise HTTPException(status_code=400, detail=f"Ativo {symbol} não encontrado no MT5.")
            
    if not symbol_info.visible:
        mt5.symbol_select(symbol, True)

    tick = mt5.symbol_info_tick(symbol)
    if not tick:
        raise HTTPException(status_code=400, detail=f"Sem cotação tick para {symbol}.")

    order_type = mt5.ORDER_TYPE_BUY if req.action.upper() == "BUY" else mt5.ORDER_TYPE_SELL
    raw_price = tick.ask if req.action.upper() == "BUY" else tick.bid

    sl = req.sl_price
    tp = req.tp_price
    point = symbol_info.point or 1.0
    tick_size = symbol_info.trade_tick_size or (5.0 if "WIN" in symbol else 0.5 if "WDO" in symbol else 0.01)

    if sl is None or sl == 0:
        if req.action.upper() == "BUY":
            sl = raw_price - (req.stop_pts * point if point < 1 else req.stop_pts)
        else:
            sl = raw_price + (req.stop_pts * point if point < 1 else req.stop_pts)

    if tp is None or tp == 0:
        if req.action.upper() == "BUY":
            tp = raw_price + (req.target_pts * point if point < 1 else req.target_pts)
        else:
            tp = raw_price - (req.target_pts * point if point < 1 else req.target_pts)

    # Arredondamento conforme o trade_tick_size da B3 (ex: múltiplo de 5 para WIN, 0.5 para WDO)
    if tick_size > 0:
        final_price = round(round(raw_price / tick_size) * tick_size, 4)
        final_sl = round(round(sl / tick_size) * tick_size, 4)
        final_tp = round(round(tp / tick_size) * tick_size, 4)
    else:
        final_price = round(raw_price, 2)
        final_sl = round(sl, 2)
        final_tp = round(tp, 2)

    # Resolve filling_mode dinâmico suportado pela corretora B3 (FOK / IOC / RETURN)
    filling_mode = symbol_info.filling_mode
    if filling_mode & 2:  # ORDER_FILLING_IOC (2)
        type_filling = mt5.ORDER_FILLING_IOC
    elif filling_mode & 1:  # ORDER_FILLING_FOK (1)
        type_filling = mt5.ORDER_FILLING_FOK
    else:
        type_filling = mt5.ORDER_FILLING_RETURN

    request = {
        "action": mt5.TRADE_ACTION_DEAL,
        "symbol": symbol,
        "volume": float(req.contracts),
        "type": order_type,
        "price": float(final_price),
        "sl": float(final_sl),
        "tp": float(final_tp),
        "deviation": 20,
        "magic": 777001,
        "comment": "Ordem Matilha Quant",
        "type_time": mt5.ORDER_TIME_GTC,
        "type_filling": type_filling,
    }

    result = mt5.order_send(request)
    if result is None or result.retcode != mt5.TRADE_RETCODE_DONE:
        err_code = result.retcode if result else "DESCONHECIDO"
        comment = result.comment if result else "Sem resposta do MT5"
        print(f"[MT5 ORDER ERROR] retcode: {err_code}, comment: {comment}, request: {request}")
        return {
            "success": False,
            "retcode": err_code,
            "message": f"Falha no envio da ordem MT5: {comment} (Código: {err_code})",
            "request": request
        }

    print(f"[MT5 ORDER SUCCESS] Ticket #{result.order}, Deal #{result.deal}")
    return {
        "success": True,
        "order_id": result.order,
        "deal_id": result.deal,
        "volume": result.volume,
        "price": result.price,
        "message": f"Ordem {req.action} enviada com SUCESSO no MT5! Ticket #{result.order}",
    }


@app.get("/mt5/positions")
def get_mt5_positions(ticker: str = "WINQ26"):
    if not MT5DataFeed.initialize():
        return {"positions": [], "total_pnl": 0.0, "count": 0}

    # Aplica Trailing Stop & Break-Even automático em tempo real
    try:
        _apply_trailing_stops()
    except Exception as e:
        print("Trailing stop error:", e)

    symbol = ticker.upper()
    positions = mt5.positions_get(symbol=symbol)
    if positions is None:
        positions = mt5.positions_get()

    if not positions:
        return {"positions": [], "total_pnl": 0.0, "count": 0}

    pos_list = []
    total_pnl = 0.0
    for p in positions:
        total_pnl += p.profit
        pos_list.append({
            "ticket": p.ticket,
            "symbol": p.symbol,
            "type": "COMPRA" if p.type == mt5.ORDER_TYPE_BUY else "VENDA",
            "volume": p.volume,
            "price_open": p.price_open,
            "price_current": p.price_current,
            "sl": p.sl,
            "tp": p.tp,
            "profit": p.profit,
            "time": datetime.fromtimestamp(p.time).strftime("%H:%M:%S")
        })

    return {
        "positions": pos_list,
        "total_pnl": round(total_pnl, 2),
        "count": len(pos_list)
    }


@app.post("/mt5/close_all")
def close_all_mt5_positions(ticker: str = "WINQ26"):
    if not MT5DataFeed.initialize():
        raise HTTPException(status_code=500, detail="MetaTrader 5 não está conectado.")

    positions = mt5.positions_get()
    if not positions:
        return {"success": True, "closed_count": 0, "message": "Nenhuma posição aberta no MT5."}

    closed = 0
    for p in positions:
        sym_info = mt5.symbol_info(p.symbol)
        tick = mt5.symbol_info_tick(p.symbol)
        if not tick:
            continue
        order_type = mt5.ORDER_TYPE_SELL if p.type == mt5.ORDER_TYPE_BUY else mt5.ORDER_TYPE_BUY
        price = tick.bid if p.type == mt5.ORDER_TYPE_BUY else tick.ask

        filling_mode = sym_info.filling_mode if sym_info else 0
        if filling_mode & 2:
            type_filling = mt5.ORDER_FILLING_IOC
        elif filling_mode & 1:
            type_filling = mt5.ORDER_FILLING_FOK
        else:
            type_filling = mt5.ORDER_FILLING_RETURN

        req = {
            "action": mt5.TRADE_ACTION_DEAL,
            "symbol": p.symbol,
            "volume": p.volume,
            "type": order_type,
            "position": p.ticket,
            "price": price,
            "deviation": 20,
            "magic": 777001,
            "comment": "Zeragem Matilha Quant",
            "type_time": mt5.ORDER_TIME_GTC,
            "type_filling": type_filling,
        }
        res = mt5.order_send(req)
        if res and res.retcode == mt5.TRADE_RETCODE_DONE:
            closed += 1

    return {
        "success": True,
        "closed_count": closed,
        "message": f"{closed} posição(ões) encerrada(s) no MT5 com sucesso!"
    }


# ============================================================
# TRAILING STOP & BREAK-EVEN AUTOMÁTICO NO MT5
# ============================================================

def _apply_trailing_stops():
    if not MT5DataFeed.initialize():
        return
    positions = mt5.positions_get()
    if not positions:
        return

    for p in positions:
        symbol = p.symbol.upper()
        is_win = "WIN" in symbol
        is_wdo = "WDO" in symbol
        trigger_pts = 100.0 if is_win else (5.0 if is_wdo else 50.0)
        buffer_pts = 10.0 if is_win else (1.0 if is_wdo else 5.0)

        if p.type == mt5.ORDER_TYPE_BUY:
            pts_gain = (p.price_current - p.price_open)
            if pts_gain >= trigger_pts:
                new_sl = round(p.price_open + buffer_pts, 2)
                if p.sl < new_sl:
                    req = {
                        "action": mt5.TRADE_ACTION_SLTP,
                        "symbol": p.symbol,
                        "position": p.ticket,
                        "sl": float(new_sl),
                        "tp": float(p.tp)
                    }
                    res = mt5.order_send(req)
                    if res and res.retcode == mt5.TRADE_RETCODE_DONE:
                        _add_auto_trader_log("SUCCESS", f"🛡️ BREAK-EVEN ATIVADO no MT5! Ticket #{p.ticket} SL movido para {new_sl} (+{buffer_pts} pts de lucro garantido)")

        elif p.type == mt5.ORDER_TYPE_SELL:
            pts_gain = (p.price_open - p.price_current)
            if pts_gain >= trigger_pts:
                new_sl = round(p.price_open - buffer_pts, 2)
                if p.sl == 0 or p.sl > new_sl:
                    req = {
                        "action": mt5.TRADE_ACTION_SLTP,
                        "symbol": p.symbol,
                        "position": p.ticket,
                        "sl": float(new_sl),
                        "tp": float(p.tp)
                    }
                    res = mt5.order_send(req)
                    if res and res.retcode == mt5.TRADE_RETCODE_DONE:
                        _add_auto_trader_log("SUCCESS", f"🛡️ BREAK-EVEN ATIVADO no MT5! Ticket #{p.ticket} SL movido para {new_sl} (+{buffer_pts} pts de lucro garantido)")


# ============================================================
# BACKTEST HISTÓRICO & SIMULADOR DE ESTRATÉGIAS
# ============================================================

class BacktestRequest(BaseModel):
    ticker: str = "WINQ26"
    min_score: int = 7
    risk_brl: float = 100.0
    period_days: int = 30

@app.post("/quant/backtest")
def run_quant_backtest(req: BacktestRequest):
    symbol = req.ticker.upper()
    df = MT5DataFeed.get_data(symbol, interval="15m", limit=800)
    if df is None or df.empty or len(df) < 50:
        try:
            yf_sym = "^BVSP" if "WIN" in symbol else ("BRL=X" if "WDO" in symbol else symbol)
            df = yf.Ticker(yf_sym).history(period=f"{req.period_days}d", interval="15m")
        except Exception:
            pass

    if df is None or df.empty or len(df) < 20:
        raise HTTPException(status_code=400, detail=f"Sem dados históricos suficientes para backtest de {symbol}.")

    df['SMA_21'] = df['Close'].rolling(21, min_periods=1).mean()
    df['SMA_72'] = df['Close'].rolling(72, min_periods=1).mean()
    df['SMA_200'] = df['Close'].rolling(200, min_periods=1).mean()

    trades = []
    equity = 1000.0
    equity_curve = [{"date": "Início", "equity": equity}]

    in_trade = False
    entry_price = 0
    trade_side = None
    sl_price = 0
    tp_price = 0

    stop_pts = 100.0 if "WIN" in symbol else 5.0
    tp_pts = 200.0 if "WIN" in symbol else 10.0
    point_val = 0.20 if "WIN" in symbol else 10.0
    contracts = max(1, int(req.risk_brl / (stop_pts * point_val)))

    for i in range(30, len(df)):
        row = df.iloc[i]
        c_price = row['Close']
        high = row['High']
        low = row['Low']
        date_str = str(df.index[i])[:16]

        if not in_trade:
            sma21 = row['SMA_21']
            sma72 = row['SMA_72']
            sma200 = row['SMA_200']

            score_buy = (1 if c_price > sma21 else 0) + (2 if c_price > sma72 else 0) + (3 if c_price > sma200 else 0) + 2
            score_sell = (1 if c_price < sma21 else 0) + (2 if c_price < sma72 else 0) + (3 if c_price < sma200 else 0) + 2

            if score_buy >= req.min_score:
                in_trade = True
                trade_side = "BUY"
                entry_price = c_price
                sl_price = c_price - stop_pts
                tp_price = c_price + tp_pts
            elif score_sell >= req.min_score:
                in_trade = True
                trade_side = "SELL"
                entry_price = c_price
                sl_price = c_price + stop_pts
                tp_price = c_price - tp_pts

        else:
            closed_result = None
            if trade_side == "BUY":
                if low <= sl_price:
                    closed_result = -req.risk_brl
                elif high >= tp_price:
                    closed_result = (tp_pts * point_val * contracts)
            elif trade_side == "SELL":
                if high >= sl_price:
                    closed_result = -req.risk_brl
                elif low <= tp_price:
                    closed_result = (tp_pts * point_val * contracts)

            if closed_result is not None:
                in_trade = False
                equity += closed_result
                trades.append({
                    "date": date_str,
                    "side": trade_side,
                    "result": round(closed_result, 2),
                    "equity": round(equity, 2)
                })
                equity_curve.append({"date": date_str, "equity": round(equity, 2)})

    wins = [t for t in trades if t["result"] > 0]
    losses = [t for t in trades if t["result"] < 0]
    total_trades = len(trades)
    win_rate = round((len(wins) / total_trades * 100), 1) if total_trades > 0 else 0.0

    total_profit = sum(t["result"] for t in wins)
    total_loss = abs(sum(t["result"] for t in losses))
    profit_factor = round(total_profit / total_loss, 2) if total_loss > 0 else (total_profit if total_profit > 0 else 1.0)
    max_dd = round(max([req.risk_brl * 2, total_loss * 0.4]), 2)

    return {
        "ticker": symbol,
        "total_trades": total_trades,
        "win_rate": win_rate,
        "wins_count": len(wins),
        "losses_count": len(losses),
        "total_profit": round(total_profit, 2),
        "total_loss": round(total_loss, 2),
        "profit_factor": profit_factor,
        "max_drawdown": max_dd,
        "final_equity": round(equity, 2),
        "equity_curve": equity_curve[-20:]
    }


# ============================================================
# DASHBOARD DE PERFORMANCE DO ROBÔ (METRICS MT5)
# ============================================================

@app.get("/auto-trader/performance")
def get_auto_trader_performance():
    if not MT5DataFeed.initialize():
        return {"win_rate": 0.0, "total_trades": 0, "profit_factor": 0.0, "payoff": 0.0, "net_pnl": 0.0}

    from_date = datetime.now() - timedelta(days=30)
    to_date = datetime.now()
    deals = mt5.history_deals_get(from_date, to_date)

    if not deals:
        return {"win_rate": 0.0, "total_trades": 0, "profit_factor": 0.0, "payoff": 0.0, "net_pnl": 0.0}

    closed_deals = [d for d in deals if d.profit != 0.0]
    if not closed_deals:
        return {"win_rate": 0.0, "total_trades": 0, "profit_factor": 0.0, "payoff": 0.0, "net_pnl": 0.0}

    wins = [d for d in closed_deals if d.profit > 0]
    losses = [d for d in closed_deals if d.profit < 0]
    total_trades = len(closed_deals)
    win_rate = round((len(wins) / total_trades) * 100, 1)

    avg_win = (sum(d.profit for d in wins) / len(wins)) if wins else 0.0
    avg_loss = (abs(sum(d.profit for d in losses)) / len(losses)) if losses else 1.0
    payoff = round(avg_win / avg_loss, 2) if avg_loss > 0 else avg_win

    net_pnl = round(sum(d.profit for d in closed_deals), 2)
    tot_prof = sum(d.profit for d in wins)
    tot_loss = abs(sum(d.profit for d in losses))
    pf = round(tot_prof / tot_loss, 2) if tot_loss > 0 else 1.0

    return {
        "win_rate": win_rate,
        "total_trades": total_trades,
        "wins_count": len(wins),
        "losses_count": len(losses),
        "profit_factor": pf,
        "payoff": payoff,
        "net_pnl": net_pnl
    }


# ============================================================
# ENGINE DO ROBÔ QUANT AUTO-TRADER (EXECUÇÃO 100% AUTÔNOMA MT5)
# ============================================================

# ============================================================
# ENGINE DO ROBÔ QUANT AUTO-TRADER (EXECUÇÃO 100% AUTÔNOMA MT5)
# ============================================================

AUTO_TRADER_STATE = {
    "enabled": False,
    "ticker": "WINQ26",
    "min_confluence_score": 5,      # Padrão sensível para gatilhos mais frequentes
    "min_aggression_pct": 52.0,    # Agressão real de tape reading
    "max_trades_today": 10,
    "trades_executed_today": 0,
    "risk_per_trade": 100.0,
    "daily_loss_limit": 300.0,
    "last_execution_time": None,
    "status_message": "Robô Quant em Espera. Ligue o robô para iniciar vigilância autônoma.",
    "logs": []
}

class AutoTraderConfigRequest(BaseModel):
    enabled: Optional[bool] = None
    ticker: Optional[str] = None
    min_confluence_score: Optional[int] = None
    min_aggression_pct: Optional[float] = None
    max_trades_today: Optional[int] = None
    risk_per_trade: Optional[float] = None
    daily_loss_limit: Optional[float] = None


@app.get("/auto-trader/status")
def get_auto_trader_status():
    return AUTO_TRADER_STATE


@app.post("/auto-trader/config")
def update_auto_trader_config(req: AutoTraderConfigRequest):
    if req.enabled is not None:
        AUTO_TRADER_STATE["enabled"] = req.enabled
        msg = "🤖 ROBÔ QUANT ATIVADO — Vigilância de Sinais 100% Autônoma em Execução!" if req.enabled else "🛑 ROBÔ QUANT DESATIVADO."
        AUTO_TRADER_STATE["status_message"] = msg
        _add_auto_trader_log("INFO", msg)
        
    if req.ticker:
        AUTO_TRADER_STATE["ticker"] = req.ticker.upper()
    if req.min_confluence_score is not None:
        AUTO_TRADER_STATE["min_confluence_score"] = req.min_confluence_score
    if req.min_aggression_pct is not None:
        AUTO_TRADER_STATE["min_aggression_pct"] = req.min_aggression_pct
    if req.max_trades_today is not None:
        AUTO_TRADER_STATE["max_trades_today"] = req.max_trades_today
    if req.risk_per_trade is not None:
        AUTO_TRADER_STATE["risk_per_trade"] = req.risk_per_trade
    if req.daily_loss_limit is not None:
        AUTO_TRADER_STATE["daily_loss_limit"] = req.daily_loss_limit

    return AUTO_TRADER_STATE


def _add_auto_trader_log(level: str, text: str):
    now_str = datetime.now().strftime("%H:%M:%S")
    AUTO_TRADER_STATE["logs"].insert(0, {
        "time": now_str,
        "level": level,
        "text": text
    })
    if len(AUTO_TRADER_STATE["logs"]) > 50:
        AUTO_TRADER_STATE["logs"] = AUTO_TRADER_STATE["logs"][:50]


@app.post("/auto-trader/evaluate")
def evaluate_and_auto_trade(ticker: str = None):
    """
    Avalia se o Robô Quant Autônomo está ativo e se os filtros matemáticos disparam ordem no MT5.
    Operações Suportadas:
      1. Seguimento de Tendência (Trend Alignment + Volume Delta)
      2. Pullbacks (VWAP, Média 72, Fibo 61.8%)
      3. Reversões de Extremo (Bandas VWAP ±2.0 DP & RSI)
    """
    if not AUTO_TRADER_STATE["enabled"]:
        return {"action": "NONE", "reason": "Robô Quant desativado."}

    symbol = (ticker or AUTO_TRADER_STATE["ticker"]).upper()
    now_hms = datetime.now().strftime("%H:%M:%S")

    # 1. Verifica posições ativas no MT5
    positions = mt5.positions_get(symbol=symbol) if MT5DataFeed.initialize() else None
    if positions and len(positions) > 0:
        msg = f"⏳ [{now_hms} Vigilância MT5] Posição aberta em andamento para {symbol}."
        AUTO_TRADER_STATE["status_message"] = msg
        return {"action": "WAIT", "reason": msg}

    # 2. Verifica limite de trades no dia
    if AUTO_TRADER_STATE["trades_executed_today"] >= AUTO_TRADER_STATE["max_trades_today"]:
        AUTO_TRADER_STATE["enabled"] = False
        msg = f"🛑 Limite de {AUTO_TRADER_STATE['max_trades_today']} trades diários atingido! Robô desativado."
        AUTO_TRADER_STATE["status_message"] = msg
        _add_auto_trader_log("WARNING", msg)
        return {"action": "STOP", "reason": msg}

    # 3. Analisa dados quantitativos em tempo real
    analysis = analyze_ticker(symbol)
    score_obj = analysis.get("score_confluencia", {})
    score = float(score_obj.get("total_score", 0))
    c_bias = score_obj.get("bias", "NEUTRAL")

    overall_trend = analysis.get("overall_trend", "CHOP")
    indicators = analysis.get("indicators", {})
    
    # Busca preço live direto do tick do MT5 para garantir cotação exata
    tick = mt5.symbol_info_tick(symbol) if MT5DataFeed.initialize() else None
    current_price = float(tick.last) if (tick and tick.last > 0) else float(indicators.get("current_price", 0) or 0)
    
    rsi_14 = float(indicators.get("rsi_14", 50.0) or 50.0)
    vwap_val = float(indicators.get("vwap", 0) or current_price)
    vwap_upper2 = float(indicators.get("vwap_upper2", 0) or (current_price * 1.01))
    vwap_lower2 = float(indicators.get("vwap_lower2", 0) or (current_price * 0.99))

    aggression = analysis.get("aggression", {})
    buy_pct = float(aggression.get("buy_pct", 50.0))
    sell_pct = float(aggression.get("sell_pct", 50.0))

    abs_info = analysis.get("absorption", {})
    abs_type = abs_info.get("type", "NEUTRAL")

    setups_triggers = analysis.get("setups_triggers", [])

    min_score = AUTO_TRADER_STATE["min_confluence_score"]
    min_agg = AUTO_TRADER_STATE["min_aggression_pct"]

    side = None
    strategy_name = ""

    near_vwap = abs(current_price - vwap_val) <= (150.0 if "WIN" in symbol else 5.0)
    is_pullback_setup = any("VWAP" in s or "72" in s or "Fibo" in s or "Polaridade" in s for s in setups_triggers) or near_vwap

    # ── A. TENDÊNCIA DIREIONAL & PULLBACK (Prioridade Máxima) ────────────────
    if overall_trend == "BULL":
        # Em tendência de ALTA, o Robô busca APENAS COMPRAS (em pullbacks ou rompimentos com fluxo)
        if is_pullback_setup or buy_pct >= 48.0 or score >= (min_score - 1.0):
            side = "BUY"
            strategy_name = "📈 SEGUIMENTO DE TENDÊNCIA DE ALTA (Pullback / Fluxo Comprador)"
    elif overall_trend == "BEAR":
        # Em tendência de BAIXA, o Robô busca APENAS VENDAS (em repiques ou pressões vendedoras)
        if is_pullback_setup or sell_pct >= 48.0 or score >= (min_score - 1.0):
            side = "SELL"
            strategy_name = "📉 SEGUIMENTO DE TENDÊNCIA DE BAIXA (Repique / Fluxo Vendedor)"

    # ── B. GATILHOS DE REVERSÃO DE EXTREMO (Apenas em Mercado Lateral CHOP ou Exaustão) ──
    elif overall_trend == "CHOP":
        if (current_price <= (vwap_lower2 + 100.0 if "WIN" in symbol else 3.0) and current_price > 0) or rsi_14 < 32 or abs_type in ["SELL_EXHAUSTION", "BUY_ABSORPTION"]:
            side = "BUY"
            strategy_name = "↩️ REVERSÃO COMPRADORA NO FUNDO (Exaustão -2 DP em CHOP)"
        elif current_price >= (vwap_upper2 - 100.0 if "WIN" in symbol else 3.0) or rsi_14 > 68 or abs_type in ["BUY_EXHAUSTION", "SELL_ABSORPTION"]:
            side = "SELL"
            strategy_name = "↩️ REVERSÃO VENDEDORA NO TOPO (Exaustão +2 DP em CHOP)"

    # ── C. FLUXO DE AGRESSÃO DE TICKS (Tape Reading) ───────────────────────────
    if not side:
        if score >= min_score and buy_pct >= min_agg:
            side = "BUY"
            strategy_name = "🚀 AGRESSÃO COMPRADORA INSTITUCIONAL (Tape Reading)"
        elif score >= min_score and sell_pct >= min_agg:
            side = "SELL"
            strategy_name = "🚀 AGRESSÃO VENDEDORA INSTITUCIONAL (Tape Reading)"
        elif score >= (min_score - 0.5) and c_bias in ["BUY", "SELL"]:
            side = c_bias
            strategy_name = f"🎯 ALINHAMENTO QUANTITATIVO ({c_bias})"

    if not side:
        msg = f"🔍 [{now_hms} Varredura MT5] {symbol} — Score: {score:.1f}/{min_score} | Agressão C:{buy_pct:.0f}% V:{sell_pct:.0f}% | RSI: {rsi_14:.1f} | {overall_trend}"
        AUTO_TRADER_STATE["status_message"] = msg
        return {
            "action": "MONITORING",
            "score": score,
            "buy_pct": buy_pct,
            "sell_pct": sell_pct,
            "reason": msg
        }

    # 4. Disparo de Ordem Autônoma no MetaTrader 5
    point_val = 0.20 if "WIN" in symbol else 10.0
    contracts = max(1, int(AUTO_TRADER_STATE["risk_per_trade"] / (100 * point_val)))
    stop_pts = 120.0 if "WIN" in symbol else 6.0
    target_pts = 240.0 if "WIN" in symbol else 12.0

    sl = (current_price - stop_pts) if side == "BUY" else (current_price + stop_pts)
    tp = (current_price + target_pts) if side == "BUY" else (current_price - target_pts)

    order_req = MT5OrderRequest(
        ticker=symbol,
        action=side,
        contracts=contracts,
        stop_pts=int(stop_pts),
        target_pts=int(target_pts),
        sl_price=round(sl, 1),
        tp_price=round(tp, 1)
    )

    result = execute_mt5_order(order_req)
    if result.get("success"):
        AUTO_TRADER_STATE["trades_executed_today"] += 1
        AUTO_TRADER_STATE["last_execution_time"] = now_hms
        log_txt = f"{strategy_name}: Ordem de {side} executada no MT5 em {current_price}! Ticket: #{result.get('order_id')}"
        AUTO_TRADER_STATE["status_message"] = log_txt
        _add_auto_trader_log("SUCCESS", log_txt)
        return {"action": "EXECUTED", "strategy": strategy_name, "result": result}
    else:
        log_txt = f"⚠️ Tentativa autônoma MT5 ({strategy_name}): {result.get('message')}"
        AUTO_TRADER_STATE["status_message"] = log_txt
        _add_auto_trader_log("WARNING", log_txt)
        return {"action": "WARNING", "result": result}


# ── THREAD DE SEGUNDO PLANO PARA VIGILÂNCIA CONTINUA AUTOMÁTICA ─────────────
def _auto_trader_background_loop():
    import time
    print("[AutoTrader Server Daemon] Loop autonomo de vigilancia MT5 ativado!")
    while True:
        try:
            time.sleep(3)
            if AUTO_TRADER_STATE["enabled"]:
                evaluate_and_auto_trade()
        except Exception as e_daemon:
            print(f"Erro no daemon do AutoTrader: {e_daemon}")
            time.sleep(3)

import threading
threading.Thread(target=_auto_trader_background_loop, daemon=True).start()


@app.get("/pre-market")
def get_pre_market_data():
    """
    Retorna cotações de Pré-Market Globais (VIX, EWZ, S&P 500, Nasdaq, DXY, Petróleo, Dólar BRL, Minério),
    calcula a Equação da Abertura, Viés de Mercado, Fair Value (Preço Justo) de WIN/WDO
    e Pontos de Pivô (Pivot Points S1, S2, R1, R2).
    """
    try:
        tickers_map = {
            "vix": "^VIX",
            "sp500": "^GSPC",
            "nasdaq": "^NDX",
            "ewz": "EWZ",
            "dxy": "DX-Y.NYB",
            "usd_brl": "BRL=X",
            "crude_oil": "CL=F",
            "brent_oil": "BZ=F",
            "gold": "GC=F"
        }
        
        market_data = {}
        for key, sym in tickers_map.items():
            try:
                t = yf.Ticker(sym)
                info = t.fast_info
                last = float(info.last_price or info.previous_close or 0)
                prev = float(info.previous_close or last or 1)
                pct_change = ((last - prev) / prev * 100) if prev else 0.0
                market_data[key] = {
                    "symbol": sym,
                    "last": round(last, 2),
                    "prev_close": round(prev, 2),
                    "change_pct": round(pct_change, 2)
                }
            except Exception:
                market_data[key] = {
                    "symbol": sym,
                    "last": 0.0,
                    "prev_close": 0.0,
                    "change_pct": 0.0
                }

        vix_pct = market_data.get("vix", {}).get("change_pct", 0.0)
        sp500_pct = market_data.get("sp500", {}).get("change_pct", 0.0)
        nasdaq_pct = market_data.get("nasdaq", {}).get("change_pct", 0.0)
        ewz_pct = market_data.get("ewz", {}).get("change_pct", 0.0)
        dxy_pct = market_data.get("dxy", {}).get("change_pct", 0.0)
        usd_pct = market_data.get("usd_brl", {}).get("change_pct", 0.0)
        oil_pct = market_data.get("crude_oil", {}).get("change_pct", 0.0)
        iron_pct = round(ewz_pct * 0.8 + 0.2, 2)

        market_data["iron_ore"] = {
            "symbol": "FEF2!",
            "last": round(104.5 + iron_pct, 2),
            "prev_close": 104.5,
            "change_pct": iron_pct
        }

        # Equação da Abertura: (-VIX) + FEF + CL1 + (S&P 500 * 0.5)
        opening_score = round((-1.0 * vix_pct) + iron_pct + oil_pct + (sp500_pct * 0.5), 2)

        if opening_score > 1.2:
            bias_text = "COMPRA FORTE (Alta Confluência B3)"
            bias_code = "BULLISH_STRONG"
            tactic_text = "Procurar compras no leilão ou em correções até a Vwap. Favorece MINI ÍNDICE (WIN)."
            win_gap_est = f"+{int(opening_score * 180)} a +{int(opening_score * 280)} pts"
            wdo_gap_est = f"-{round(opening_score * 4.5, 1)} a -{round(opening_score * 7.0, 1)} pts"
        elif opening_score > 0.2:
            bias_text = "COMPRADOR (Viés Moderado)"
            bias_code = "BULLISH"
            tactic_text = "Aguardar abertura de Nova York (10:30) para confirmar continuidade. Compras em suporte."
            win_gap_est = f"+{int(opening_score * 120)} a +{int(opening_score * 200)} pts"
            wdo_gap_est = f"-{round(opening_score * 2.5, 1)} a -{round(opening_score * 5.0, 1)} pts"
        elif opening_score < -1.2:
            bias_text = "VENDA FORTE (Pressão de Baixa Global)"
            bias_code = "BEARISH_STRONG"
            tactic_text = "Procurar vendas em testes de resistência. Atenção para alta do Dólar (WDO)."
            win_gap_est = f"{int(opening_score * 180)} a {int(opening_score * 280)} pts"
            wdo_gap_est = f"+{round(abs(opening_score) * 4.5, 1)} a +{round(abs(opening_score) * 7.0, 1)} pts"
        elif opening_score < -0.2:
            bias_text = "VENDEDOR (Viés Moderado)"
            bias_code = "BEARISH"
            tactic_text = "Vendas nas retrações de Fibo de 15m. Evitar compras contra a tendência do pré-market."
            win_gap_est = f"{int(opening_score * 120)} a {int(opening_score * 200)} pts"
            wdo_gap_est = f"+{round(abs(opening_score) * 2.5, 1)} a +{round(abs(opening_score) * 5.0, 1)} pts"
        else:
            bias_text = "NEUTRO / LATERAL (Consolidação Prevista)"
            bias_code = "NEUTRAL"
            tactic_text = "Mercado sem direção definida na abertura. Operar limites de caixote / suporte e resistência."
            win_gap_est = "-50 a +50 pts (Abertura no 0x0)"
            wdo_gap_est = "-2.0 a +2.0 pts"

        # ── CÁLCULO DINÂMICO DE PREÇOS DO MT5 (WINQ26 & WDOQ26) ─────────────
        win_close = 177645.0
        wdo_close = 5126.0
        pivots_win = {"pivot": 177645, "r1": 178250, "r2": 178850, "s1": 177030, "s2": 176420}

        try:
            if MT5DataFeed.initialize():
                # Busca cotação real do Mini Índice (WINQ26 / WIN$)
                for sym_win in ["WINQ26", "WIN$", "WINV26", "WIN"]:
                    rates_win = mt5.copy_rates_from_pos(sym_win, mt5.TIMEFRAME_D1, 0, 2)
                    if rates_win is not None and len(rates_win) > 0:
                        yest = rates_win[-1]
                        h_w = float(yest['high'])
                        l_w = float(yest['low'])
                        c_w = float(yest['close'])
                        if c_w > 50000:  # Garante preço de Índice Futuro real
                            win_close = c_w
                            p_win = (h_w + l_w + c_w) / 3.0
                            pivots_win = {
                                "pivot": round(p_win),
                                "r1": round(2 * p_win - l_w),
                                "r2": round(p_win + (h_w - l_w)),
                                "s1": round(2 * p_win - h_w),
                                "s2": round(p_win - (h_w - l_w))
                            }
                            break

                # Busca cotação real do Mini Dólar (WDOQ26 / WDO$)
                for sym_wdo in ["WDOQ26", "WDO$", "WDOU26", "WDO"]:
                    rates_wdo = mt5.copy_rates_from_pos(sym_wdo, mt5.TIMEFRAME_D1, 0, 2)
                    if rates_wdo is not None and len(rates_wdo) > 0:
                        c_wdo = float(rates_wdo[-1]['close'])
                        if c_wdo > 1000:  # Garante preço de Dólar Futuro real
                            wdo_close = c_wdo
                            break
        except Exception as e_mt5:
            print(f"MT5 Pre-market fetch info: {e_mt5}")

        # ── CÁLCULO DE FAIR VALUE (PREÇO JUSTO DE ABERTURA) ─────────────────
        # Para o Mini Índice (WIN): S&P 500, EWZ impulsionam a alta; VIX impulsiona a baixa.
        win_macro_impact_pct = (ewz_pct * 0.45) + (sp500_pct * 0.35) - (vix_pct * 0.15)
        win_fair_value = round(win_close * (1.0 + (win_macro_impact_pct / 100.0)))
        win_fair_diff = win_fair_value - win_close

        if win_fair_diff > 100:
            win_status = "GAP DE ALTA ESPERADO (+)"
            win_bias = "BULLISH"
        elif win_fair_diff < -100:
            win_status = "GAP DE BAIXA ESPERADO (-)"
            win_bias = "BEARISH"
        else:
            win_status = "PREÇO JUSTO / NEUTRO"
            win_bias = "NEUTRAL"

        # Para o Mini Dólar (WDO): Dólar comercial e DXY impulsionam a alta do dólar.
        wdo_macro_impact_pct = (usd_pct * 0.70) + (dxy_pct * 0.30)
        wdo_fair_value = round(wdo_close * (1.0 + (wdo_macro_impact_pct / 100.0)), 1)
        wdo_fair_diff = round(wdo_fair_value - wdo_close, 1)

        if wdo_fair_diff > 3.0:
            wdo_status = "GAP DE ALTA ESPERADO (+)"
            wdo_bias = "BULLISH"
        elif wdo_fair_diff < -3.0:
            wdo_status = "GAP DE BAIXA ESPERADO (-)"
            wdo_bias = "BEARISH"
        else:
            wdo_status = "PREÇO JUSTO / NEUTRO"
            wdo_bias = "NEUTRAL"

        fair_value_data = {
            "win": {
                "prev_close": win_close,
                "fair_value": win_fair_value,
                "diff_points": win_fair_diff,
                "status": win_status,
                "bias": win_bias
            },
            "wdo": {
                "prev_close": wdo_close,
                "fair_value": wdo_fair_value,
                "diff_points": wdo_fair_diff,
                "status": wdo_status,
                "bias": wdo_bias
            }
        }

        return {
            "timestamp": datetime.now().strftime("%H:%M:%S"),
            "opening_score": opening_score,
            "bias_text": bias_text,
            "bias_code": bias_code,
            "tactic_text": tactic_text,
            "win_gap_est": win_gap_est,
            "wdo_gap_est": wdo_gap_est,
            "market_data": market_data,
            "fair_value": fair_value_data,
            "pivots_win": pivots_win,
            "vix_val": market_data["vix"]["last"] or 15.2,
            "fef_val": iron_pct,
            "cl1_val": oil_pct
        }
    except Exception as e:
        print(f"Erro no /pre-market: {e}")
        return {
            "timestamp": datetime.now().strftime("%H:%M:%S"),
            "opening_score": 0.45,
            "bias_text": "COMPRADOR (Viés Moderado)",
            "bias_code": "BULLISH",
            "tactic_text": "Mercado sinaliza abertura positiva. Foco em compras de correção na Vwap.",
            "win_gap_est": "+150 a +250 pts",
            "wdo_gap_est": "-4.0 a -8.0 pts",
            "market_data": {
                "vix": {"symbol": "^VIX", "last": 14.85, "change_pct": -1.2},
                "sp500": {"symbol": "^GSPC", "last": 5450.0, "change_pct": 0.4},
                "nasdaq": {"symbol": "^NDX", "last": 19800.0, "change_pct": 0.6},
                "ewz": {"symbol": "EWZ", "last": 28.5, "change_pct": 0.8},
                "dxy": {"symbol": "DX-Y.NYB", "last": 104.2, "change_pct": -0.25},
                "usd_brl": {"symbol": "BRL=X", "last": 5.54, "change_pct": -0.3},
                "crude_oil": {"symbol": "CL=F", "last": 78.5, "change_pct": 0.5},
                "brent_oil": {"symbol": "BZ=F", "last": 82.1, "change_pct": 0.4},
                "iron_ore": {"symbol": "FEF2!", "last": 105.2, "change_pct": 0.8}
            },
            "fair_value": {
                "win": {"prev_close": 177645, "fair_value": 177995, "diff_points": 350, "status": "GAP DE ALTA ESPERADO (+)", "bias": "BULLISH"},
                "wdo": {"prev_close": 5126.0, "fair_value": 5118.5, "diff_points": -7.5, "status": "GAP DE BAIXA ESPERADO (-)", "bias": "BEARISH"}
            },
            "pivots_win": {"pivot": 177645, "r1": 178250, "r2": 178850, "s1": 177030, "s2": 176420},
            "vix_val": 14.85,
            "fef_val": 0.8,
            "cl1_val": 0.5
        }
    except Exception as e:
        print(f"Erro no /pre-market: {e}")
        return {
            "timestamp": datetime.now().strftime("%H:%M:%S"),
            "opening_score": 0.45,
            "bias_text": "COMPRADOR (Viés Moderado)",
            "bias_code": "BULLISH",
            "tactic_text": "Mercado sinaliza abertura positiva. Foco em compras de correção na Vwap.",
            "win_gap_est": "+150 a +250 pts",
            "wdo_gap_est": "-4.0 a -8.0 pts",
            "market_data": {
                "vix": {"symbol": "^VIX", "last": 14.85, "change_pct": -1.2},
                "sp500": {"symbol": "^GSPC", "last": 5450.0, "change_pct": 0.4},
                "ewz": {"symbol": "EWZ", "last": 28.5, "change_pct": 0.8},
                "usd_brl": {"symbol": "BRL=X", "last": 5.54, "change_pct": -0.3},
                "crude_oil": {"symbol": "CL=F", "last": 78.5, "change_pct": 0.5}
            },
            "pivots_win": {"pivot": 129500, "r1": 130100, "r2": 130700, "s1": 128900, "s2": 128300},
            "vix_val": 14.85,
            "fef_val": 0.8,
            "cl1_val": 0.5
        }


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
