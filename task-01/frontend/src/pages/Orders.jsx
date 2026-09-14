import { useCallback, useEffect, useState } from "react";
import api from "../api/axios";

function Orders() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [cancellingId, setCancellingId] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const [ordersResponse, productsResponse] =
        await Promise.all([
          api.get("/orders"),
          api.get("/products"),
        ]);

      setOrders(
        [...ordersResponse.data].sort(
          (a, b) => b.id - a.id
        )
      );

      setProducts(productsResponse.data);
    } catch (error) {
      console.error(error);
      setMessage("Could not load orders.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const interval = setInterval(() => {
      loadData();
    }, 10000);

    return () => clearInterval(interval);
  }, [loadData]);

  const getProductName = (productId) => {
    const product = products.find(
      (item) => item.id === productId
    );

    return product
      ? product.name
      : `Product #${productId}`;
  };

  const canCancel = (status) => {
    return ["PENDING", "RESERVED", "PAID"].includes(
      status
    );
  };

  const handleCancel = async (orderId) => {
    const confirmed = window.confirm(
      `Are you sure you want to cancel Order #${orderId}?`
    );

    if (!confirmed) {
      return;
    }

    setCancellingId(orderId);
    setMessage("");

    try {
      await api.post(`/orders/${orderId}/cancel`);

      setMessage(
        `Order #${orderId} cancelled successfully.`
      );

      await loadData();
    } catch (error) {
      console.error(error);

      setMessage(
        error.response?.data?.detail ||
          "Could not cancel order."
      );
    } finally {
      setCancellingId(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) {
      return "—";
    }

    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return <h2>Loading orders...</h2>;
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Orders</h1>
          <p>
            View order history, payment states and
            reservations.
          </p>
        </div>

        <button
          className="secondary-button"
          onClick={loadData}
        >
          Refresh
        </button>
      </div>

      {message && (
        <div className="pos-message">
          {message}
        </div>
      )}

      <div className="orders-summary">
        <div className="summary-card">
          <span>Total Orders</span>
          <strong>{orders.length}</strong>
        </div>

        <div className="summary-card">
          <span>Reserved</span>
          <strong>
            {
              orders.filter(
                (order) =>
                  order.status === "RESERVED"
              ).length
            }
          </strong>
        </div>

        <div className="summary-card">
          <span>Paid</span>
          <strong>
            {
              orders.filter(
                (order) => order.status === "PAID"
              ).length
            }
          </strong>
        </div>

        <div className="summary-card">
          <span>Cancelled</span>
          <strong>
            {
              orders.filter(
                (order) =>
                  order.status === "CANCELLED"
              ).length
            }
          </strong>
        </div>
      </div>

      <div className="orders-list">
        {orders.length === 0 ? (
          <div className="table-card">
            <p>No orders have been created yet.</p>
          </div>
        ) : (
          orders.map((order) => (
            <div
              className="order-card"
              key={order.id}
            >
              <div className="order-card-header">
                <div>
                  <span className="order-number">
                    Order #{order.id}
                  </span>

                  <span
                    className={`order-status status-${order.status.toLowerCase()}`}
                  >
                    {order.status}
                  </span>
                </div>

                <strong className="order-total">
                  Rs.{" "}
                  {Number(
                    order.total_amount
                  ).toFixed(2)}
                </strong>
              </div>

              <div className="order-info-grid">
                <div>
                  <span>Created</span>
                  <strong>
                    {formatDate(order.created_at)}
                  </strong>
                </div>

                <div>
                  <span>Reservation Expires</span>
                  <strong>
                    {formatDate(
                      order.reservation_expires_at
                    )}
                  </strong>
                </div>
              </div>

              <div className="order-items">
                <h4>Items</h4>

                {order.items.map((item) => (
                  <div
                    className="order-item-row"
                    key={item.id}
                  >
                    <div>
                      <strong>
                        {getProductName(
                          item.product_id
                        )}
                      </strong>

                      <span>
                        Qty: {item.quantity}
                      </span>
                    </div>

                    <span>
                      Rs.{" "}
                      {(
                        Number(item.unit_price) *
                        item.quantity
                      ).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="order-actions">
                {canCancel(order.status) ? (
                  <button
                    className="delete-button"
                    disabled={
                      cancellingId === order.id
                    }
                    onClick={() =>
                      handleCancel(order.id)
                    }
                  >
                    {cancellingId === order.id
                      ? "Cancelling..."
                      : "Cancel Order"}
                  </button>
                ) : (
                  <span className="order-closed">
                    No further actions available
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Orders;