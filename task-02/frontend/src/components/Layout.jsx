import { Link, NavLink, Outlet } from "react-router-dom";
import { useCart } from "../context/CartContext";

function Layout() {
    const { cartCount } = useCart();
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/" className="brand">
          Techloom Store
        </Link>

        <nav className="nav-links">
          <NavLink to="/">
            Store
          </NavLink>

          <NavLink to="/cart">
            Cart ({cartCount})
            </NavLink>

          <NavLink to="/orders">
            Orders
          </NavLink>
        </nav>
      </header>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;