import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  FairValueGap,
  Instrument,
  LiquidityLevel,
  MarketCandle,
  MarketStructureShift,
  OrderBlock,
  TradeDirection,
} from '../../types/domain';
import { formatPrice } from '../../domain/marketData/instruments';
import { getNYTimeDetails, getSessionFromTimestamp } from '../../domain/timezone/nyTimezone';

interface MarketChartProps {
  candles: MarketCandle[];
  instrument: Instrument;
  liquidityLevels?: LiquidityLevel[];
  fvgs?: FairValueGap[];
  orderBlocks?: OrderBlock[];
  mss?: MarketStructureShift | null;
  // Trade placement
  activeTrade?: {
    direction: TradeDirection;
    entryPrice: number;
    stopLoss: number;
    takeProfit: number;
    riskAmount: number;
  } | null;
  onUpdateTradePrice?: (type: 'entry' | 'sl' | 'tp', price: number) => void;
  // Screenshot exporter ref or trigger
  onCanvasReady?: (getScreenshot: () => string) => void;
}

export const MarketChart: React.FC<MarketChartProps> = ({
  candles,
  instrument,
  liquidityLevels = [],
  fvgs = [],
  orderBlocks = [],
  mss = null,
  activeTrade = null,
  onUpdateTradePrice,
  onCanvasReady,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Viewport state
  const [candleWidth, setCandleWidth] = useState(8); // pixels per candle
  const [candleGap, setCandleGap] = useState(3);
  const [scrollOffset, setScrollOffset] = useState(0); // offset from the right
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartOffset, setDragStartOffset] = useState(0);

  // Crosshair state
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [hoverCandle, setHoverCandle] = useState<MarketCandle | null>(null);

  // Active drag on trade lines (entry / sl / tp)
  const [draggingLine, setDraggingLine] = useState<'entry' | 'sl' | 'tp' | null>(null);

  // Price conversion helper ref so handlers have fresh values
  const priceRangeRef = useRef({ min: 0, max: 100, height: 400, topPadding: 40, bottomPadding: 30 });

  // Expose screenshot method
  useEffect(() => {
    if (onCanvasReady && canvasRef.current) {
      onCanvasReady(() => {
        return canvasRef.current ? canvasRef.current.toDataURL('image/png') : '';
      });
    }
  }, [onCanvasReady]);

  // Keep scroll pinned to the latest revealed candle when new candles arrive
  const prevCountRef = useRef(candles.length);
  useEffect(() => {
    if (candles.length !== prevCountRef.current) {
      prevCountRef.current = candles.length;
      setScrollOffset(0); // Pin to current newest candle
    }
  }, [candles.length]);

  // Main Render Loop
  const renderChart = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    if (candles.length === 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = '13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('No market candles in buffer', width / 2, height / 2);
      return;
    }

    const priceAxisWidth = 72;
    const timeAxisHeight = 26;
    const chartWidth = width - priceAxisWidth;
    const chartHeight = height - timeAxisHeight;

    const step = candleWidth + candleGap;
    const visibleCount = Math.ceil(chartWidth / step) + 2;

    // Calculate start and end indices of visible candles
    const total = candles.length;
    const endIndex = Math.max(0, Math.min(total - 1, total - 1 - Math.floor(scrollOffset / step)));
    const startIndex = Math.max(0, endIndex - visibleCount);

    const visibleCandles = candles.slice(startIndex, endIndex + 1);
    if (visibleCandles.length === 0) return;

    // Calculate price range of visible window + trade levels
    let minPrice = Infinity;
    let maxPrice = -Infinity;

    for (const c of visibleCandles) {
      if (c.low < minPrice) minPrice = c.low;
      if (c.high > maxPrice) maxPrice = c.high;
    }

    if (activeTrade) {
      minPrice = Math.min(minPrice, activeTrade.entryPrice, activeTrade.stopLoss, activeTrade.takeProfit);
      maxPrice = Math.max(maxPrice, activeTrade.entryPrice, activeTrade.stopLoss, activeTrade.takeProfit);
    }

    // Add 8% vertical padding
    const padding = (maxPrice - minPrice) * 0.08 || 10;
    minPrice -= padding;
    maxPrice += padding;

    priceRangeRef.current = {
      min: minPrice,
      max: maxPrice,
      height: chartHeight,
      topPadding: 20,
      bottomPadding: 20,
    };

    const priceToY = (price: number): number => {
      const usableHeight = chartHeight - 40;
      return 20 + usableHeight * (1 - (price - minPrice) / (maxPrice - minPrice));
    };

    const yToPrice = (y: number): number => {
      const usableHeight = chartHeight - 40;
      const ratio = 1 - (y - 20) / usableHeight;
      return minPrice + ratio * (maxPrice - minPrice);
    };

    // 1. Draw Grid Lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;

    // Horizontal price grid
    const priceRange = maxPrice - minPrice;
    const numPriceSteps = 6;
    const priceStep = priceRange / numPriceSteps;

    ctx.font = '10px JetBrains Mono, monospace';
    ctx.textAlign = 'left';

    for (let i = 0; i <= numPriceSteps; i++) {
      const p = minPrice + i * priceStep;
      const y = priceToY(p);

      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartWidth, y);
      ctx.stroke();

      // Price label on right axis
      ctx.fillStyle = '#64748b';
      ctx.fillText(formatPrice(p, instrument), chartWidth + 6, y + 3);
    }

    // 2. Draw ICT Sessions & Windows (Asia, London, NY AM 09:45-12:00)
    for (let i = startIndex; i <= endIndex; i++) {
      const c = candles[i];
      const relIdx = i - startIndex;
      const x = chartWidth - (endIndex - i) * step - candleWidth;

      const { hour, minute } = getNYTimeDetails(c.time);
      const mins = hour * 60 + minute;

      // NY AM Primary Window: 09:45 - 12:00 (585m to 720m)
      if (mins >= 585 && mins <= 720) {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.05)'; // subtle cyan glow
        ctx.fillRect(x - candleGap / 2, 0, step, chartHeight);
      } else if (mins >= 120 && mins <= 300) {
        // London: 02:00 to 05:00
        ctx.fillStyle = 'rgba(129, 140, 248, 0.03)';
        ctx.fillRect(x - candleGap / 2, 0, step, chartHeight);
      }
    }

    // 3. Draw Fair Value Gaps (FVG)
    for (const fvg of fvgs) {
      const topY = priceToY(fvg.top);
      const bottomY = priceToY(fvg.bottom);
      const height = Math.abs(bottomY - topY);
      const minY = Math.min(topY, bottomY);

      ctx.fillStyle = fvg.direction === 'bullish'
        ? (fvg.mitigated ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.20)')
        : (fvg.mitigated ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.20)');

      ctx.fillRect(0, minY, chartWidth, height);

      ctx.strokeStyle = fvg.direction === 'bullish' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)';
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(0, minY, chartWidth, height);
      ctx.setLineDash([]);

      ctx.fillStyle = fvg.direction === 'bullish' ? '#34d399' : '#f87171';
      ctx.font = '9px monospace';
      ctx.fillText(
        `${fvg.direction === 'bullish' ? 'Bullish' : 'Bearish'} FVG [${fvg.timeframe}]${fvg.mitigated ? ' (Mitigated)' : ''}`,
        12,
        minY + 12
      );
    }

    // 4. Draw Liquidity Levels
    for (const liq of liquidityLevels) {
      const y = priceToY(liq.price);
      if (y < 0 || y > chartHeight) continue;

      ctx.lineWidth = liq.status === 'SWEPT' ? 1.5 : 1;
      ctx.setLineDash(liq.status === 'SWEPT' ? [4, 4] : [2, 2]);

      if (liq.status === 'SWEPT' || liq.status === 'RECLAIMED') {
        ctx.strokeStyle = '#f59e0b'; // Amber for swept
      } else if (liq.type === 'BSL' || liq.type === 'PDH' || liq.type === 'LondonHigh' || liq.type === 'AsiaHigh') {
        ctx.strokeStyle = '#38bdf8'; // Blue for BSL
      } else {
        ctx.strokeStyle = '#fb7185'; // Rose for SSL
      }

      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartWidth, y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Label
      ctx.fillStyle = ctx.strokeStyle;
      ctx.font = 'bold 9px monospace';
      const labelText = `${liq.label}: ${formatPrice(liq.price, instrument)}${liq.status === 'RECLAIMED' ? ' [RECLAIMED]' : liq.status === 'SWEPT' ? ' [SWEPT]' : ''}`;
      ctx.fillText(labelText, chartWidth - ctx.measureText(labelText).width - 10, y - 4);
    }

    // 5. Draw Market Structure Shift (MSS)
    if (mss) {
      const y = priceToY(mss.brokenSwingPrice);
      if (y >= 0 && y <= chartHeight) {
        ctx.strokeStyle = '#a855f7'; // Purple
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 2]);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(chartWidth, y);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#c084fc';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(`MSS (${mss.direction.toUpperCase()}) @ ${formatPrice(mss.brokenSwingPrice, instrument)}`, 14, y - 6);
      }
    }

    // 6. Draw Candlesticks
    for (let i = startIndex; i <= endIndex; i++) {
      const c = candles[i];
      const x = chartWidth - (endIndex - i) * step - candleWidth;

      const isUp = c.close >= c.open;
      const bodyColor = isUp ? '#10b981' : '#ef4444'; // Clean emerald and crimson
      const wickColor = isUp ? '#34d399' : '#f87171';

      const openY = priceToY(c.open);
      const closeY = priceToY(c.close);
      const highY = priceToY(c.high);
      const lowY = priceToY(c.low);

      // Wick
      ctx.strokeStyle = wickColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + candleWidth / 2, highY);
      ctx.lineTo(x + candleWidth / 2, lowY);
      ctx.stroke();

      // Body
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.max(1, Math.abs(closeY - openY));

      ctx.fillStyle = bodyColor;
      ctx.fillRect(x, bodyTop, candleWidth, bodyHeight);

      // Current replay candle marker (last revealed candle)
      if (i === candles.length - 1) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x - 1, bodyTop - 1, candleWidth + 2, bodyHeight + 2);
      }
    }

    // 7. Draw Active Trade Plan Lines (Entry, SL, TP)
    if (activeTrade) {
      const entryY = priceToY(activeTrade.entryPrice);
      const slY = priceToY(activeTrade.stopLoss);
      const tpY = priceToY(activeTrade.takeProfit);

      // Entry Line (Cyan)
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, entryY);
      ctx.lineTo(chartWidth, entryY);
      ctx.stroke();

      // Stop Loss Line (Crimson)
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 3]);
      ctx.beginPath();
      ctx.moveTo(0, slY);
      ctx.lineTo(chartWidth, slY);
      ctx.stroke();

      // Take Profit Line (Emerald)
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, tpY);
      ctx.lineTo(chartWidth, tpY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Trade Badges on Right Axis
      const drawBadge = (y: number, text: string, bg: string) => {
        ctx.fillStyle = bg;
        ctx.fillRect(chartWidth, y - 9, priceAxisWidth, 18);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(text, chartWidth + priceAxisWidth / 2, y + 3);
      };

      drawBadge(entryY, `ENTRY ${formatPrice(activeTrade.entryPrice, instrument)}`, '#06b6d4');
      drawBadge(slY, `SL ${formatPrice(activeTrade.stopLoss, instrument)}`, '#dc2626');
      drawBadge(tpY, `TP ${formatPrice(activeTrade.takeProfit, instrument)}`, '#059669');
    }

    // 8. Draw Time Axis (Bottom)
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, chartHeight);
    ctx.lineTo(width, chartHeight);
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.textAlign = 'center';

    const timeStep = Math.max(1, Math.floor(visibleCount / 6));
    for (let i = startIndex; i <= endIndex; i += timeStep) {
      const c = candles[i];
      const x = chartWidth - (endIndex - i) * step - candleWidth / 2;
      const { nyTimeString } = getNYTimeDetails(c.time);
      ctx.fillText(nyTimeString, x, chartHeight + 16);
    }

    // 9. Crosshair & Dynamic Cursor
    if (hoverPos && hoverPos.x <= chartWidth && hoverPos.y <= chartHeight) {
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);

      // Vertical line
      ctx.beginPath();
      ctx.moveTo(hoverPos.x, 0);
      ctx.lineTo(hoverPos.x, chartHeight);
      ctx.stroke();

      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(0, hoverPos.y);
      ctx.lineTo(chartWidth, hoverPos.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Price Tag on cursor Y
      const cursorPrice = yToPrice(hoverPos.y);
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(chartWidth, hoverPos.y - 9, priceAxisWidth, 18);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(formatPrice(cursorPrice, instrument), chartWidth + priceAxisWidth / 2, hoverPos.y + 3);
    }
  }, [candles, instrument, candleWidth, candleGap, scrollOffset, liquidityLevels, fvgs, orderBlocks, mss, activeTrade, hoverPos]);

  // Handle ResizeObserver
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (canvasRef.current) {
          canvasRef.current.width = entry.contentRect.width;
          canvasRef.current.height = entry.contentRect.height;
          renderChart();
        }
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [renderChart]);

  // Redraw whenever props/state update
  useEffect(() => {
    renderChart();
  }, [renderChart]);

  // Mouse Handlers: Pan, Zoom, Crosshair & Trade line drag
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicking near active trade lines to drag them
    if (activeTrade && onUpdateTradePrice) {
      const priceToY = (price: number) => {
        const { min, max, height } = priceRangeRef.current;
        const usableHeight = height - 40;
        return 20 + usableHeight * (1 - (price - min) / (max - min));
      };

      const entryY = priceToY(activeTrade.entryPrice);
      const slY = priceToY(activeTrade.stopLoss);
      const tpY = priceToY(activeTrade.takeProfit);

      if (Math.abs(y - entryY) < 8) {
        setDraggingLine('entry');
        return;
      }
      if (Math.abs(y - slY) < 8) {
        setDraggingLine('sl');
        return;
      }
      if (Math.abs(y - tpY) < 8) {
        setDraggingLine('tp');
        return;
      }
    }

    setIsDragging(true);
    setDragStartX(e.clientX);
    setDragStartOffset(scrollOffset);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setHoverPos({ x, y });

    // Find hover candle
    const chartWidth = (canvasRef.current?.width || 800) - 72;
    const step = candleWidth + candleGap;
    const offsetFromRight = chartWidth - x;
    const totalCandles = candles.length;
    const candleIndex = totalCandles - 1 - Math.floor((offsetFromRight + scrollOffset) / step);

    if (candleIndex >= 0 && candleIndex < totalCandles) {
      setHoverCandle(candles[candleIndex]);
    } else {
      setHoverCandle(null);
    }

    // Dragging trade line
    if (draggingLine && onUpdateTradePrice) {
      const { min, max, height } = priceRangeRef.current;
      const usableHeight = height - 40;
      const ratio = 1 - (y - 20) / usableHeight;
      const newPrice = min + ratio * (max - min);
      onUpdateTradePrice(draggingLine, Number(newPrice.toFixed(instrument === 'US30' ? 0 : 2)));
      return;
    }

    // Dragging canvas pan
    if (isDragging) {
      const deltaX = e.clientX - dragStartX;
      const newOffset = Math.max(0, dragStartOffset + deltaX);
      setScrollOffset(newOffset);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDraggingLine(null);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      // Zoom in
      setCandleWidth((w) => Math.min(24, w + 1));
    } else {
      // Zoom out
      setCandleWidth((w) => Math.max(3, w - 1));
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-[#0b0f19] select-none overflow-hidden rounded-md border border-slate-800"
    >
      {/* Candle Header HUD */}
      <div className="absolute top-2 left-3 z-10 pointer-events-none flex flex-wrap items-center gap-2 text-xs font-mono bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded border border-slate-800/80 text-slate-300">
        <span className="font-bold text-sky-400">{instrument}</span>
        {hoverCandle ? (
          <>
            <span className="text-slate-500">|</span>
            <span>O: <strong className="text-white">{formatPrice(hoverCandle.open, instrument)}</strong></span>
            <span>H: <strong className="text-emerald-400">{formatPrice(hoverCandle.high, instrument)}</strong></span>
            <span>L: <strong className="text-rose-400">{formatPrice(hoverCandle.low, instrument)}</strong></span>
            <span>C: <strong className={hoverCandle.close >= hoverCandle.open ? 'text-emerald-400' : 'text-rose-400'}>{formatPrice(hoverCandle.close, instrument)}</strong></span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-400">{getNYTimeDetails(hoverCandle.time).nyTimeString} NY</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-sky-300 uppercase">
              {getSessionFromTimestamp(hoverCandle.time)}
            </span>
          </>
        ) : (
          <span className="text-slate-500">Move crosshair over candle to inspect</span>
        )}
      </div>

      {/* Main Interactive Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair block"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setHoverPos(null);
          setHoverCandle(null);
          setIsDragging(false);
          setDraggingLine(null);
        }}
        onWheel={handleWheel}
      />
    </div>
  );
};
