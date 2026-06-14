import React, { useEffect, useState } from 'react';
import { API_BASE } from '../config';

export default function Dashboard({ triggerToast }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/dashboard/stats`);
      if (!res.ok) {
        throw new Error('Failed to load dashboard metrics');
      }
      const data = await res.json();
      setStats(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err.message);
      triggerToast('Error loading stats', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="spinner-container">
        <div className="spinner"></div>
        <p style={{ color: 'var(--text-secondary)' }}>Loading Dashboard metrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem' }}>
        <p style={{ color: 'var(--status-error)', marginBottom: '1rem' }}>⚠️ {error}</p>
        <button className="btn btn-secondary" onClick={fetchStats}>Retry</button>
      </div>
    );
  }

  const lowStockCount = stats?.low_stock_products?.length || 0;

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>
      <p className="page-subtitle">Real-time overview of your store inventory and business orders.</p>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="glass-panel stat-card">
          <div className="stat-label">Total Products</div>
          <div className="stat-value">{stats?.total_products || 0}</div>
        </div>
        <div className="glass-panel stat-card accent">
          <div className="stat-label">Total Customers</div>
          <div className="stat-value">{stats?.total_customers || 0}</div>
        </div>
        <div className="glass-panel stat-card">
          <div className="stat-label">Total Orders Placed</div>
          <div className="stat-value">{stats?.total_orders || 0}</div>
        </div>
        <div className={`glass-panel stat-card ${lowStockCount > 0 ? 'danger' : ''}`}>
          <div className="stat-label">Low Stock Alerts</div>
          <div className="stat-value">{lowStockCount}</div>
        </div>
      </div>

      {/* Low Stock Detailed Panel */}
      <div className="glass-panel" style={{ marginTop: '2rem' }}>
        <div className="section-header">
          <h2 className="section-title">⚠️ Low Stock Warning List</h2>
          <span className="badge low-stock">Threshold &lt; 5 items</span>
        </div>

        {lowStockCount === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-secondary)' }}>
            🎉 All products have healthy stock levels!
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>SKU Code</th>
                  <th>Unit Price</th>
                  <th>Available Quantity</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.low_stock_products.map((product) => (
                  <tr key={product.id}>
                    <td style={{ fontWeight: 500 }}>{product.name}</td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{product.sku}</td>
                    <td>${Number(product.price).toFixed(2)}</td>
                    <td style={{ fontWeight: 600, color: 'var(--status-error)' }}>
                      {product.quantity_in_stock}
                    </td>
                    <td>
                      <span className={`badge ${product.quantity_in_stock === 0 ? 'out-of-stock' : 'low-stock'}`}>
                        {product.quantity_in_stock === 0 ? 'Out of Stock' : 'Critical Stock'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
