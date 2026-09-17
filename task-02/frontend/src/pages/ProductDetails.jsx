import {
  useEffect,
  useState,
} from "react";
import {
  Link,
  useParams,
} from "react-router-dom";

import api from "../api/axios";
import { useCart } from "../context/CartContext";


function ProductDetails() {
  const { productId } = useParams();

  const { addToCart } = useCart();

  const [product, setProduct] =
    useState(null);

  const [quantity, setQuantity] =
    useState(1);

  const [loading, setLoading] =
    useState(true);

  const [message, setMessage] =
    useState("");


  useEffect(() => {
    const loadProduct = async () => {
      try {
        setLoading(true);

        const response =
          await api.get(
            `/products/${productId}`
          );

        setProduct(response.data);
      } catch (error) {
        console.error(error);

        setMessage(
          "Unable to load product."
        );
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [productId]);


  const handleAddToCart = () => {
    if (!product) {
      return;
    }

    addToCart(
      product,
      Number(quantity)
    );

    setMessage(
      "Product added to cart."
    );
  };


  if (loading) {
    return <p>Loading product...</p>;
  }


  if (!product) {
    return (
      <section>
        <p>
          {message || "Product not found."}
        </p>

        <Link to="/">
          Back to Store
        </Link>
      </section>
    );
  }


  return (
    <section>
      <Link
        to="/"
        className="back-link"
      >
        ← Back to Store
      </Link>

      <div className="product-details">
        <div className="details-image">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
            />
          ) : (
            <span>
              {product.name
                .charAt(0)
                .toUpperCase()}
            </span>
          )}
        </div>

        <div className="details-content">
          <span className="category-badge">
            {product.category.name}
          </span>

          <h1>{product.name}</h1>

          <p className="details-description">
            {product.description}
          </p>

          <div className="details-price">
            LKR{" "}
            {Number(
              product.price
            ).toLocaleString()}
          </div>

          <p
            className={
              product.stock_quantity > 0
                ? "stock available"
                : "stock unavailable"
            }
          >
            {product.stock_quantity > 0
              ? `${product.stock_quantity} available`
              : "Out of stock"}
          </p>

          {product.stock_quantity > 0 && (
            <div className="add-cart-section">
              <div>
                <label htmlFor="quantity">
                  Quantity
                </label>

                <input
                  id="quantity"
                  type="number"
                  min="1"
                  max={
                    product.stock_quantity
                  }
                  value={quantity}
                  onChange={(event) =>
                    setQuantity(
                      Math.max(
                        1,
                        Math.min(
                          Number(
                            event.target.value
                          ),
                          product.stock_quantity
                        )
                      )
                    )
                  }
                />
              </div>

              <button
                type="button"
                className="primary-button"
                onClick={handleAddToCart}
              >
                Add to Cart
              </button>
            </div>
          )}

          {message && (
            <div className="success-message">
              {message}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}


export default ProductDetails;