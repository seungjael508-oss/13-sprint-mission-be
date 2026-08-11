import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import ArticleDetailPage from './pages/ArticleDetailPage.jsx';
import ArticleFormPage from './pages/ArticleFormPage.jsx';
import ArticleListPage from './pages/ArticleListPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import ProductDetailPage from './pages/ProductDetailPage.jsx';
import ProductFormPage from './pages/ProductFormPage.jsx';
import ProductListPage from './pages/ProductListPage.jsx';
import SignupPage from './pages/SignupPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/products" replace />} />
        <Route path="products" element={<ProductListPage />} />
        <Route path="products/new" element={<ProductFormPage />} />
        <Route path="products/:productId" element={<ProductDetailPage />} />
        <Route path="articles" element={<ArticleListPage />} />
        <Route path="articles/new" element={<ArticleFormPage />} />
        <Route path="articles/:articleId" element={<ArticleDetailPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="signup" element={<SignupPage />} />
      </Route>
    </Routes>
  );
}
