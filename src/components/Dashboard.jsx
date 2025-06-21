import React, { useEffect, useRef, useState } from 'react';

const Dashboard = () => {
  // State for live dashboard data
  const [dashboardData, setDashboardData] = useState(null);
  const wsRef = useRef(null);

  useEffect(() => {
    // Connect to backend WebSocket for real-time updates
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//ap-sathish-backend.vercel.app/ws`;
    wsRef.current = new WebSocket(wsUrl);
    wsRef.current.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'dashboard_stats') {
          setDashboardData(msg.data);
        }
      } catch (e) {
        // Ignore parse errors
      }
    };
    wsRef.current.onerror = (err) => {
      console.error('WebSocket error:', err);
    };
    return () => {
      wsRef.current && wsRef.current.close();
    };
  }, []);

  // Enhanced KPI Card Component with larger, centered numbers
  const KPICard = ({ title, value, change, changeType, icon }) => {
    const getChangeColor = () => {
      if (!change) return '';
      return 'text-green-400';
    };

    return (
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 hover:border-slate-600 transition-all h-full flex flex-col items-center justify-center text-center">
        <div className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-2">{title}</div>
        <div className="text-4xl font-bold text-white my-2">{value}</div>
        {change && (
          <div className={`flex items-center text-sm mt-1 ${getChangeColor()}`}>
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
            </svg>
            {change}%
          </div>
        )}
        {icon && <div className="text-blue-400 opacity-60 mt-2">{icon}</div>}
      </div>
    );
  };

  // Compact Chart Card Component
  const ChartCard = ({ title, children, className = "" }) => (
    <div className={`bg-slate-800 rounded-lg p-2 border border-slate-700 h-full flex flex-col ${className}`}>
      <h3 className="text-white text-xs font-semibold mb-1 flex-shrink-0">{title}</h3>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );

  // Compact Bar Chart
  const CompactBarChart = ({ data, color }) => {
    const maxValue = Math.max(...data.map(d => d.value));
    
    return (
      <div className="h-full flex items-end justify-between space-x-1">
        {data.slice(0, 10).map((point, index) => (
          <div key={index} className="flex-1 flex flex-col items-center">
            <div 
              className="w-full rounded-t transition-all duration-300 hover:opacity-80"
              style={{
                height: `${(point.value / maxValue) * 60}px`,
                backgroundColor: color,
                minHeight: '4px',
                maxHeight: '60px'
              }}
              title={`${point.value}`}
            />
          </div>
        ))}
      </div>
    );
  };

  // Donut Chart Component
  const DonutChart = ({ data, centerText, centerValue }) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    let cumulativePercentage = 0;

    const createPath = (percentage, startAngle) => {
      const angle = (percentage / 100) * 360;
      const endAngle = startAngle + angle;
      const largeArcFlag = angle > 180 ? 1 : 0;
      
      const x1 = 50 + 40 * Math.cos((startAngle * Math.PI) / 180);
      const y1 = 50 + 40 * Math.sin((startAngle * Math.PI) / 180);
      const x2 = 50 + 40 * Math.cos((endAngle * Math.PI) / 180);
      const y2 = 50 + 40 * Math.sin((endAngle * Math.PI) / 180);

      return `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
    };

    return (
      <div className="relative">
        <svg viewBox="0 0 100 100" className="w-16 h-16 transform -rotate-90">
          {data.map((item, index) => {
            const percentage = (item.value / total) * 100;
            const path = createPath(percentage, cumulativePercentage * 3.6);
            const currentAngle = cumulativePercentage;
            cumulativePercentage += percentage;
            
            return (
              <path
                key={index}
                d={path}
                fill={item.color}
                className="hover:opacity-80 transition-opacity"
              />
            );
          })}
          <circle cx="50" cy="50" r="20" fill="#1e293b" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-white text-xs font-bold">{centerValue}</div>
          <div className="text-slate-400 text-xs">{centerText}</div>
        </div>
      </div>
    );
  };

  // Progress Ring Component
  const ProgressRing = ({ percentage, color, size = 50 }) => {
    const circumference = 2 * Math.PI * 15;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <div className="relative flex items-center justify-center h-full">
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size/2}
            cy={size/2}
            r="15"
            stroke="#374151"
            strokeWidth="3"
            fill="none"
          />
          <circle
            cx={size/2}
            cy={size/2}
            r="15"
            stroke={color}
            strokeWidth="3"
            fill="none"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white text-xs font-bold">{percentage}%</span>
        </div>
      </div>
    );
  };

  // Mini Activity Feed
  const MiniActivityFeed = () => {
    const activities = [
      { icon: '💳', text: 'Payment processed', amount: '$25K', time: '2m' },
      { icon: '📄', text: 'Invoice received', amount: '$18K', time: '5m' },
      { icon: '📝', text: 'PO created', amount: '$32K', time: '12m' },
      { icon: '✅', text: 'Match found', amount: '$15K', time: '18m' },
    ];

    return (
      <div className="space-y-1 h-full overflow-y-auto">
        {activities.map((activity, index) => (
          <div key={index} className="flex items-center text-xs py-1">
            <span className="mr-2 text-sm">{activity.icon}</span>
            <div className="flex-1 text-slate-300 truncate">{activity.text}</div>
            <div className="text-green-400 font-medium mr-1">{activity.amount}</div>
            <div className="text-slate-500 text-xs">{activity.time}</div>
          </div>
        ))}
      </div>
    );
  };

  // Mini Table Component
  const MiniTable = () => {
    const data = [
      { vendor: 'TechSolutions', value: '$1.2M', status: 'Active' },
      { vendor: 'MegaCorp', value: '$980K', status: 'Active' },
      { vendor: 'Industries', value: '$1.4M', status: 'Pending' },
      { vendor: 'Beta Services', value: '$720K', status: 'Active' },
    ];

    return (
      <div className="space-y-1 h-full overflow-y-auto">
        {data.map((item, index) => (
          <div key={index} className="flex justify-between items-center text-xs py-1">
            <div className="text-slate-300 font-medium truncate flex-1">{item.vendor}</div>
            <div className="text-green-400 ml-2">{item.value}</div>
          </div>
        ))}
      </div>
    );
  };


  // Icons (simplified)
  const DocumentIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6" />
    </svg>
  );

  return (
    <div className="h-screen bg-slate-900 text-white p-3 overflow-hidden flex flex-col">
      {/* Compact Header */}
      <header className="flex justify-between items-center mb-3 flex-shrink-0">
        <h1 className="text-xl font-bold">Reconciliation Dashboard</h1>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-green-400 text-sm">Live</span>
        </div>
      </header>

      {/* Main Grid Layout: Only KPI Cards */}
      <div className="flex-1 grid grid-cols-3 grid-rows-2 gap-4 min-h-0">
        <div className="col-span-1 row-span-1">
          <KPICard title="Total POs" value={dashboardData?.kpis?.total_pos ?? '--'} icon={<DocumentIcon />} />
        </div>
        <div className="col-span-1 row-span-1">
          <KPICard title="Total Invoices" value={dashboardData?.kpis?.total_invoices ?? '--'} icon={<DocumentIcon />} />
        </div>
        <div className="col-span-1 row-span-1">
          <KPICard title="Matched" value={dashboardData?.kpis?.matched_invoices ?? '--'} icon={<DocumentIcon />} />
        </div>
        <div className="col-span-1 row-span-1">
          <KPICard title="Unmatched" value={dashboardData?.kpis?.unmatched_invoices ?? '--'} icon={<DocumentIcon />} />
        </div>
        <div className="col-span-1 row-span-1">
          <KPICard title="PO Value" value={dashboardData?.kpis?.total_po_value ? `$${dashboardData.kpis.total_po_value.toLocaleString()}` : '--'} icon={<DocumentIcon />} />
        </div>
        <div className="col-span-1 row-span-1">
          <KPICard title="Invoice Value" value={dashboardData?.kpis?.total_invoice_value ? `$${dashboardData.kpis.total_invoice_value.toLocaleString()}` : '--'} icon={<DocumentIcon />} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;