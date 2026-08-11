import { NavLink, Outlet } from 'react-router-dom';

export default function Layout() {
  return (
    <div className="app-shell">
      <header className="site-header">
        <NavLink to="/products" className="brand">
          Panda Market
        </NavLink>
        <nav className="site-nav" aria-label="main navigation">
          <NavLink to="/products">상품</NavLink>
          <NavLink to="/articles">게시판</NavLink>
          <NavLink to="/login">로그인</NavLink>
        </nav>
      </header>
      <main className="page-shell">
        <Outlet />
      </main>
    </div>
  );
}
