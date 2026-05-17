import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { AdminLayout } from './components/layout/AdminLayout'
import { HomePage } from './pages/HomePage'
import { CatalogPage } from './pages/CatalogPage'
import { ProductPage } from './pages/ProductPage'
import { CartPage } from './pages/CartPage'
import { CheckoutPage } from './pages/CheckoutPage'
import { AdminPage } from './pages/AdminPage'
import { AdminDashboardPage } from './pages/AdminDashboardPage'
import { AdminOrdersPage } from './pages/AdminOrdersPage'
import { AdminCouponsPage } from './pages/AdminCouponsPage'
import { AdminSettingsPage } from './pages/AdminSettingsPage'
import { AdminLeaguesPage } from './pages/AdminLeaguesPage'
import { AdminProtectedRoute } from './components/layout/AdminProtectedRoute'

function App() {
  return (
    <Router>
      <Routes>
        {/* Loja (Público) */}
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/produtos" element={<CatalogPage />} />
          <Route path="/produtos/:id" element={<ProductPage />} />
          <Route path="/carrinho" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
        </Route>

        {/* Admin (Protegido) */}
        <Route path="/admin" element={<AdminProtectedRoute />}>
          <Route element={<AdminLayout />}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="produtos" element={<AdminPage />} />
            <Route path="pedidos" element={<AdminOrdersPage />} />
            <Route path="cupons" element={<AdminCouponsPage />} />
            <Route path="ligas" element={<AdminLeaguesPage />} />
            <Route path="configuracoes" element={<AdminSettingsPage />} />
          </Route>
        </Route>
      </Routes>
    </Router>
  )
}

export default App
