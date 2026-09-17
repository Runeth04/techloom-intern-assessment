import {
  useEffect,
  useState,
} from "react";

import api from "../api/axios";


function Orders() {
  const [orders, setOrders] = useState([]);
  const [email, setEmail] = useState(
    () =>
      localStorage.getItem(
        "techloom-customer-email"
      ) || ""
  );

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");


  const loadOrders = async (
    emailToUse = email
  ) => {
    try {
      setLoading(true);
      setMessage("");

      const params = {};

      if (emailToUse.trim()) {
        params.customer_email =
          emailToUse.trim();
      }

      const response = await api.get(
        "/orders",
        { params }
      );

      setOrders(response.data);
    } catch (error) {
      console.error(error);

      setMessage(
        "Unable to load order history."
      );
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    if (email) {
      loadOrders(email);
    }
  }, []);


  const handleSearch = (event) => {
    event.preventDefault();

    if (!email.trim()) {
      setMessage(
        "Enter your email address."
      );
      return;
    }

    localStorage.setItem(
      "techloom-customer-email",
      email.trim()
    );

    loadOrders(email);
  };


  const handleCancel = async (
    orderId
  ) => {
    try {
      setMessage("");

      await api.post(
        `/orders/${orderId}/cancel`
      );

      setMessage(
        `Order #${orderId} updated successfully.`
      );

      await loadOrders(email);
    } catch (error) {
      console.error(error);

      const detail =
        error.response?.data?.detail;

      setMessage(
        typeof detail === "string"
          ? detail
          : "Unable to cancel order."
      );
    }
  };


  const formatDate = (value) => {
    if (!value) {
      return "—";
    }

    return new Date(
      value
    ).toLocaleString();
  };


  return (
    <section>
      <div className="page-heading">
        <div>
          <h1>Order History</h1>

          <p>
            View your current and previous
            orders.
          </p>
        </div>
      </div>

      <form
        className="order-search"
        onSubmit={handleSearch}
      >
        <input
          type="email"
          placeholder="Enter your checkout email"
          value={email}
          onChange={(event) =>
            setEmail(
              event.target.value
            )
          }
        />

        <button
          type="submit"
          className="primary-button"
        >
          View Orders
        </button>
      </form>

      {message && (
        <div className="checkout-message">
          {message}
        </div>
      )}

      {loading ? (
        <p>Loading orders...</p>
      ) : orders.length === 0 ? (
        <div className="empty-state">
          <h2>No orders found</h2>

          <p>
            Orders placed using this email
            will appear here.
          </p>
        </div>
      ) : (
        <div className="order-list">
          {orders.map((order) => (
            <article
              className="order-card"
              key={order.id}
            >
              <div className="order-card-header">
                <div>
                  <span className="order-number">
                    Order #{order.id}
                  </span>

                  <p>
                    {formatDate(
                      order.created_at
                    )}
                  </p>
                </div>

                <span
                  className={`order-status status-${order.status.toLowerCase()}`}
                >
                  {order.status}
                </span>
              </div>

              <div className="order-customer">
                <div>
                  <span>Customer</span>

                  <strong>
                    {order.customer_name}
                  </strong>
                </div>

                <div>
                  <span>Email</span>

                  <strong>
                    {order.customer_email}
                  </strong>
                </div>

                <div>
                  <span>Total</span>

                  <strong>
                    LKR{" "}
                    {Number(
                      order.total_amount
                    ).toLocaleString()}
                  </strong>
                </div>
              </div>

              <div className="order-section">
                <h3>Items</h3>

                {order.items.map((item) => (
                  <div
                    className="order-item-row"
                    key={item.id}
                  >
                    <span>
                      {item.product_name}
                      {" × "}
                      {item.quantity}
                    </span>

                    <strong>
                      LKR{" "}
                      {(
                        Number(
                          item.unit_price
                        ) *
                        item.quantity
                      ).toLocaleString()}
                    </strong>
                  </div>
                ))}
              </div>

              <div className="order-section">
                <h3>Status History</h3>

                <div className="status-timeline">
                  {order.status_history
                    .slice()
                    .sort(
                      (a, b) =>
                        new Date(
                          a.created_at
                        ) -
                        new Date(
                          b.created_at
                        )
                    )
                    .map((history) => (
                      <div
                        className="timeline-entry"
                        key={history.id}
                      >
                        <div className="timeline-dot" />

                        <div>
                          <strong>
                            {history.from_status
                              ? `${history.from_status} → ${history.to_status}`
                              : history.to_status}
                          </strong>

                          <p>
                            {history.reason}
                          </p>

                          <span>
                            {formatDate(
                              history.created_at
                            )}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {order.refunds.length > 0 && (
                <div className="order-section refund-section">
                  <h3>Refund</h3>

                  {order.refunds.map(
                    (refund) => (
                      <div
                        className="refund-row"
                        key={refund.id}
                      >
                        <div>
                          <strong>
                            {refund.status}
                          </strong>

                          <p>
                            {refund.reason}
                          </p>
                        </div>

                        <strong>
                          LKR{" "}
                          {Number(
                            refund.amount
                          ).toLocaleString()}
                        </strong>
                      </div>
                    )
                  )}
                </div>
              )}

              {(order.status === "RESERVED" ||
                order.status === "PAID") && (
                <div className="order-actions">
                  <button
                    type="button"
                    className="cancel-order-button"
                    onClick={() =>
                      handleCancel(order.id)
                    }
                  >
                    {order.status === "PAID"
                      ? "Cancel & Refund"
                      : "Cancel Order"}
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}


export default Orders;