import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import api from "../api/axios";


function Storefront() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [availability, setAvailability] = useState("");

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");


  const loadCategories = async () => {
    try {
      const response = await api.get("/categories");
      setCategories(response.data);
    } catch (error) {
      console.error(error);
    }
  };


  const loadProducts = async () => {
    try {
      setLoading(true);
      setMessage("");

      const params = {};

      if (search.trim()) {
        params.search = search.trim();
      }

      if (categoryId) {
        params.category_id = categoryId;
      }

      if (minPrice) {
        params.min_price = minPrice;
      }

      if (maxPrice) {
        params.max_price = maxPrice;
      }

      if (availability === "in-stock") {
        params.in_stock = true;
      }

      if (availability === "out-of-stock") {
        params.in_stock = false;
      }

      const response = await api.get(
        "/products",
        { params }
      );

      setProducts(response.data);
    } catch (error) {
      console.error(error);

      setMessage(
        "Unable to load products."
      );
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    loadCategories();
    loadProducts();
  }, []);


  const handleFilter = (event) => {
    event.preventDefault();
    loadProducts();
  };


  const clearFilters = () => {
    setSearch("");
    setCategoryId("");
    setMinPrice("");
    setMaxPrice("");
    setAvailability("");

    setTimeout(() => {
      loadProducts();
    }, 0);
  };


  return (
    <section>
      <div className="page-heading">
        <div>
          <h1>Shop Products</h1>

          <p>
            Find the products you need.
          </p>
        </div>
      </div>

      <form
        className="filters"
        onSubmit={handleFilter}
      >
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
        />

        <select
          value={categoryId}
          onChange={(event) =>
            setCategoryId(event.target.value)
          }
        >
          <option value="">
            All categories
          </option>

          {categories.map((category) => (
            <option
              key={category.id}
              value={category.id}
            >
              {category.name}
            </option>
          ))}
        </select>

        <input
          type="number"
          placeholder="Min price"
          min="0"
          value={minPrice}
          onChange={(event) =>
            setMinPrice(event.target.value)
          }
        />

        <input
          type="number"
          placeholder="Max price"
          min="0"
          value={maxPrice}
          onChange={(event) =>
            setMaxPrice(event.target.value)
          }
        />

        <select
          value={availability}
          onChange={(event) =>
            setAvailability(
              event.target.value
            )
          }
        >
          <option value="">
            Any availability
          </option>

          <option value="in-stock">
            In stock
          </option>

          <option value="out-of-stock">
            Out of stock
          </option>
        </select>

        <button
          type="submit"
          className="primary-button"
        >
          Apply Filters
        </button>

        <button
          type="button"
          className="secondary-button"
          onClick={clearFilters}
        >
          Clear
        </button>
      </form>

      {message && (
        <div className="message">
          {message}
        </div>
      )}

      {loading ? (
        <p>Loading products...</p>
      ) : products.length === 0 ? (
        <div className="empty-state">
          No products match your filters.
        </div>
      ) : (
        <>
          <p className="result-count">
            {products.length} product
            {products.length !== 1 && "s"} found
          </p>

          <div className="product-grid">
            {products.map((product) => (
              <article
                className="product-card"
                key={product.id}
              >
                <div className="product-image">
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

                <div className="product-card-content">
                  <span className="category-badge">
                    {product.category.name}
                  </span>

                  <h2>{product.name}</h2>

                  <p className="product-description">
                    {product.description}
                  </p>

                  <div className="product-meta">
                    <strong>
                      LKR{" "}
                      {Number(
                        product.price
                      ).toLocaleString()}
                    </strong>

                    <span
                      className={
                        product.stock_quantity > 0
                          ? "stock available"
                          : "stock unavailable"
                      }
                    >
                      {product.stock_quantity > 0
                        ? `${product.stock_quantity} in stock`
                        : "Out of stock"}
                    </span>
                  </div>

                  <Link
                    to={`/products/${product.id}`}
                    className="view-button"
                  >
                    View Product
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

export default Storefront;