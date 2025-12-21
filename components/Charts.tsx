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

export const ComparisonBarChart = ({ data }: { data: any[] }) => (
  <ResponsiveContainer width="100%" height={200}>
    <BarChart data={data} barGap={4}>
      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.4} />
      <XAxis dataKey="name" hide />
      <Tooltip content={<CustomTooltip />} cursor={{fill: '#1e293b', opacity: 0.4}} />
      <Legend iconType="circle" wrapperStyle={{fontSize: '12px', paddingTop: '10px'}}/>
      <Bar dataKey="ingresos" fill="#10b981" radius={[4, 4, 0, 0]} name="Ingresos" />
      <Bar dataKey="egresos" fill="#ef4444" radius={[4, 4, 0, 0]} name="Egresos" />
    </BarChart>
  </ResponsiveContainer>
);

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

export const CategoryPieChart = ({ data }: { data: any[] }) => {
    // Render empty state if no data
    if (!data || data.length === 0 || data.every(d => d.value === 0)) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center text-slate-500 text-xs">
                <div className="w-24 h-24 rounded-full border-4 border-slate-700 border-dashed mb-2 opacity-50"></div>
                Sin datos para mostrar
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
            innerRadius={60} // Donut style
            outerRadius={85}
            paddingAngle={5} // Spacing between segments
            dataKey="value"
            cornerRadius={6} // Rounded edges
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            layout="vertical" 
            verticalAlign="middle" 
            align="right"
            iconType="circle"
            iconSize={8}
            wrapperStyle={{
                fontSize: '11px', 
                color: '#94a3b8',
                paddingLeft: '10px'
            }}
            formatter={(value) => <span className="text-slate-300 ml-1">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    );
};