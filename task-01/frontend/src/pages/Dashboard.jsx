import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";

function Dashboard() {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = async () => {
    try {
      setError("");

      const [productsResponse, ordersResponse] =
        await Promise.all([
          api.get("/products"),
          api.get("/orders"),
        ]);

      setProducts(productsResponse.data);

      setOrders(
        [...ordersResponse.data].sort(
          (a, b) => b.id - a.id
        )
      );
    } catch (err) {
      console.error(err);
      setError("Could not load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const stats = useMemo(() => {
    return {
      totalProducts: products.length,

      lowStock: products.filter(
        (product) =>
          product.stock_quantity > 0 &&
          product.stock_quantity <= 5
      ).length,

      outOfStock: products.filter(
        (product) =>
          product.stock_quantity === 0
      ).length,

      paidOrders: orders.filter(
        (order) => order.status === "PAID"
      ).length,

      reservedOrders: orders.filter(
        (order) => order.status === "RESERVED"
      ).length,

      totalRevenue: orders
        .filter(
          (order) => order.status === "PAID"
        )
        .reduce(
          (sum, order) =>
            sum + Number(order.total_amount),
          0
        ),
    };
  }, [products, orders]);

  const recentOrders = orders.slice(0, 5);

  const inventoryAlerts = products
    .filter(
      (product) =>
        product.stock_quantity <= 5
    )
    .sort(
      (a, b) =>
        a.stock_quantity - b.stock_quantity
    )
    .slice(0, 5);

  const formatDate = (value) => {
    if (!value) {
      return "—";
    }

    return new Date(value).toLocaleString();
  };

  if (loading) {
    return <h2>Loading dashboard...</h2>;
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>
            Overview of inventory, orders and sales.
          </p>
        </div>

        <button
          className="secondary-button"
          onClick={loadDashboard}
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="pos-message">
          {error}
        </div>
      )}

      <div className="dashboard-stats">
        <div className="dashboard-stat-card">
          <span>Total Products</span>
          <strong>{stats.totalProducts}</strong>
          <small>Products in inventory</small>
        </div>

        <div className="dashboard-stat-card">
          <span>Low Stock</span>
          <strong>{stats.lowStock}</strong>
          <small>5 units or fewer</small>
        </div>

        <div className="dashboard-stat-card">
          <span>Reserved Orders</span>
          <strong>{stats.reservedOrders}</strong>
          <small>Awaiting payment</small>
        </div>

        <div className="dashboard-stat-card">
          <span>Paid Orders</span>
          <strong>{stats.paidOrders}</strong>
          <small>Successfully completed</small>
        </div>
      </div>

      <div className="dashboard-secondary-stats">
        <div className="dashboard-revenue-card">
          <div>
            <span>Paid Order Revenue</span>

            <strong>
              Rs. {stats.totalRevenue.toFixed(2)}
            </strong>
          </div>

          <p>
            Calculated from orders currently marked
            as PAID.
          </p>
        </div>

        <div className="dashboard-out-stock-card">
          <div>
            <span>Out of Stock</span>
            <strong>{stats.outOfStock}</strong>
          </div>

          <p>
            Products requiring inventory attention.
          </p>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="table-card">
          <div className="table-header">
            <h2>Recent Orders</h2>
            <span>Latest 5</span>
          </div>

          {recentOrders.length === 0 ? (
            <p>No orders available.</p>
          ) : (
            <div className="dashboard-order-list">
              {recentOrders.map((order) => (
                <div
                  className="dashboard-order-row"
                  key={order.id}
                >
                  <div>
                    <strong>
                      Order #{order.id}
                    </strong>

                    <span>
                      {formatDate(order.created_at)}
                    </span>
                  </div>

                  <div className="dashboard-order-right">
                    <span
                      className={`order-status status-${order.status.toLowerCase()}`}
                    >
                      {order.status}
                    </span>

                    <strong>
                      Rs.{" "}
                      {Number(
                        order.total_amount
                      ).toFixed(2)}
                    </strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="table-card">
          <div className="table-header">
            <h2>Inventory Alerts</h2>
            <span>Low stock</span>
          </div>

          {inventoryAlerts.length === 0 ? (
            <p>
              All products have healthy stock levels.
            </p>
          ) : (
            <div className="inventory-alert-list">
              {inventoryAlerts.map(
                (product) => (
                  <div
                    className="inventory-alert-row"
                    key={product.id}
                  >
                    <div>
                      <strong>
                        {product.name}
                      </strong>

                      <span>
                        Rs.{" "}
                        {Number(
                          product.price
                        ).toFixed(2)}
                      </span>
                    </div>

                    <span
                      className={
                        product.stock_quantity === 0
                          ? "stock-badge out"
                          : "stock-badge low"
                      }
                    >
                      {product.stock_quantity === 0
                        ? "Out of Stock"
                        : `${product.stock_quantity} left`}
                    </span>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;