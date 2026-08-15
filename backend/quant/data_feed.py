import MetaTrader5 as mt5
import pandas as pd
from datetime import datetime

class MT5DataFeed:
    _initialized = False

    @classmethod
    def initialize(cls):
        if not cls._initialized:
            if not mt5.initialize():
                print("MT5 initialize() falhou. Erro:", mt5.last_error())
                return False
            cls._initialized = True
        return True

    @classmethod
    def shutdown(cls):
        if cls._initialized:
            mt5.shutdown()
            cls._initialized = False

    @classmethod
    def map_timeframe(cls, interval: str):
        mapping = {
            "1d": mt5.TIMEFRAME_D1,
            "1h": mt5.TIMEFRAME_H1,
            "60m": mt5.TIMEFRAME_H1,
            "30m": mt5.TIMEFRAME_M30,
            "15m": mt5.TIMEFRAME_M15,
            "5m": mt5.TIMEFRAME_M5,
            "2m": mt5.TIMEFRAME_M2,
            "1m": mt5.TIMEFRAME_M1
        }
        return mapping.get(interval.lower(), mt5.TIMEFRAME_M15)

    @classmethod
    def get_data(cls, symbol: str, interval: str = "1d", limit: int = 100) -> pd.DataFrame:
        if not cls.initialize():
            print("Falha ao inicializar MT5.")
            return None
            
        timeframe = cls.map_timeframe(interval)
        
        # Tenta habilitar o símbolo no Market Watch
        if not mt5.symbol_select(symbol, True):
            print(f"MT5: Falha ao selecionar símbolo {symbol}")
            
        rates = mt5.copy_rates_from_pos(symbol, timeframe, 0, limit)
        if rates is None or len(rates) == 0:
            # Fallback para timeframe M15 caso D1 ou outro não esteja carregado no MT5
            rates = mt5.copy_rates_from_pos(symbol, mt5.TIMEFRAME_M15, 0, limit)
            
        if rates is None or len(rates) == 0:
            print(f"MT5: Nenhum dado encontrado para {symbol} no timeframe {interval}")
            return None
            
        df = pd.DataFrame(rates)
        df['time'] = pd.to_datetime(df['time'], unit='s')
        
        # Mapeamento para o padrão esperado pelo yfinance / engine antigo
        df.rename(columns={
            'time': 'Date', 
            'open': 'Open', 
            'high': 'High', 
            'low': 'Low', 
            'close': 'Close', 
            'tick_volume': 'Volume',
            'real_volume': 'RealVolume'
        }, inplace=True)
        
        df.set_index('Date', inplace=True)
        return df

    @classmethod
    def get_current_price(cls, symbol: str) -> float:
        if not cls.initialize():
            return 0.0
        tick = mt5.symbol_info_tick(symbol)
        if tick is not None:
            return tick.last
        return 0.0

    @classmethod
    def get_ticks_aggression(cls, symbol: str, count: int = 1000) -> dict:
        try:
            if not cls.initialize():
                return {"buy_pct": 50.0, "sell_pct": 50.0, "buy_vol": 0, "sell_vol": 0, "dominant": "NEUTRAL"}
            
            if not mt5.symbol_select(symbol, True):
                return {"buy_pct": 50.0, "sell_pct": 50.0, "buy_vol": 0, "sell_vol": 0, "dominant": "NEUTRAL"}

            # Ancura a busca no horário real do servidor do MT5 para evitar discrepância do relógio local
            last_tick = mt5.symbol_info_tick(symbol)
            if last_tick is not None and last_tick.time > 0:
                from_time = datetime.fromtimestamp(last_tick.time - 600)
            else:
                from_time = datetime.now() - timedelta(minutes=30)

            ticks = mt5.copy_ticks_from(symbol, from_time, count, mt5.COPY_TICKS_ALL)
            if ticks is None or len(ticks) == 0:
                # Fallback de tempo de 1 hora atrás
                ticks = mt5.copy_ticks_from(symbol, datetime.now() - timedelta(hours=1), count, mt5.COPY_TICKS_ALL)
            
            if ticks is None or len(ticks) == 0:
                return {"buy_pct": 50.0, "sell_pct": 50.0, "buy_vol": 0, "sell_vol": 0, "dominant": "NEUTRAL"}

            ticks = ticks[-count:]
            buy_vol = 0.0
            sell_vol = 0.0
            prev_last = None

            for t in ticks:
                flags = int(t['flags'])
                vol = float(t['volume']) if t['volume'] > 0 else 1.0
                if flags & mt5.TICK_FLAG_BUY:
                    buy_vol += vol
                elif flags & mt5.TICK_FLAG_SELL:
                    sell_vol += vol
                elif t['last'] >= t['ask'] and t['ask'] > 0:
                    buy_vol += vol
                elif t['last'] <= t['bid'] and t['bid'] > 0:
                    sell_vol += vol
                elif prev_last is not None:
                    if t['last'] > prev_last:
                        buy_vol += vol
                    elif t['last'] < prev_last:
                        sell_vol += vol
                    else:
                        buy_vol += vol / 2.0
                        sell_vol += vol / 2.0
                else:
                    buy_vol += vol / 2.0
                    sell_vol += vol / 2.0
                prev_last = t['last']

            total_vol = buy_vol + sell_vol
            if total_vol == 0:
                return {"buy_pct": 50.0, "sell_pct": 50.0, "buy_vol": 0, "sell_vol": 0, "dominant": "NEUTRAL"}

            buy_pct = float(round((buy_vol / total_vol) * 100, 1))
            sell_pct = float(round((sell_vol / total_vol) * 100, 1))
            dominant = "BUY" if buy_pct > 55 else ("SELL" if sell_pct > 55 else "NEUTRAL")

            return {
                "buy_pct": buy_pct,
                "sell_pct": sell_pct,
                "buy_vol": int(buy_vol),
                "sell_vol": int(sell_vol),
                "dominant": str(dominant)
            }
        except Exception as e:
            print(f"Erro em get_ticks_aggression: {e}")
            return {"buy_pct": 50.0, "sell_pct": 50.0, "buy_vol": 0, "sell_vol": 0, "dominant": "NEUTRAL"}

    @classmethod
    def get_market_snapshot(cls, symbols: list = None) -> list:
        if symbols is None:
            symbols = ["VALE3", "PETR4", "ITUB4", "IFNC", "DI1F27", "WSP$"]
            
        snapshot = []
        try:
            if not cls.initialize():
                return []

            for sym in symbols:
                try:
                    mt5.symbol_select(sym, True)
                    tick = mt5.symbol_info_tick(sym)
                    info = mt5.symbol_info(sym)
                    
                    rates = mt5.copy_rates_from_pos(sym, mt5.TIMEFRAME_D1, 0, 2)
                    
                    change_pct = 0.0
                    last_price = 0.0
                    
                    if rates is not None and len(rates) >= 2:
                        prev_close = float(rates[0]['close'])
                        curr_price = float(rates[1]['close'])
                        last_price = curr_price
                        if prev_close > 0:
                            change_pct = float(round(((curr_price - prev_close) / prev_close) * 100, 2))
                    elif tick is not None:
                        last_price = float(tick.last)

                    snapshot.append({
                        "symbol": str(sym),
                        "name": str(info.description) if (info and info.description) else str(sym),
                        "price": float(round(last_price, 2)) if last_price else 0.0,
                        "change_pct": change_pct,
                        "status": "UP" if change_pct > 0 else ("DOWN" if change_pct < 0 else "NEUTRAL")
                    })
                except Exception as sym_err:
                    print(f"Erro ao processar símbolo {sym} no snapshot: {sym_err}")
                    snapshot.append({
                        "symbol": str(sym),
                        "name": str(sym),
                        "price": 0.0,
                        "change_pct": 0.0,
                        "status": "NEUTRAL"
                    })
        except Exception as e:
            print(f"Erro em get_market_snapshot: {e}")

        return snapshot


