import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  PieChart,
  Pie,
  Cell,
  Sector
} from 'recharts';

// Custom tooltip for dark mode
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800 border border-slate-700 p-3 rounded-xl shadow-2xl text-xs backdrop-blur-md bg-opacity-90">
        <p className="font-bold text-slate-200 mb-1">{label || payload[0].name}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
              <span className="text-slate-300">
                {/* AQUÍ ESTÁ EL CAMBIO: 'es-CO' */}
                ${entry.value.toLocaleString('es-CO')}
              </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const BalanceAreaChart = ({ data }: { data: any[] }) => (
  <ResponsiveContainer width="100%" height={250}>
    <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
      <defs>
        <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
        </linearGradient>
      </defs>
      <XAxis 
        dataKey="name" 
        stroke="#64748b" 
        fontSize={10} 
        tickLine={false} 
        axisLine={false} 
        dy={10}
      />
      <YAxis 
        stroke="#64748b" 
        fontSize={10} 
        tickLine={false} 
        axisLine={false}
        // Cambio: Usamos Intl para formatear con puntos y agregamos 'k' si es muy grande
        tickFormatter={(value) => `$${new Intl.NumberFormat('es-CO').format(value)}`}
        // O si prefieres la versión corta (1k, 2k):
        // tickFormatter={(value) => `$${(value/1000).toLocaleString('es-CO')}k`}
      />
      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.4} />
      <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '4 4' }} />
      <Area 
        type="monotone" 
        dataKey="saldo" 
        stroke="#6366f1" 
        strokeWidth={3}
        fillOpacity={1} 
        fill="url(#colorBalance)" 
        activeDot={{ r: 6, strokeWidth: 0, fill: '#818cf8' }}
      />
    </AreaChart>
  </ResponsiveContainer>
);

export const ComparisonBarChart = ({ data }: { data: any[] }) => {
  // Función para formatear eje Y compacto (1k, 1.5M, etc)
  const formatYAxis = (value: number) => {
    return new Intl.NumberFormat('es-CO', { 
      notation: "compact", 
      compactDisplay: "short" 
    }).format(value);
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} barGap={8} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.4} />
        
        <XAxis 
          dataKey="name" 
          stroke="#64748b" 
          fontSize={10} 
          tickLine={false} 
          axisLine={false} 
          dy={10}
        />
        
        <YAxis 
          stroke="#64748b" 
          fontSize={10} 
          tickLine={false} 
          axisLine={false}
          tickFormatter={formatYAxis}
        />
        
        <Tooltip 
          content={<CustomTooltip />} 
          cursor={{fill: '#1e293b', opacity: 0.4}} 
        />
        
        <Legend 
          verticalAlign="top"
          align="right"
          iconType="circle" 
          wrapperStyle={{fontSize: '12px', paddingBottom: '20px'}}
          formatter={(value) => <span className="text-slate-300 font-medium ml-1">{value}</span>}
        />
        
        {/* Barras con esquinas redondeadas y colores modernos */}
        <Bar 
          dataKey="ingresoDiario" 
          fill="#10b981" // Emerald
          radius={[6, 6, 0, 0]} 
          name="Ingresos" 
          maxBarSize={50}
          animationDuration={1500}
        />
        <Bar 
          dataKey="gastoDiario" 
          fill="#ef4444" // Red
          radius={[6, 6, 0, 0]} 
          name="Gastos" 
          maxBarSize={50}
          animationDuration={1500}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

// Modern Palette
const COLORS = [
  '#6366f1', // Indigo
  '#ec4899', // Pink
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#ef4444', // Red
  '#06b6d4', // Cyan
  '#14b8a6', // Teal
  '#f43f5e'  // Rose
];

// --- NUEVO COMPONENTE DE ETIQUETA PERSONALIZADA PARA PIE ---
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
  const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);

  // Solo mostrar si el porcentaje es mayor a 5% para no saturar
  if (percent < 0.05) return null;

  return (
    <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="10" fontWeight="bold">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export const CategoryPieChart = ({ data }: { data: any[] }) => {
  if (!data || data.length === 0 || data.every(d => d.value === 0)) {
      return (
          <div className="h-full w-full flex flex-col items-center justify-center text-slate-500 text-xs">
              <div className="w-24 h-24 rounded-full border-4 border-slate-700 border-dashed mb-2 opacity-50"></div>
              Sin datos
          </div>
      );
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={85}
          paddingAngle={5}
          dataKey="value"
          cornerRadius={6}
          stroke="none"
          labelLine={false} 
          label={renderCustomizedLabel} // <--- AQUÍ AGREGAMOS EL PORCENTAJE
        >
          {/* ... (Tus colores COLORS se mantienen igual) ... */}
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#3b82f6'][index % 5]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend 
           layout="vertical" verticalAlign="middle" align="right" iconType="circle" iconSize={8}
           wrapperStyle={{ fontSize: '10px', color: '#94a3b8' }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};