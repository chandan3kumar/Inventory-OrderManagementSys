import React, { useEffect, useState } from 'react';
import { API_BASE } from '../config';

export default function OrderList({ triggerToast }) {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal displays
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // New Order Form State
  const [orderCustomerId, setOrderCustomerId] = useState('');
  const [orderItems, setOrderItems] = useState([
    { product_id: '', quantity: 1, availableStock: 0, price: 0 }
  ]);

  useEffect(() => {
    fetchOrdersData();
  }, []);

  const fetchOrdersData = async () => {
    setLoading(true);
    try {
      const [ordersRes, productsRes, customersRes] = await Promise.all([
        fetch(`${API_BASE}/orders`),
        fetch(`${API_BASE}/products`),
        fetch(`${API_BASE}/customers`)
      ]);

      if (!ordersRes.ok || !productsRes.ok || !customersRes.ok) {
        throw new Error('Failed to retrieve core database tables');
      }

      const ordersData = await ordersRes.json();
      const productsData = await productsRes.json();
      const customersData = await customersRes.json();

      setOrders(ordersData);
      setProducts(productsData);
      setCustomers(customersData);
    } catch (err) {
      console.error(err);
      triggerToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    if (customers.length === 0) {
      triggerToast('Register at least one customer first!', 'error');
      return;
    }
    if (products.length === 0) {
      triggerToast('Add products to inventory first!', 'error');
      return;
    }
    // Initialize empty form
    setOrderCustomerId(customers[0].id.toString());
    setOrderItems([{ product_id: products[0].id.toString(), quantity: 1, availableStock: products[0].quantity_in_stock, price: Number(products[0].price) }]);
    setShowCreateModal(true);
  };

  const handleAddItemRow = () => {
    const defaultProduct = products[0];
    setOrderItems(prev => [
      ...prev,
      {
        product_id: defaultProduct.id.toString(),
        quantity: 1,
        availableStock: defaultProduct.quantity_in_stock,
        price: Number(defaultProduct.price)
      }
    ]);
  };

  const handleRemoveItemRow = (index) => {
    if (orderItems.length === 1) return;
    setOrderItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    setOrderItems(prev => {
      const updated = [...prev];
      if (field === 'product_id') {
        const product = products.find(p => p.id.toString() === value);
        updated[index] = {
          product_id: value,
          quantity: 1,
          availableStock: product ? product.quantity_in_stock : 0,
          price: product ? Number(product.price) : 0
        };
      } else if (field === 'quantity') {
        const qty = parseInt(value) || 0;
        updated[index].quantity = qty;
      }
      return updated;
    });
  };

  // Calculate live order total
  const calculateLiveTotal = () => {
    return orderItems.reduce((sum, item) => sum + (item.price * (item.quantity || 0)), 0);
  };

  const handleCreateOrderSubmit = async (e) => {
    e.preventDefault();

    if (!orderCustomerId) {
      triggerToast('Please select a customer', 'error');
      return;
    }

    // Client-side validations
    for (let i = 0; i < orderItems.length; i++) {
      const item = orderItems[i];
      if (!item.product_id) {
        triggerToast(`Select a product for row ${i + 1}`, 'error');
        return;
      }
      if (item.quantity <= 0) {
        triggerToast(`Quantity must be greater than 0 for row ${i + 1}`, 'error');
        return;
      }
      if (item.quantity > item.availableStock) {
        const p = products.find(prod => prod.id.toString() === item.product_id);
        triggerToast(`Insufficient stock for '${p?.name || 'product'}'. Requested: ${item.quantity}, Available: ${item.availableStock}`, 'error');
        return;
      }
    }

    // Structure request
    const payload = {
      customer_id: parseInt(orderCustomerId),
      items: orderItems.map(item => ({
        product_id: parseInt(item.product_id),
        quantity: item.quantity
      }))
    };

    try {
      const res = await fetch(`${API_BASE}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to place order');
      }

      triggerToast(`Order #${data.id} placed successfully!`, 'success');
      setShowCreateModal(false);
      fetchOrdersData(); // reload stats and current stock counts
    } catch (err) {
      console.error(err);
      triggerToast(err.message, 'error');
    }
  };

  const handleViewOrder = async (orderId) => {
    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}`);
      if (!res.ok) throw new Error('Failed to load order details');
      const data = await res.json();
      setSelectedOrder(data);
      setShowDetailModal(true);
    } catch (err) {
      console.error(err);
      triggerToast(err.message, 'error');
    }
  };

  const handleCancelOrder = async (id) => {
    if (!window.confirm(`Are you sure you want to CANCEL order #${id}?\n\nThis will delete the record and restore product inventory quantities.`)) return;

    try {
      const res = await fetch(`${API_BASE}/orders/${id}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to cancel order');
      }

      triggerToast(`Order #${id} cancelled and stock restored.`, 'success');
      fetchOrdersData();
    } catch (err) {
      console.error(err);
      triggerToast(err.message, 'error');
    }
  };

  return (
    <div>
      <div className="section-header">
        <div>
          <h1 className="page-title">Orders Management</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Fulfill orders, adjust quantities, register customer shopping items, and handle cancellations.</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenCreateModal}>
          ➕ Create Order
        </button>
      </div>

      {loading ? (
        <div className="spinner-container">
          <div className="spinner"></div>
          <p style={{ color: 'var(--text-secondary)' }}>Loading orders ledger...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">💼</div>
          <h3>No Orders Found</h3>
          <p>Create a new order to run inventory sales transactions.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer Name</th>
                <th>Order Date</th>
                <th>Line Items</th>
                <th>Total Value</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const dateFormatted = new Date(o.created_at).toLocaleDateString('en-US', {
                  year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                });
                const totalQuantity = o.items.reduce((sum, item) => sum + item.quantity, 0);
                return (
                  <tr key={o.id}>
                    <td style={{ fontWeight: 600 }}>#{o.id}</td>
                    <td style={{ fontWeight: 500 }}>{o.customer_name}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{dateFormatted}</td>
                    <td>{totalQuantity} {totalQuantity === 1 ? 'item' : 'items'}</td>
                    <td style={{ color: 'var(--accent-neon)', fontWeight: 600 }}>
                      ${Number(o.total_amount).toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn-icon-only" title="View Details" onClick={() => handleViewOrder(o.id)}>
                        👁️
                      </button>
                      <button className="btn-icon-only danger" title="Cancel/Delete Order" onClick={() => handleCancelOrder(o.id)}>
                        🗑️
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Order Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content wide">
            <div className="modal-header">
              <h3 className="section-title">Assemble New Order</h3>
              <button className="btn-icon-only" onClick={() => setShowCreateModal(false)}>❌</button>
            </div>
            <form onSubmit={handleCreateOrderSubmit}>
              <div className="modal-body">
                {/* Select Customer */}
                <div className="form-group order-builder-customer">
                  <label className="form-label">Purchasing Customer</label>
                  <select
                    className="form-select"
                    value={orderCustomerId}
                    onChange={(e) => setOrderCustomerId(e.target.value)}
                  >
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                    ))}
                  </select>
                </div>

                {/* Items Section */}
                <div className="section-header">
                  <h4 className="form-label" style={{ fontSize: '0.95rem' }}>Order Line Items</h4>
                  <button type="button" className="btn btn-secondary btn-icon-only" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }} onClick={handleAddItemRow}>
                    ➕ Add Row
                  </button>
                </div>

                <div className="order-items-section">
                  {orderItems.map((item, index) => (
                    <div key={index} className="order-item-row">
                      {/* Product Selection */}
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>Select Product</label>
                        <select
                          className="form-select"
                          value={item.product_id}
                          onChange={(e) => handleItemChange(index, 'product_id', e.target.value)}
                        >
                          {products.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name} (${Number(p.price).toFixed(2)})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Stock Info (Readonly representation) */}
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>Available Stock</label>
                        <input
                          type="text"
                          className="form-input"
                          disabled
                          value={item.availableStock}
                        />
                      </div>

                      {/* Quantity Input */}
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>Qty</label>
                        <input
                          type="number"
                          min="1"
                          required
                          className="form-input"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        />
                      </div>

                      {/* Delete Row Action */}
                      <button
                        type="button"
                        className="btn btn-danger btn-icon-only"
                        style={{ height: '42px', padding: '0.65rem' }}
                        disabled={orderItems.length === 1}
                        onClick={() => handleRemoveItemRow(index)}
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>

                {/* Running Total representation */}
                <div className="order-builder-summary">
                  <span className="order-total-lbl">Subtotal Order Value</span>
                  <span className="order-total-val">${calculateLiveTotal().toFixed(2)}</span>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Submit Order</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Order Details Modal */}
      {showDetailModal && selectedOrder && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="section-title">Order Ledger: #{selectedOrder.id}</h3>
              <button className="btn-icon-only" onClick={() => setShowDetailModal(false)}>❌</button>
            </div>
            <div className="modal-body">
              <div className="order-details-meta">
                <div className="order-meta-item">
                  <span className="order-meta-lbl">Customer Name</span>
                  <span className="order-meta-val">{selectedOrder.customer_name}</span>
                </div>
                <div className="order-meta-item">
                  <span className="order-meta-lbl">Order Date</span>
                  <span className="order-meta-val">
                    {new Date(selectedOrder.created_at).toLocaleString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>

              <h4 className="form-label" style={{ marginBottom: '0.75rem', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.05em' }}>Items List</h4>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Quantity</th>
                      <th>Unit Price</th>
                      <th style={{ textAlign: 'right' }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items.map((item) => (
                      <tr key={item.id}>
                        <td style={{ fontWeight: 500 }}>{item.product_name}</td>
                        <td>{item.quantity}</td>
                        <td>${Number(item.unit_price).toFixed(2)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                          ${(Number(item.unit_price) * item.quantity).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="order-builder-summary" style={{ marginTop: '1.5rem' }}>
                <span className="order-total-lbl">Total Paid Amount</span>
                <span className="order-total-val">${Number(selectedOrder.total_amount).toFixed(2)}</span>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowDetailModal(false)}>Close Window</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
