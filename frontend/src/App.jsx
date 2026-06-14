import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import ProductList from './components/ProductList';
import CustomerList from './components/CustomerList';
import OrderList from './components/OrderList';
import './App.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [toast, setToast] = useState(null);

  // Global Toast function
  const triggerToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  // Auto-clear Toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Render Active Component
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard triggerToast={triggerToast} />;
      case 'products':
        return <ProductList triggerToast={triggerToast} />;
      case 'customers':
        return <CustomerList triggerToast={triggerToast} />;
      case 'orders':
        return <OrderList triggerToast={triggerToast} />;
      default:
        return <Dashboard triggerToast={triggerToast} />;
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="brand-logo">
          <span>📦</span> StellarInventory
        </div>
        
        <nav style={{ flexGrow: 1 }}>
          <ul className="nav-links">
            <li className="nav-item">
              <button 
                className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => setActiveTab('dashboard')}
              >
                📊 Dashboard
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-btn ${activeTab === 'products' ? 'active' : ''}`}
                onClick={() => setActiveTab('products')}
              >
                📦 Products Catalog
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-btn ${activeTab === 'customers' ? 'active' : ''}`}
                onClick={() => setActiveTab('customers')}
              >
                👥 Customers List
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-btn ${activeTab === 'orders' ? 'active' : ''}`}
                onClick={() => setActiveTab('orders')}
              >
                💼 Orders Ledger
              </button>
            </li>
          </ul>
        </nav>

        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', borderTop: '1px solid var(--glass-border)', paddingTop: '1rem' }}>
          Stellar Inventory v1.0.0
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {renderContent()}
      </main>

      {/* Toast Notification Container */}
      {toast && (
        <div className={`toast ${toast.type}`}>
          <span>{toast.type === 'success' ? '✅' : '❌'}</span>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
