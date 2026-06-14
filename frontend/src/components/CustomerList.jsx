import React, { useEffect, useState } from 'react';
import { API_BASE } from '../config';

export default function CustomerList({ triggerToast }) {
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Form values
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/customers`);
      if (!res.ok) throw new Error('Failed to fetch customer list');
      const data = await res.json();
      setCustomers(data);
    } catch (err) {
      console.error(err);
      triggerToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      triggerToast('Customer name is required', 'error');
      return false;
    }
    if (!formData.email.trim()) {
      triggerToast('Email address is required', 'error');
      return false;
    }
    // Simple email regex check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      triggerToast('Invalid email address format', 'error');
      return false;
    }
    if (!formData.phone.trim()) {
      triggerToast('Phone number is required', 'error');
      return false;
    }
    return true;
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const res = await fetch(`${API_BASE}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to register customer');
      }

      triggerToast(`Customer '${data.name}' registered successfully!`, 'success');
      setShowAddModal(false);
      resetForm();
      fetchCustomers();
    } catch (err) {
      console.error(err);
      triggerToast(err.message, 'error');
    }
  };

  const handleDelete = async (id, name) => {
    const confirmMsg = `Are you sure you want to delete customer "${name}"?\n\nWARNING: This will permanently delete ALL orders associated with this customer!`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch(`${API_BASE}/customers/${id}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to delete customer');
      }

      triggerToast(`Customer '${name}' and all their orders have been deleted.`, 'success');
      fetchCustomers();
    } catch (err) {
      console.error(err);
      triggerToast(err.message, 'error');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', email: '', phone: '' });
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  return (
    <div>
      <div className="section-header">
        <div>
          <h1 className="page-title">Customers Directory</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage client contacts, view credentials, and trace active accounts.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowAddModal(true); }}>
          ➕ Register Customer
        </button>
      </div>

      {/* Controls */}
      <div className="controls-bar glass-panel">
        <input
          type="text"
          className="search-input"
          placeholder="Search by name, email, or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Showing {filteredCustomers.length} of {customers.length} customers
        </span>
      </div>

      {loading ? (
        <div className="spinner-container">
          <div className="spinner"></div>
          <p style={{ color: 'var(--text-secondary)' }}>Loading directory...</p>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">👥</div>
          <h3>No Customers Registered</h3>
          <p>Get started by adding a customer profile to your directory database.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Email Address</th>
                <th>Phone Number</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{c.email}</td>
                  <td>{c.phone}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn-icon-only danger" title="Delete Customer" onClick={() => handleDelete(c.id, c.name)}>
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="section-title">Register Customer</h3>
              <button className="btn-icon-only" onClick={() => setShowAddModal(false)}>❌</button>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    required
                    className="form-input"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g. John Doe"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address (Unique)</label>
                  <input
                    type="email"
                    name="email"
                    required
                    className="form-input"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="e.g. john.doe@example.com"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input
                    type="text"
                    name="phone"
                    required
                    className="form-input"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="e.g. +1 (555) 123-4567"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Customer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
