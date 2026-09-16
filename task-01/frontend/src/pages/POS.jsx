import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";

function POS() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentProcessingId, setPaymentProcessingId] = useState(null);
  const [message, setMessage] = useState("");
  const [activeReservations, setActiveReservations] = useState([]);

  const loadProducts = async () => {
    try {
      const response = await api.get("/products");
      setProducts(response.data);
    } catch (error) {
      console.error(error);
      setMessage("Could not load products.");
    } finally {
      setLoading(false);
    }
  };

  const loadActiveReservations = async () => {
  try {
    const response = await api.get("/orders");

    const reservedOrders = response.data
      .filter((order) => order.status === "RESERVED")
      .sort((a, b) => b.id - a.id);

      setActiveReservations(reservedOrders);
    } catch (error) {
      console.error("Could not load active reservations:", error);
    }
  };

  useEffect(() => {
  loadProducts();
  loadActiveReservations();

  const interval = setInterval(() => {
    loadProducts();
    loadActiveReservations();
  }, 10000);

    return () => clearInterval(interval);
  }, []);

  const addToCart = (product) => {
    if (product.stock_quantity <= 0) {
      return;
    }

    setMessage("");

    setCart((currentCart) => {
      const existingItem = currentCart.find(
        (item) => item.id === product.id
      );

      if (existingItem) {
        if (existingItem.quantity >= product.stock_quantity) {
          setMessage(
            `Only ${product.stock_quantity} units of ${product.name} are available.`
          );

          return currentCart;
        }

        return currentCart.map((item) =>
          item.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
              }
            : item
        );
      }

      return [
        ...currentCart,
        {
          ...product,
          quantity: 1,
        },
      ];
    });
  };

  const increaseQuantity = (productId) => {
    setCart((currentCart) =>
      currentCart.map((item) => {
        if (item.id !== productId) {
          return item;
        }

        if (item.quantity >= item.stock_quantity) {
          setMessage(
            `Only ${item.stock_quantity} units of ${item.name} are available.`
          );

          return item;
        }

        return {
          ...item,
          quantity: item.quantity + 1,
        };
      })
    );
  };

  const decreaseQuantity = (productId) => {
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item.id === productId
            ? {
                ...item,
                quantity: item.quantity - 1,
              }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (productId) => {
    setCart((currentCart) =>
      currentCart.filter((item) => item.id !== productId)
    );
  };

  const total = useMemo(() => {
    return cart.reduce(
      (sum, item) =>
        sum + Number(item.price) * item.quantity,
      0
    );
  }, [cart]);

  const handleCheckout = async () => {
    if (cart.length === 0) {
      setMessage("Your cart is empty.");
      return;
    }

    setProcessing(true);
    setMessage("");

    let createdOrderId = null;

    try {
      const orderResponse = await api.post("/orders", {
        idempotency_key: crypto.randomUUID(),

        items: cart.map((item) => ({
            product_id: item.id,
            quantity: item.quantity,
        })),
        });

      createdOrderId = orderResponse.data.id;

      const checkoutResponse = await api.post(
        `/orders/${createdOrderId}/checkout`
      );

      setCart([]);

      await loadActiveReservations();

      setMessage(
        `Order #${createdOrderId} created and stock reserved successfully.`
      );

      await loadProducts();
await loadActiveReservations();
    } catch (error) {
      console.error(error);

      const errorDetail = error.response?.data?.detail;

        const detail =
        typeof errorDetail === "string"
            ? errorDetail
            : Array.isArray(errorDetail)
            ? errorDetail.map((item) => item.msg).join(", ")
            : "Checkout failed.";

        setMessage(detail);

      if (createdOrderId) {
        try {
          await api.post(
            `/orders/${createdOrderId}/cancel`
          );
        } catch (cancelError) {
          console.error(
            "Could not cancel failed pending order:",
            cancelError
          );
        }
      }

      await loadProducts();
    } finally {
      setProcessing(false);
    }
  };

  const handlePayment = async (orderId, outcome) => {
  setPaymentProcessingId(orderId);
  setMessage("");

  try {
    const idempotencyKey =
      `order-${orderId}-${crypto.randomUUID()}`;

    await api.post(
      `/payments/orders/${orderId}`,
      {
        outcome,
        idempotency_key: idempotencyKey,
      }
    );

    if (outcome === "SUCCESS") {
      setMessage(
        `Payment successful. Order #${orderId} is now PAID.`
      );
    }

    if (outcome === "FAILED") {
      setMessage(
        `Payment failed. Order #${orderId} has been marked FAILED and stock was restored.`
      );
    }

    if (outcome === "TIMEOUT") {
      setMessage(
        `Payment timed out. Order #${orderId} has expired and stock was restored.`
      );
    }

    await loadProducts();
    await loadActiveReservations();
  } catch (error) {
    console.error(error);

    const errorDetail = error.response?.data?.detail;

    const detail =
      typeof errorDetail === "string"
        ? errorDetail
        : "Payment processing failed.";

    setMessage(detail);

      await loadProducts();
      await loadActiveReservations();
    } finally {
      setPaymentProcessingId(null);
    }
  };

  if (loading) {
    return <h2>Loading POS...</h2>;
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Point of Sale</h1>
          <p>
            Select products, create an order and reserve stock.
          </p>
        </div>
      </div>

      {message && (
        <div className="pos-message">
          {message}
        </div>
      )}

      {activeReservations.length > 0 && (
        <div className="active-reservations">
          {activeReservations.map((reservation) => (
            <div
              className="reservation-card"
              key={reservation.id}
            >
              <div className="reservation-details">
                <span className="reservation-label">
                  Active Reservation
                </span>

                <h3>Order #{reservation.id}</h3>

                <p>
                  Status:{" "}
                  <strong>{reservation.status}</strong>
                </p>

                <p>
                  Total: Rs.{" "}
                  {Number(
                    reservation.total_amount
                  ).toFixed(2)}
                </p>

                <p>
                  Stock is reserved for 5 minutes while
                  payment is completed.
                </p>
              </div>

              <div className="payment-section">
                <span>Mock Payment Gateway</span>

                <div className="payment-buttons">
                  <button
                    className="payment-success"
                    disabled={
                      paymentProcessingId === reservation.id
                    }
                    onClick={() =>
                      handlePayment(
                        reservation.id,
                        "SUCCESS"
                      )
                    }
                  >
                    {paymentProcessingId === reservation.id
                      ? "Processing..."
                      : "Payment Success"}
                  </button>

                  <button
                    className="payment-failed"
                    disabled={
                      paymentProcessingId === reservation.id
                    }
                    onClick={() =>
                      handlePayment(
                        reservation.id,
                        "FAILED"
                      )
                    }
                  >
                    Payment Failed
                  </button>

                  <button
                    className="payment-timeout"
                    disabled={
                      paymentProcessingId === reservation.id
                    }
                    onClick={() =>
                      handlePayment(
                        reservation.id,
                        "TIMEOUT"
                      )
                    }
                  >
                    Payment Timeout
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="pos-layout">
        <section className="pos-products-section">
          <div className="section-heading">
            <h2>Products</h2>

            <span>
              {products.length} products
            </span>
          </div>

          <div className="product-grid">
            {products.map((product) => {
              const outOfStock =
                product.stock_quantity <= 0;

              return (
                <div
                  className="pos-product-card"
                  key={product.id}
                >
                  <div>
                    <h3>{product.name}</h3>

                    <p className="product-price">
                      Rs.{" "}
                      {Number(product.price).toFixed(2)}
                    </p>

                    <p className="product-stock">
                      Stock: {product.stock_quantity}
                    </p>
                  </div>

                  <button
                    className="primary-button"
                    disabled={outOfStock}
                    onClick={() =>
                      addToCart(product)
                    }
                  >
                    {outOfStock
                      ? "Out of Stock"
                      : "Add to Cart"}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        <aside className="cart-card">
          <div className="cart-header">
            <h2>Current Order</h2>

            <span>
              {cart.reduce(
                (sum, item) =>
                  sum + item.quantity,
                0
              )}{" "}
              items
            </span>
          </div>

          {cart.length === 0 ? (
            <div className="empty-cart">
              <p>Your cart is empty.</p>
              <span>
                Add a product to begin an order.
              </span>
            </div>
          ) : (
            <div className="cart-items">
              {cart.map((item) => (
                <div
                  className="cart-item"
                  key={item.id}
                >
                  <div className="cart-item-info">
                    <strong>{item.name}</strong>

                    <span>
                      Rs.{" "}
                      {Number(item.price).toFixed(2)}
                    </span>
                  </div>

                  <div className="quantity-controls">
                    <button
                      onClick={() =>
                        decreaseQuantity(item.id)
                      }
                    >
                      −
                    </button>

                    <span>{item.quantity}</span>

                    <button
                      onClick={() =>
                        increaseQuantity(item.id)
                      }
                    >
                      +
                    </button>
                  </div>

                  <div className="cart-item-bottom">
                    <strong>
                      Rs.{" "}
                      {(
                        Number(item.price) *
                        item.quantity
                      ).toFixed(2)}
                    </strong>

                    <button
                      className="remove-button"
                      onClick={() =>
                        removeFromCart(item.id)
                      }
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="cart-summary">
            <div>
              <span>Total</span>

              <strong>
                Rs. {total.toFixed(2)}
              </strong>
            </div>

            <button
              className="checkout-button"
              disabled={
                cart.length === 0 || processing
              }
              onClick={handleCheckout}
            >
              {processing
                ? "Processing..."
                : "Checkout & Reserve Stock"}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default POS;