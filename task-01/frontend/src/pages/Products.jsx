import { useEffect, useState } from "react";
import api from "../api/axios";

function Products() {
  const [products, setProducts] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    name: "",
    price: "",
    stock_quantity: "",
  });

  const loadProducts = async () => {
    try {
      const response = await api.get("/products");
      setProducts(response.data);
    } catch (error) {
      console.error(error);
      setMessage("Failed to load products.");
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleChange = (event) => {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
  };

  const resetForm = () => {
    setForm({
      name: "",
      price: "",
      stock_quantity: "",
    });

    setEditingId(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const productData = {
      name: form.name,
      price: Number(form.price),
      stock_quantity: Number(form.stock_quantity),
    };

    try {
      if (editingId) {
        await api.put(`/products/${editingId}`, productData);
        setMessage("Product updated successfully.");
      } else {
        await api.post("/products", productData);
        setMessage("Product added successfully.");
      }

      resetForm();
      await loadProducts();
    } catch (error) {
      console.error(error);
      setMessage("Something went wrong.");
    }
  };

  const handleEdit = (product) => {
    setEditingId(product.id);

    setForm({
      name: product.name,
      price: product.price,
      stock_quantity: product.stock_quantity,
    });

    setMessage("");
  };

  const handleDelete = async (productId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this product?"
    );

    if (!confirmed) {
      return;
    }

    try {
      await api.delete(`/products/${productId}`);
      setMessage("Product deleted successfully.");
      await loadProducts();
    } catch (error) {
      console.error(error);
      setMessage("Could not delete product.");
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Products</h1>
          <p>Manage products, prices and stock levels.</p>
        </div>
      </div>

      <div className="product-form-card">
        <h2>{editingId ? "Edit Product" : "Add Product"}</h2>

        <form className="product-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Product Name</label>

            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Coca Cola"
              required
            />
          </div>

          <div className="form-group">
            <label>Price (Rs.)</label>

            <input
              type="number"
              name="price"
              value={form.price}
              onChange={handleChange}
              placeholder="0.00"
              min="0.01"
              step="0.01"
              required
            />
          </div>

          <div className="form-group">
            <label>Stock Quantity</label>

            <input
              type="number"
              name="stock_quantity"
              value={form.stock_quantity}
              onChange={handleChange}
              placeholder="0"
              min="0"
              required
            />
          </div>

          <div className="form-actions">
            <button className="primary-button" type="submit">
              {editingId ? "Update Product" : "Add Product"}
            </button>

            {editingId && (
              <button
                type="button"
                className="secondary-button"
                onClick={resetForm}
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        {message && <p className="status-message">{message}</p>}
      </div>

      <div className="table-card">
        <div className="table-header">
          <h2>Inventory</h2>
          <span>{products.length} products</span>
        </div>

        <div className="table-wrapper">
          <table className="products-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Product</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td>#{product.id}</td>

                  <td>
                    <strong>{product.name}</strong>
                  </td>

                  <td>
                    Rs. {Number(product.price).toFixed(2)}
                  </td>

                  <td>{product.stock_quantity}</td>

                  <td>
                    <span
                      className={
                        product.stock_quantity === 0
                          ? "stock-badge out"
                          : product.stock_quantity <= 5
                          ? "stock-badge low"
                          : "stock-badge available"
                      }
                    >
                      {product.stock_quantity === 0
                        ? "Out of Stock"
                        : product.stock_quantity <= 5
                        ? "Low Stock"
                        : "Available"}
                    </span>
                  </td>

                  <td>
                    <div className="action-buttons">
                      <button
                        className="edit-button"
                        onClick={() => handleEdit(product)}
                      >
                        Edit
                      </button>

                      <button
                        className="delete-button"
                        onClick={() =>
                          handleDelete(product.id)
                        }
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {products.length === 0 && (
                <tr>
                  <td colSpan="6" className="empty-table">
                    No products found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Products;