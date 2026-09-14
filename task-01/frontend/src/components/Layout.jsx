import { NavLink, Outlet } from "react-router-dom";

function Layout() {
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <h2>Techloom POS</h2>

        <nav>
          <NavLink to="/">Dashboard</NavLink>
          <NavLink to="/products">Products</NavLink>
          <NavLink to="/pos">POS</NavLink>
          <NavLink to="/orders">Orders</NavLink>
        </nav>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;