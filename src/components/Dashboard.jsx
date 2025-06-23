import React, { useState, useEffect, useRef } from 'react';
import { BarChart } from '@mui/x-charts/BarChart';
import { ThemeProvider, createTheme } from '@mui/material/styles';

const API_BASE_URL = 'https://ap-sathish-backend.onrender.com/api';

const Dashboard = () => {
  const wsRef = useRef(null);
  // Active tab state
  const [activeTab, setActiveTab] = useState('invoices');
  
  // Data state
  const [data, setData] = useState({
    invoices: [],
    purchaseOrders: [],
    stats: {
      totalPOs: 0,
      totalInvoices: 0,
      matched: 0,
      unmatched: 0,
      poTotal: 0,
      invoiceTotal: 0
    },
    vendorStats: []
  });

  const [loading, setLoading] = useState(true);
  
  // Data fetching
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [statsRes, invoicesRes, poRes, vendorStatsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/dashboard/stats`),
          fetch(`${API_BASE_URL}/invoices`),
          fetch(`${API_BASE_URL}/purchase-orders`),
          fetch(`${API_BASE_URL}/charts/vendor-stats`)
        ]);

        const statsData = await statsRes.json();
        const invoicesData = await invoicesRes.json();
        const poData = await poRes.json();
        const vendorStatsData = await vendorStatsRes.json();
        
        setData({
          invoices: invoicesData,
          purchaseOrders: poData,
          stats: {
            totalPOs: statsData.kpis.total_pos,
            totalInvoices: statsData.kpis.total_invoices,
            matched: statsData.kpis.matched_invoices,
            unmatched: statsData.kpis.unmatched_invoices,
            poTotal: statsData.kpis.total_po_value,
            invoiceTotal: statsData.kpis.total_invoice_value
          },
          vendorStats: vendorStatsData
        });

      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
        // Handle error state if needed
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // WebSocket connection for live updates
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//ap-sathish-backend.onrender.com/ws`;
    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onopen = () => console.log('WebSocket Connected');
    
    wsRef.current.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'dashboard_stats' && msg.data && msg.data.kpis) {
          const kpis = msg.data.kpis;
          setData(prevData => ({
            ...prevData,
            stats: {
              totalPOs: kpis.total_pos,
              totalInvoices: kpis.total_invoices,
              matched: kpis.matched_invoices,
              unmatched: kpis.unmatched_invoices,
              poTotal: kpis.total_po_value,
              invoiceTotal: kpis.total_invoice_value
            }
          }));
        }
      } catch (e) {
        console.error("Error parsing WebSocket message:", e);
      }
    };

    wsRef.current.onerror = (error) => console.error('WebSocket Error:', error);
    wsRef.current.onclose = () => console.log('WebSocket Disconnected');

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };
  
  // Prepare dataset for MUI BarChart
  const chartDataset = data.vendorStats.map(item => ({
    vendor: item.vendor,
    matched: item.matched,
    unmatched: item.unmatched,
  }));
  
  const muiTheme = createTheme({
    palette: {
      mode: 'dark',
      primary: {
        main: '#b800ff',
      },
      error: {
        main: '#00d5ff',
      },
      text: {
        primary: 'rgba(255, 255, 255, 0.7)',
        secondary: 'rgba(255, 255, 255, 0.5)',
      },
    },
    typography: {
      fontFamily: 'var(--font-sans), serif',
    },
  });

  if (loading) {
    return (
      <div className="flex h-screen bg-background text-foreground items-center justify-center">
        <p>Loading Dashboard...</p>
      </div>
    );
  }

  return (
    <ThemeProvider theme={muiTheme}>
      <div className="flex h-screen bg-background text-foreground font-sans">
        {/* Sidebar */}
        <div className="w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border h-full flex-shrink-0">
          <div className="p-4">
            <h1 className="text-xl font-bold mb-6">Reconciliation Dashboard</h1>
            <nav className="space-y-1">
              {[
                { id: 'invoices', label: 'Invoices' },
                { id: 'purchase_orders', label: 'Purchase Orders' },
                { id: 'graphs', label: 'Graphs' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg flex items-center transition-colors ${
                    activeTab === tab.id
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  }`}
                >
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-6">
            {/* Top Statistics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-card text-card-foreground pl-6 pt-3 rounded-lg shadow-md">
                <h3 className="text-muted-foreground text-base font-medium">Total POs</h3>
                <p className="text-4xl p-3 pl-0 pt-2 font-bold">{data.stats.totalPOs}</p>
              </div>
              <div className="bg-card text-card-foreground pl-6 pt-3 rounded-lg shadow-md">
                <h3 className="text-muted-foreground text-base font-medium">Total Invoices</h3>
                <p className="text-4xl p-3 pl-0 pt-2 font-bold">{data.stats.totalInvoices}</p>
              </div>
              <div className="bg-card text-card-foreground pl-6 pt-3 rounded-lg shadow-md">
                <h3 className="text-muted-foreground text-base font-medium">Matched</h3>
                <p className="text-4xl p-3 pl-0 pt-2 font-bold">{data.stats.matched}</p>
              </div>
              <div className="bg-card text-card-foreground pl-6 pt-3 rounded-lg shadow-md">
                <h3 className="text-muted-foreground text-base font-medium">Unmatched</h3>
                <p className="text-4xl p-3 pl-0 pt-2 font-bold">{data.stats.unmatched}</p>
              </div>
              <div className="bg-card text-card-foreground pl-6 pt-3 rounded-lg shadow-md">
                <h3 className="text-muted-foreground text-base font-medium">PO Total</h3>
                <p className="text-4xl p-3 pl-0 pt-2 font-bold">{formatCurrency(data.stats.poTotal)}</p>
              </div>
              <div className="bg-card text-card-foreground pl-6 pt-3 rounded-lg shadow-md">
                <h3 className="text-muted-foreground text-base font-medium">Invoice Total</h3>
                <p className="text-4xl p-3 pl-0 pt-2 font-bold">{formatCurrency(data.stats.invoiceTotal)}</p>
              </div>
            </div>
            
            {/* Tab Content */}
            <div className="bg-card text-card-foreground rounded-lg shadow-sm p-4">
              {activeTab === 'invoices' && (
                <>
                  <h2 className="text-xl font-bold mb-4">Invoices</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left p-2">Invoice No.</th>
                          <th className="text-left p-2">PO No.</th>
                          <th className="text-left p-2">Vendor</th>
                          <th className="text-left p-2">Match Status</th>
                          <th className="text-right p-2">Total Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.invoices.map((invoice) => (
                          <tr key={invoice.id} className="border-b border-border hover:bg-muted">
                            <td className="p-2 text-foreground">{invoice.raw_fields.invoice_number || 'N/A'}</td>
                            <td className="p-2 text-foreground">{invoice.raw_fields.po_number || 'N/A'}</td>
                            <td className="p-2 text-foreground">{invoice.raw_fields.vendor_name || 'N/A'}</td>
                            <td className="p-2">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                invoice.match_status === 'matched_cumulative' || invoice.match_status === 'matched'
                                  ? 'bg-primary/20 text-primary' 
                                  : 'bg-destructive/20 text-destructive'
                              }`}>
                                {invoice.match_status ? (invoice.match_status.includes('matched') ? 'Matched' : 'Unmatched') : 'N/A'}
                              </span>
                            </td>
                            <td className="p-2 text-right text-foreground">{formatCurrency(invoice.raw_fields.amount_due)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              
              {activeTab === 'purchase_orders' && (
                <>
                  <h2 className="text-xl font-bold mb-4">Purchase Orders</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left p-2">PO No.</th>
                          <th className="text-left p-2">Date</th>
                          <th className="text-left p-2">Vendor</th>
                          <th className="text-left p-2">Status</th>
                          <th className="text-right p-2">Total Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.purchaseOrders.map((po) => (
                          <tr key={po.id} className="border-b border-border hover:bg-muted">
                            <td className="p-2 text-foreground">{po.raw_fields.po_number || 'N/A'}</td>
                            <td className="p-2 text-foreground">{po.po_date || 'N/A'}</td>
                            <td className="p-2 text-foreground">{po.raw_fields.vendor_name || 'N/A'}</td>
                            <td className="p-2">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                po.status === 'Open' 
                                  ? 'bg-primary/20 text-primary' 
                                  : 'bg-destructive/20 text-destructive'
                              }`}>
                                {po.status || 'N/A'}
                              </span>
                            </td>
                            <td className="p-2 text-right text-foreground">{formatCurrency(po.total_amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              
              {activeTab === 'graphs' && (
                <>
                  <h2 className="text-xl font-bold mb-4">Invoice Count by Vendor</h2>
                  <div style={{ width: '100%', height: 384 }}>
                    <BarChart
                      dataset={chartDataset}
                      xAxis={[{ scaleType: 'band', dataKey: 'vendor' }]}
                      series={[
                        { dataKey: 'matched', label: 'Matched', color: muiTheme.palette.primary.main },
                        { dataKey: 'unmatched', label: 'Unmatched', color: muiTheme.palette.error.main },
                      ]}
                      grid={{ horizontal: true }}
                      margin={{ top: 50, right: 30, left: 40, bottom: 30 }}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
};

export default Dashboard;