import { useContext } from 'react';
import { TradeContext } from './TradeContext';

export const useTrades = () => useContext(TradeContext);