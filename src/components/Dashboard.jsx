import React, { useState, useEffect } from 'react';
import { BarChart } from '@mui/x-charts/BarChart';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { Sun, Moon, Menu } from 'lucide-react';
import Chat from './Chat';
import HumanReview from './HumanReview';
import { useWebSocket } from './WebSocketProvider'; // Import the hook

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
// const API_BASE_URL = "http://localhost:8000";

const Dashboard = () => {
  const { lastMessage } = useWebSocket(); // Use the shared WebSocket context
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // Active tab state
  const [activeTab, setActiveTab] = useState('invoice-dashboard');
  
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check for saved theme preference or use system preference
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme) return savedTheme === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

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
          fetch(`${API_BASE_URL}/api/dashboard/stats`),
          fetch(`${API_BASE_URL}/api/invoices`),
          fetch(`${API_BASE_URL}/api/purchase-orders`),
          fetch(`${API_BASE_URL}/api/charts/vendor-stats`)
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
  
  // Toggle between dark and light mode
  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
    
    if (newTheme) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Set initial theme on component mount
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Listen for messages from the shared WebSocket
  useEffect(() => {
    if (lastMessage) {
      try {
        const msg = JSON.parse(lastMessage.data);
        
        // Handle incoming messages for the dashboard
        if (msg.type === 'dashboard_update' && msg.data && msg.data.kpis) {
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
    }
  }, [lastMessage]);

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
      mode: isDarkMode ? 'dark' : 'light',
      primary: {
        main: '#b800ff',
      },
      error: {
        main: '#00d5ff',
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
        <div
          className={`fixed inset-y-0 left-0 z-30 w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border h-full transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:flex-shrink-0 ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="p-4">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-xl font-bold">Reconciliation Dashboard</h1>
              <button
                onClick={toggleTheme}
                className="p-2 rounded-full hover:bg-accent transition-colors duration-200"
                aria-label="Toggle theme"
              >
                {isDarkMode ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>
            </div>
            <nav className="space-y-1">
              {[
                { id: 'invoice-dashboard', label: 'Invoice Dashboard' },
                { id: 'purchase_orders', label: 'Purchase Orders' },
                { id: 'chat', label: 'Chat' },
                { id: 'human-review', label: 'Human Review' }
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

        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-20 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          ></div>
        )}
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card sticky top-0 z-10">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 rounded-full hover:bg-accent"
              aria-label="Open sidebar"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-bold">Reconciliation Dashboard</h1>
          </header>

          <main className="flex-1 overflow-auto p-6">
            {/* Top Statistics */}
            {activeTab === 'invoice-dashboard' && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-card text-card-foreground pl-6 pt-3 rounded-lg shadow-md">
                <h3 className="text-muted-foreground text-base font-medium">Total POs</h3>
                <p className="text-3xl md:text-4xl p-3 pl-0 pt-2 font-bold">{data.stats.totalPOs}</p>
              </div>
              <div className="bg-card text-card-foreground pl-6 pt-3 rounded-lg shadow-md">
                <h3 className="text-muted-foreground text-base font-medium">Total Invoices</h3>
                <p className="text-3xl md:text-4xl p-3 pl-0 pt-2 font-bold">{data.stats.totalInvoices}</p>
              </div>
              <div className="bg-card text-card-foreground pl-6 pt-3 rounded-lg shadow-md">
                <h3 className="text-muted-foreground text-base font-medium">Matched</h3>
                <p className="text-3xl md:text-4xl p-3 pl-0 pt-2 font-bold">{data.stats.matched}</p>
              </div>
              <div className="bg-card text-card-foreground pl-6 pt-3 rounded-lg shadow-md">
                <h3 className="text-muted-foreground text-base font-medium">Unmatched</h3>
                <p className="text-3xl md:text-4xl p-3 pl-0 pt-2 font-bold">{data.stats.unmatched}</p>
              </div>
              <div className="bg-card text-card-foreground pl-6 pt-3 rounded-lg shadow-md">
                <h3 className="text-muted-foreground text-base font-medium">PO Total</h3>
                <p className="text-3xl md:text-4xl p-3 pl-0 pt-2 font-bold">{formatCurrency(data.stats.poTotal)}</p>
              </div>
              <div className="bg-card text-card-foreground pl-6 pt-3 rounded-lg shadow-md">
                <h3 className="text-muted-foreground text-base font-medium">Invoice Total</h3>
                <p className="text-3xl md:text-4xl p-3 pl-0 pt-2 font-bold">{formatCurrency(data.stats.invoiceTotal)}</p>
              </div>
            </div>
            )}
            
            {/* Tab Content */}
            <div className="bg-card text-card-foreground rounded-lg shadow-sm p-4">
              {activeTab === 'invoice-dashboard' && (
                <>
                  <h2 className="text-xl font-bold mb-4">Invoices</h2>
                  <div className="overflow-auto max-h-[400px]">
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
                        {data.invoices.map((invoice, index) => (
                          <tr key={invoice.id || index} className="border-b border-border hover:bg-muted">
                            <td className="p-2 text-foreground">{invoice.raw_fields.invoice_number || 'N/A'}</td>
                            <td className="p-2 text-foreground">{invoice.raw_fields.po_number || 'N/A'}</td>
                            <td className="p-2 text-foreground">{invoice.raw_fields.vendor_name || 'N/A'}</td>
                            <td className="p-2">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                invoice.match_status === 'matched_cumulative' || invoice.match_status === 'matched'
                                  ? 'bg-accent/20 text-accent' 
                                  : 'bg-primary/20 text-primary'
                              }`}>
                                {invoice.match_status ? (invoice.match_status === 'matched' || invoice.match_status === 'matched_cumulative' ? 'Matched' : 'Unmatched') : 'N/A'}
                              </span>
                            </td>
                            <td className="p-2 text-right text-foreground">{formatCurrency(invoice.raw_fields.amount_due)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <h2 className="text-xl font-bold my-4">Invoice Count by Vendor</h2>
                  <div style={{ width: '100%', height: 384 }}>
                    {chartDataset.length > 0 ? (
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
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-muted-foreground">No data available for chart.</p>
                      </div>
                    )}
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
                        {data.purchaseOrders.map((po, index) => (
                          <tr key={po.id || index} className="border-b border-border hover:bg-muted">
                            <td className="p-2 text-foreground">{po.raw_fields.po_number || 'N/A'}</td>
                            <td className="p-2 text-foreground">{po.po_date || 'N/A'}</td>
                            <td className="p-2 text-foreground">{po.raw_fields.vendor_name || 'N/A'}</td>
                            <td className="p-2">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                String(po.status).toLowerCase() === 'open' 
                                  ? 'bg-primary/20 text-primary' 
                                  : 'bg-accent/20 text-accent'
                              }`}>
                                {String(po.status).charAt(0).toUpperCase() + String(po.status).slice(1) || 'N/A'}
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
              
              {activeTab === 'chat' && (
                <div style={{ height: '90vh' }}>
                  <Chat />
                </div>
              )}

              {activeTab === 'human-review' && (
                <HumanReview />
              )}
            </div>
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
};

export default Dashboard;