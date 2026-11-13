import React from 'react';
import { CanvasElement, ElementType } from '../types/cabling';

interface PaletteThumbProps {
  type: ElementType;
}

export const PaletteSymbolThumb: React.FC<PaletteThumbProps> = ({ type }) => {
  switch (type) {
    case 'rack_mdf':
      return (
        <svg viewBox="0 0 40 40" className="w-8 h-8 shrink-0" aria-hidden="true">
          <rect
            x="6"
            y="6"
            width="28"
            height="28"
            rx="2"
            fill="#0F172A"
            stroke="#38BDF8"
            strokeWidth="1.75"
          />
          <line x1="6" y1="6" x2="34" y2="34" stroke="#38BDF8" strokeWidth="1" strokeOpacity="0.45" />
          <line x1="34" y1="6" x2="6" y2="34" stroke="#38BDF8" strokeWidth="1" strokeOpacity="0.45" />
          <rect x="11" y="13" width="18" height="4" rx="1" fill="#38BDF8" fillOpacity="0.85" />
          <rect x="11" y="20" width="18" height="4" rx="1" fill="#94A3B8" fillOpacity="0.7" />
          <rect x="11" y="27" width="10" height="2.5" rx="0.5" fill="#10B981" />
        </svg>
      );

    case 'rack_idf':
      return (
        <svg viewBox="0 0 40 40" className="w-8 h-8 shrink-0" aria-hidden="true">
          <rect
            x="8"
            y="8"
            width="24"
            height="24"
            rx="2"
            fill="#0F172A"
            stroke="#22D3EE"
            strokeWidth="1.75"
          />
          <rect x="12" y="14" width="16" height="4" rx="1" fill="#22D3EE" fillOpacity="0.85" />
          <rect x="12" y="21" width="16" height="4" rx="1" fill="#94A3B8" fillOpacity="0.7" />
          <line x1="8" y1="29" x2="32" y2="29" stroke="#22D3EE" strokeWidth="1" strokeDasharray="2 2" />
        </svg>
      );

    case 'workstation':
      return (
        <svg viewBox="0 0 40 40" className="w-8 h-8 shrink-0" aria-hidden="true">
          <rect
            x="6"
            y="8"
            width="28"
            height="19"
            rx="2"
            fill="#1E293B"
            stroke="#38BDF8"
            strokeWidth="1.6"
          />
          <rect x="10" y="11" width="20" height="11" rx="1" fill="#0EA5E9" fillOpacity="0.22" />
          <path d="M16 27 L24 27 L26 32 L14 32 Z" fill="#94A3B8" />
          <line x1="11" y1="32" x2="29" y2="32" stroke="#CBD5E1" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      );

    case 'outlet':
      return (
        <svg viewBox="0 0 40 40" className="w-8 h-8 shrink-0" aria-hidden="true">
          <rect
            x="9"
            y="9"
            width="22"
            height="22"
            rx="2"
            fill="#0F172A"
            stroke="#10B981"
            strokeWidth="1.75"
          />
          <polygon points="20,13 28,26 12,26" fill="none" stroke="#10B981" strokeWidth="1.6" />
          <circle cx="17" cy="23" r="1.3" fill="#10B981" />
          <circle cx="23" cy="23" r="1.3" fill="#10B981" />
        </svg>
      );

    case 'consolidation_point':
      return (
        <svg viewBox="0 0 40 40" className="w-8 h-8 shrink-0" aria-hidden="true">
          <polygon
            points="14,7 26,7 33,14 33,26 26,33 14,33 7,26 7,14"
            fill="#0F172A"
            stroke="#F59E0B"
            strokeWidth="1.75"
          />
          <line x1="13" y1="17" x2="27" y2="17" stroke="#F59E0B" strokeWidth="1.4" />
          <line x1="13" y1="23" x2="27" y2="23" stroke="#F59E0B" strokeWidth="1.4" />
          <circle cx="20" cy="20" r="2" fill="#F59E0B" />
        </svg>
      );

    case 'tray':
      return (
        <svg viewBox="0 0 40 40" className="w-8 h-8 shrink-0" aria-hidden="true">
          <rect
            x="4"
            y="14"
            width="32"
            height="12"
            rx="1"
            fill="#1E293B"
            stroke="#94A3B8"
            strokeWidth="1.5"
          />
          <line x1="10" y1="14" x2="10" y2="26" stroke="#94A3B8" strokeWidth="1.2" />
          <line x1="17" y1="14" x2="17" y2="26" stroke="#94A3B8" strokeWidth="1.2" />
          <line x1="23" y1="14" x2="23" y2="26" stroke="#94A3B8" strokeWidth="1.2" />
          <line x1="30" y1="14" x2="30" y2="26" stroke="#94A3B8" strokeWidth="1.2" />
        </svg>
      );

    case 'wall':
      return (
        <svg viewBox="0 0 40 40" className="w-8 h-8 shrink-0" aria-hidden="true">
          <rect x="4" y="16" width="32" height="8" fill="#475569" stroke="#CBD5E1" strokeWidth="1.2" />
          <line x1="8" y1="16" x2="14" y2="24" stroke="#94A3B8" strokeWidth="1" />
          <line x1="16" y1="16" x2="22" y2="24" stroke="#94A3B8" strokeWidth="1" />
          <line x1="24" y1="16" x2="30" y2="24" stroke="#94A3B8" strokeWidth="1" />
        </svg>
      );
  }
};

interface CanvasSymbolProps {
  element: CanvasElement;
  isSelected: boolean;
  isCableSource: boolean;
}

export const CanvasElementSymbol: React.FC<CanvasSymbolProps> = ({
  element,
  isSelected,
  isCableSource,
}) => {
  const { type, width, height, code, name } = element;
  const hw = width / 2;
  const hh = height / 2;

  const strokeAccent = isCableSource
    ? '#059669'
    : isSelected
    ? '#0284C7'
    : undefined;

  const renderShape = () => {
    switch (type) {
      case 'rack_mdf':
        return (
          <g>
            {/* Outer cabinet frame */}
            <rect
              x={-hw}
              y={-hh}
              width={width}
              height={height}
              rx={3}
              fill="#0F172A"
              stroke={strokeAccent ?? '#0369A1'}
              strokeWidth={isSelected ? 2.5 : 2}
            />
            {/* Architectural cross diagonals (ANSI/TIA telecom room cabinet) */}
            <line
              x1={-hw + 3}
              y1={-hh + 3}
              x2={hw - 3}
              y2={hh - 3}
              stroke="#38BDF8"
              strokeWidth={0.9}
              strokeOpacity={0.35}
            />
            <line
              x1={hw - 3}
              y1={-hh + 3}
              x2={-hw + 3}
              y2={hh - 3}
              stroke="#38BDF8"
              strokeWidth={0.9}
              strokeOpacity={0.35}
            />
            {/* Front door swing arc (CAD top-down convention) */}
            <path
              d={`M ${-hw + 6} ${hh} A ${width - 12} ${width - 12} 0 0 1 ${hw - 6} ${hh + 12}`}
              fill="none"
              stroke="#0284C7"
              strokeWidth={1}
              strokeDasharray="3 2"
              strokeOpacity={0.65}
            />
            {/* Internal patch panel & switch bars */}
            <rect x={-hw + 10} y={-14} width={width - 20} height={8} rx={1} fill="#38BDF8" fillOpacity={0.9} />
            <rect x={-hw + 10} y={-2} width={width - 20} height={8} rx={1} fill="#64748B" />
            <rect x={-hw + 10} y={10} width={width - 20} height={6} rx={1} fill="#1E293B" stroke="#475569" strokeWidth={0.8} />
            <text
              x={0}
              y={-hh + 11}
              textAnchor="middle"
              fill="#E0F2FE"
              fontSize="8.5"
              fontWeight="700"
              fontFamily="JetBrains Mono, monospace"
            >
              MDF {element.rackUnits ?? 42}U
            </text>
          </g>
        );

      case 'rack_idf':
        return (
          <g>
            <rect
              x={-hw}
              y={-hh}
              width={width}
              height={height}
              rx={3}
              fill="#1E293B"
              stroke={strokeAccent ?? '#0891B2'}
              strokeWidth={isSelected ? 2.5 : 2}
            />
            <rect x={-hw + 8} y={-10} width={width - 16} height={7} rx={1} fill="#22D3EE" fillOpacity={0.85} />
            <rect x={-hw + 8} y={2} width={width - 16} height={7} rx={1} fill="#64748B" />
            <text
              x={0}
              y={-hh + 10}
              textAnchor="middle"
              fill="#ECFEFF"
              fontSize="8"
              fontWeight="700"
              fontFamily="JetBrains Mono, monospace"
            >
              IDF {element.rackUnits ?? 24}U
            </text>
          </g>
        );

      case 'workstation':
        return (
          <g>
            {/* Architectural desk outline */}
            <rect
              x={-hw}
              y={-hh}
              width={width}
              height={height}
              rx={3}
              fill="#FFFFFF"
              stroke={strokeAccent ?? '#334155'}
              strokeWidth={isSelected ? 2.2 : 1.5}
            />
            {/* Desk subtle inner surface */}
            <rect
              x={-hw + 3}
              y={-hh + 3}
              width={width - 6}
              height={height - 6}
              rx={1.5}
              fill="#F8FAFC"
              stroke="#CBD5E1"
              strokeWidth={0.8}
            />
            {/* Monitor top-down schematic */}
            <rect
              x={-16}
              y={-hh + 6}
              width={32}
              height={9}
              rx={1.5}
              fill="#0F172A"
              stroke="#0284C7"
              strokeWidth={1.1}
            />
            {/* Keyboard schematic */}
            <rect x={-13} y={-1} width={26} height={7} rx={1} fill="#E2E8F0" stroke="#94A3B8" strokeWidth={0.8} />
            {/* Mouse */}
            <rect x={16} y={0} width={5} height={7} rx={2} fill="#CBD5E1" stroke="#64748B" strokeWidth={0.7} />
            {/* RJ45 Drop indicator */}
            <circle cx={0} cy={-hh} r={3} fill="#0284C7" stroke="#FFFFFF" strokeWidth={1} />
          </g>
        );

      case 'outlet':
        return (
          <g>
            <rect
              x={-hw}
              y={-hh}
              width={width}
              height={height}
              rx={3}
              fill="#FFFFFF"
              stroke={strokeAccent ?? '#059669'}
              strokeWidth={isSelected ? 2.2 : 1.75}
            />
            {/* Standard TIA Telecommunications Outlet Triangle */}
            <polygon
              points={`0,${-hh + 6} ${hw - 6},${hh - 6} ${-hw + 6},${hh - 6}`}
              fill="#ECFDF5"
              stroke="#059669"
              strokeWidth={1.5}
            />
            <circle cx={-4} cy={hh - 10} r={1.6} fill="#047857" />
            <circle cx={4} cy={hh - 10} r={1.6} fill="#047857" />
          </g>
        );

      case 'consolidation_point':
        return (
          <g>
            <polygon
              points={`${-hw + 9},${-hh} ${hw - 9},${-hh} ${hw},${-hh + 9} ${hw},${hh - 9} ${hw - 9},${hh} ${-hw + 9},${hh} ${-hw},${hh - 9} ${-hw},${-hh + 9}`}
              fill="#FFFBEB"
              stroke={strokeAccent ?? '#D97706'}
              strokeWidth={isSelected ? 2.2 : 1.75}
            />
            <line x1={-hw + 8} y1={-4} x2={hw - 8} y2={-4} stroke="#D97706" strokeWidth={1.2} />
            <line x1={-hw + 8} y1={4} x2={hw - 8} y2={4} stroke="#D97706" strokeWidth={1.2} />
            <circle cx={0} cy={0} r={3} fill="#B45309" />
          </g>
        );

      case 'tray': {
        const rungStep = 20;
        const rungs: number[] = [];
        for (let rx = -hw + rungStep; rx < hw; rx += rungStep) {
          rungs.push(rx);
        }
        return (
          <g>
            <rect
              x={-hw}
              y={-hh}
              width={width}
              height={height}
              rx={1}
              fill="#E2E8F0"
              fillOpacity={0.75}
              stroke={strokeAccent ?? '#64748B'}
              strokeWidth={isSelected ? 2 : 1.25}
            />
            {/* Cable ladder rungs */}
            {rungs.map((rx) => (
              <line
                key={rx}
                x1={rx}
                y1={-hh + 1}
                x2={rx}
                y2={hh - 1}
                stroke="#94A3B8"
                strokeWidth={1}
              />
            ))}
            {/* Center dashed cable guide */}
            <line
              x1={-hw + 4}
              y1={0}
              x2={hw - 4}
              y2={0}
              stroke="#475569"
              strokeWidth={0.9}
              strokeDasharray="6 4"
            />
          </g>
        );
      }

      case 'wall':
        return (
          <g>
            <rect
              x={-hw}
              y={-hh}
              width={width}
              height={height}
              fill="#334155"
              stroke={strokeAccent ?? '#0F172A'}
              strokeWidth={isSelected ? 2 : 1}
            />
            <line
              x1={-hw}
              y1={0}
              x2={hw}
              y2={0}
              stroke="#64748B"
              strokeWidth={0.75}
              strokeDasharray="12 6"
            />
          </g>
        );
    }
  };

  const showLabels = type !== 'wall';

  return (
    <g>
      {renderShape()}
      {showLabels && (
        <g transform={`translate(0, ${hh + 13})`}>
          {/* Crisp CAD tag background */}
          <rect
            x={-44}
            y={-9}
            width={88}
            height={14}
            rx={2}
            fill="#FFFFFF"
            fillOpacity={0.92}
            stroke={isSelected ? '#0284C7' : '#CBD5E1'}
            strokeWidth={0.8}
          />
          <text
            x={0}
            y={1}
            textAnchor="middle"
            fill="#0F172A"
            fontSize="8.5"
            fontWeight="600"
            fontFamily="JetBrains Mono, monospace"
          >
            {code}
          </text>
          {name !== code && (
            <text
              x={0}
              y={14}
              textAnchor="middle"
              fill="#334155"
              fontSize="8"
              fontWeight="500"
              fontFamily="DM Sans, sans-serif"
            >
              {name.length > 22 ? `${name.slice(0, 21)}…` : name}
            </text>
          )}
        </g>
      )}
    </g>
  );
};
