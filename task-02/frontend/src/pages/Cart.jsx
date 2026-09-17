import { Link, useNavigate } from "react-router-dom";

import { useCart } from "../context/CartContext";


function Cart() {
  const navigate = useNavigate();

  const {
    cart,
    removeFromCart,
    updateQuantity,
    cartTotal,
  } = useCart();


  if (cart.length === 0) {
    return (
      <section>
        <div className="page-heading">
          <div>
            <h1>Your Cart</h1>
            <p>
              Review your selected products.
            </p>
          </div>
        </div>

        <div className="empty-state cart-empty">
          <h2>Your cart is empty</h2>

          <p>
            Add some products before checking out.
          </p>

          <Link
            to="/"
            className="primary-button cart-shop-button"
          >
            Continue Shopping
          </Link>
        </div>
      </section>
    );
  }


  return (
    <section>
      <div className="page-heading">
        <div>
          <h1>Your Cart</h1>

          <p>
            Review your selected products
            before checkout.
          </p>
        </div>
      </div>

      <div className="cart-layout">
        <div className="cart-items">
          {cart.map((item) => (
            <article
              className="cart-item"
              key={item.id}
            >
              <div className="cart-item-image">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.name}
                  />
                ) : (
                  <span>
                    {item.name
                      .charAt(0)
                      .toUpperCase()}
                  </span>
                )}
              </div>

              <div className="cart-item-info">
                <span className="category-badge">
                  {item.category?.name}
                </span>

                <h2>{item.name}</h2>

                <p>
                  LKR{" "}
                  {Number(
                    item.price
                  ).toLocaleString()}
                </p>

                <span className="cart-stock">
                  {item.stock_quantity} available
                </span>
              </div>

              <div className="quantity-control">
                <button
                  type="button"
                  onClick={() =>
                    updateQuantity(
                      item.id,
                      item.quantity - 1
                    )
                  }
                  disabled={
                    item.quantity <= 1
                  }
                >
                  −
                </button>

                <span>
                  {item.quantity}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    updateQuantity(
                      item.id,
                      item.quantity + 1
                    )
                  }
                  disabled={
                    item.quantity >=
                    item.stock_quantity
                  }
                >
                  +
                </button>
              </div>

              <div className="cart-item-total">
                LKR{" "}
                {(
                  Number(item.price) *
                  item.quantity
                ).toLocaleString()}
              </div>

              <button
                type="button"
                className="remove-button"
                onClick={() =>
                  removeFromCart(item.id)
                }
              >
                Remove
              </button>
            </article>
          ))}
        </div>

        <aside className="cart-summary">
          <h2>Order Summary</h2>

          <div className="summary-row">
            <span>Subtotal</span>

            <strong>
              LKR{" "}
              {cartTotal.toLocaleString()}
            </strong>
          </div>

          <div className="summary-divider" />

          <div className="summary-row summary-total">
            <span>Total</span>

            <strong>
              LKR{" "}
              {cartTotal.toLocaleString()}
            </strong>
          </div>

          <button
            type="button"
            className="primary-button checkout-button"
            onClick={() =>
              navigate("/checkout")
            }
          >
            Proceed to Checkout
          </button>

          <Link
            to="/"
            className="continue-shopping"
          >
            Continue Shopping
          </Link>
        </aside>
      </div>
    </section>
  );
}


export default Cart;