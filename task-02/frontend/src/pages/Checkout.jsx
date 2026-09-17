import {
  useEffect,
  useState,
} from "react";
import {
  Link,
  useNavigate,
} from "react-router-dom";

import api from "../api/axios";
import { useCart } from "../context/CartContext";


function Checkout() {
  const navigate = useNavigate();

  const {
    cart,
    cartTotal,
    clearCart,
  } = useCart();

  const [customerName, setCustomerName] =
    useState("");

  const [customerEmail, setCustomerEmail] =
    useState("");

  const [processing, setProcessing] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [reservedOrder, setReservedOrder] =
    useState(() => {
      const savedOrder = localStorage.getItem(
        "techloom-active-checkout"
      );

      return savedOrder
        ? JSON.parse(savedOrder)
        : null;
    });

    const [paymentProcessing, setPaymentProcessing] =
        useState(false);

    const [paymentResult, setPaymentResult] =
        useState(null);


  useEffect(() => {
    if (reservedOrder) {
      localStorage.setItem(
        "techloom-active-checkout",
        JSON.stringify(reservedOrder)
      );
    }
  }, [reservedOrder]);


  const handleCheckout = async (event) => {
    event.preventDefault();

    if (cart.length === 0) {
      setMessage(
        "Your cart is empty."
      );

      return;
    }

    try {
      setProcessing(true);
      setMessage("");

      const response = await api.post(
        "/orders/checkout",
        {
          checkout_session_key:
            crypto.randomUUID(),

          customer_name:
            customerName.trim(),

          customer_email:
            customerEmail.trim(),

          items: cart.map((item) => ({
            product_id: item.id,
            quantity: item.quantity,
          })),
        }
      );

      setReservedOrder(response.data);

      localStorage.setItem(
        "techloom-customer-email",
        response.data.customer_email
        );

      setMessage(
        "Stock reserved successfully. Complete payment before the reservation expires."
      );
    } catch (error) {
      console.error(error);

      const errorDetail =
        error.response?.data?.detail;

      const detail =
        typeof errorDetail === "string"
          ? errorDetail
          : Array.isArray(errorDetail)
          ? errorDetail
              .map((item) => item.msg)
              .join(", ")
          : "Checkout failed.";

      setMessage(detail);
    } finally {
      setProcessing(false);
    }
  };

  const handlePayment = async (outcome) => {
  if (!reservedOrder) {
    return;
  }

    try {
        setPaymentProcessing(true);
        setMessage("");

        const response = await api.post(
        `/payments/orders/${reservedOrder.id}`,
        {
            outcome,
            idempotency_key:
            crypto.randomUUID(),
        }
        );

        setPaymentResult({
        outcome: response.data.outcome,
        orderId: reservedOrder.id,
        });

        localStorage.removeItem(
        "techloom-active-checkout"
        );

        if (outcome === "SUCCESS") {
        clearCart();

        setMessage(
            "Payment successful. Your order has been confirmed."
        );
        }

        if (outcome === "FAILED") {
        setMessage(
            "Payment failed. Reserved stock has been released."
        );
        }

        if (outcome === "TIMEOUT") {
        setMessage(
            "Payment timed out. The reservation has expired and stock was released."
        );
        }

        setReservedOrder(null);
    } catch (error) {
        console.error(error);

        const errorDetail =
        error.response?.data?.detail;

        const detail =
        typeof errorDetail === "string"
            ? errorDetail
            : "Payment could not be processed.";

        setMessage(detail);

        if (
        detail ===
        "Checkout reservation expired"
        ) {
        localStorage.removeItem(
            "techloom-active-checkout"
        );

        setReservedOrder(null);
        }
    } finally {
        setPaymentProcessing(false);
    }
    };


    if (
    cart.length === 0 &&
    !reservedOrder &&
    !paymentResult
    ) {
    return (
      <section>
        <h1>Checkout</h1>

        <div className="empty-state">
          <h2>Your cart is empty</h2>

          <p>
            Add products before checking out.
          </p>

          <button
            type="button"
            className="primary-button"
            onClick={() =>
              navigate("/")
            }
          >
            Browse Products
          </button>
        </div>
      </section>
    );
  }


  return (
    <section>
      <Link
        to="/cart"
        className="back-link"
      >
        ← Back to Cart
      </Link>

      <div className="page-heading">
        <div>
          <h1>Checkout</h1>

          <p>
            Confirm your details and reserve
            your products.
          </p>
        </div>
      </div>

      <div className="checkout-layout">
        <div className="checkout-card">
          {reservedOrder ? (
            <div className="reservation-card">
              <span className="reservation-badge">
                RESERVED
              </span>

              <h2>
                Order #{reservedOrder.id}
              </h2>

              <p>
                Your products are currently
                reserved.
              </p>

              <div className="reservation-details">
                <div>
                  <span>Customer</span>
                  <strong>
                    {
                      reservedOrder.customer_name
                    }
                  </strong>
                </div>

                <div>
                  <span>Email</span>
                  <strong>
                    {
                      reservedOrder.customer_email
                    }
                  </strong>
                </div>

                <div>
                  <span>Order Total</span>
                  <strong>
                    LKR{" "}
                    {Number(
                      reservedOrder.total_amount
                    ).toLocaleString()}
                  </strong>
                </div>

                <div>
                  <span>
                    Reservation Expires
                  </span>

                  <strong>
                    {new Date(
                      reservedOrder.reservation_expires_at
                    ).toLocaleString()}
                  </strong>
                </div>
              </div>

              <div className="payment-section">
                <h3>Mock Payment Gateway</h3>

                <p>
                    Select an outcome to simulate the
                    payment gateway.
                </p>

                <div className="payment-buttons">
                    <button
                    type="button"
                    className="payment-success"
                    disabled={paymentProcessing}
                    onClick={() =>
                        handlePayment("SUCCESS")
                    }
                    >
                    {paymentProcessing
                        ? "Processing..."
                        : "Simulate Success"}
                    </button>

                    <button
                    type="button"
                    className="payment-failed"
                    disabled={paymentProcessing}
                    onClick={() =>
                        handlePayment("FAILED")
                    }
                    >
                    Simulate Failure
                    </button>

                    <button
                    type="button"
                    className="payment-timeout"
                    disabled={paymentProcessing}
                    onClick={() =>
                        handlePayment("TIMEOUT")
                    }
                    >
                    Simulate Timeout
                    </button>
                </div>
                </div>

            </div>
          ) : (
            <form
              className="checkout-form"
              onSubmit={handleCheckout}
            >
              <h2>Customer Details</h2>

              <label>
                Full Name

                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(event) =>
                    setCustomerName(
                      event.target.value
                    )
                  }
                  placeholder="Enter your name"
                />
              </label>

              <label>
                Email Address

                <input
                  type="email"
                  required
                  value={customerEmail}
                  onChange={(event) =>
                    setCustomerEmail(
                      event.target.value
                    )
                  }
                  placeholder="Enter your email"
                />
              </label>

              <button
                type="submit"
                className="primary-button reserve-button"
                disabled={processing}
              >
                {processing
                  ? "Reserving Stock..."
                  : "Reserve & Continue"}
              </button>
            </form>
          )}

          {message && (
            <div className="checkout-message">
              {message}
            </div>
          )}
        </div>

        <aside className="cart-summary">
          <h2>Order Summary</h2>

          {cart.map((item) => (
            <div
              className="checkout-summary-item"
              key={item.id}
            >
              <span>
                {item.name} × {item.quantity}
              </span>

              <strong>
                LKR{" "}
                {(
                  Number(item.price) *
                  item.quantity
                ).toLocaleString()}
              </strong>
            </div>
          ))}

          <div className="summary-divider" />

          <div className="summary-row summary-total">
            <span>Total</span>

            <strong>
              LKR{" "}
              {cartTotal.toLocaleString()}
            </strong>
          </div>
        </aside>
      </div>

        {paymentResult && (
            <div className="payment-result-card">
                <h2>
                {paymentResult.outcome === "SUCCESS"
                    ? "Order Confirmed"
                    : paymentResult.outcome === "FAILED"
                    ? "Payment Failed"
                    : "Payment Timed Out"}
                </h2>

                <p>
                Order #{paymentResult.orderId}
                </p>

                <Link
                to="/orders"
                className="primary-button"
                >
                View Order History
                </Link>
            </div>
            )}

    </section>
  );
}


export default Checkout;