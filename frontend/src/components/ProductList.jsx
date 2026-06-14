import React, { useEffect, useState } from 'react';
import { API_BASE } from '../config';

export default function ProductList({ triggerToast }) {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  // Form values
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    price: '',
    quantity_in_stock: ''
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/products`);
      if (!res.ok) throw new Error('Failed to fetch product list');
      const data = await res.json();
      setProducts(data);
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
      triggerToast('Product name is required', 'error');
      return false;
    }
    if (!formData.sku.trim()) {
      triggerToast('SKU is required', 'error');
      return false;
    }
    const priceNum = parseFloat(formData.price);
    if (isNaN(priceNum) || priceNum <= 0) {
      triggerToast('Price must be a positive number', 'error');
      return false;
    }
    const qtyNum = parseInt(formData.quantity_in_stock);
    if (isNaN(qtyNum) || qtyNum < 0) {
      triggerToast('Quantity in stock cannot be negative', 'error');
      return false;
    }
    return true;
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const res = await fetch(`${API_BASE}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          sku: formData.sku.trim().toUpperCase(),
          price: parseFloat(formData.price).toFixed(2),
          quantity_in_stock: parseInt(formData.quantity_in_stock)
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to create product');
      }

      triggerToast(`Product '${data.name}' added successfully!`, 'success');
      setShowAddModal(false);
      resetForm();
      fetchProducts();
    } catch (err) {
      console.error(err);
      triggerToast(err.message, 'error');
    }
  };

  const handleEditClick = (product) => {
    setSelectedProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku,
      price: product.price.toString(),
      quantity_in_stock: product.quantity_in_stock.toString()
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const res = await fetch(`${API_BASE}/products/${selectedProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          sku: formData.sku.trim().toUpperCase(),
          price: parseFloat(formData.price).toFixed(2),
          quantity_in_stock: parseInt(formData.quantity_in_stock)
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to update product');
      }

      triggerToast(`Product '${data.name}' updated successfully!`, 'success');
      setShowEditModal(false);
      resetForm();
      fetchProducts();
    } catch (err) {
      console.error(err);
      triggerToast(err.message, 'error');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete product "${name}"?`)) return;

    try {
      const res = await fetch(`${API_BASE}/products/${id}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to delete product');
      }

      triggerToast(`Product '${name}' deleted.`, 'success');
      fetchProducts();
    } catch (err) {
      console.error(err);
      triggerToast(err.message, 'error');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', sku: '', price: '', quantity_in_stock: '' });
    setSelectedProduct(null);
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="section-header">
        <div>
          <h1 className="page-title">Products Inventory</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage catalog items, monitor quantities, and update price levels.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowAddModal(true); }}>
          ➕ Add Product
        </button>
      </div>

      {/* Controls */}
      <div className="controls-bar glass-panel">
        <input
          type="text"
          className="search-input"
          placeholder="Search products by name or SKU..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Showing {filteredProducts.length} of {products.length} products
        </span>
      </div>

      {loading ? (
        <div className="spinner-container">
          <div className="spinner"></div>
          <p style={{ color: 'var(--text-secondary)' }}>Loading catalog...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📦</div>
          <h3>No Products Found</h3>
          <p>Get started by adding a product to your catalog inventory.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product Name</th>
                <th>SKU Code</th>
                <th>Price</th>
                <th>Quantity in Stock</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((p) => {
                const isLow = p.quantity_in_stock < 5;
                const isOut = p.quantity_in_stock === 0;
                return (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{p.sku}</td>
                    <td>${Number(p.price).toFixed(2)}</td>
                    <td style={{ fontWeight: 600 }}>{p.quantity_in_stock}</td>
                    <td>
                      <span className={`badge ${isOut ? 'out-of-stock' : isLow ? 'low-stock' : 'in-stock'}`}>
                        {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn-icon-only" title="Edit Product" onClick={() => handleEditClick(p)}>
                        ✏️
                      </button>
                      <button className="btn-icon-only danger" title="Delete Product" onClick={() => handleDelete(p.id, p.name)}>
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

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="section-title">Add New Product</h3>
              <button className="btn-icon-only" onClick={() => setShowAddModal(false)}>❌</button>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Product Name</label>
                  <input
                    type="text"
                    name="name"
                    required
                    className="form-input"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g. Wireless Mouse"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">SKU / Catalog Code (Unique)</label>
                  <input
                    type="text"
                    name="sku"
                    required
                    className="form-input"
                    value={formData.sku}
                    onChange={handleInputChange}
                    placeholder="e.g. MS-WRLS-01"
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Unit Price ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="price"
                      required
                      className="form-input"
                      value={formData.price}
                      onChange={handleInputChange}
                      placeholder="e.g. 29.99"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Quantity in Stock</label>
                    <input
                      type="number"
                      name="quantity_in_stock"
                      required
                      className="form-input"
                      value={formData.quantity_in_stock}
                      onChange={handleInputChange}
                      placeholder="e.g. 50"
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Product</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="section-title">Edit Product Details</h3>
              <button className="btn-icon-only" onClick={() => setShowEditModal(false)}>❌</button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Product Name</label>
                  <input
                    type="text"
                    name="name"
                    required
                    className="form-input"
                    value={formData.name}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">SKU / Catalog Code</label>
                  <input
                    type="text"
                    name="sku"
                    required
                    className="form-input"
                    value={formData.sku}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Unit Price ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="price"
                      required
                      className="form-input"
                      value={formData.price}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Quantity in Stock</label>
                    <input
                      type="number"
                      name="quantity_in_stock"
                      required
                      className="form-input"
                      value={formData.quantity_in_stock}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Update Product</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
