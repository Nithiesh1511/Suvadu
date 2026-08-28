import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from '@/components/Layout'
import Home from '@/pages/Home'
import Collections from '@/pages/Collections'
import CollectionDetail from '@/pages/CollectionDetail'
import SpecialCollections from '@/pages/SpecialCollections'
import Accessories from '@/pages/Accessories'
import About from '@/pages/About'
import FAQ from '@/pages/FAQ'
import Cart from '@/pages/Cart'
import Checkout from '@/pages/Checkout'
import Account from '@/pages/Account'
import ResetPassword from '@/pages/ResetPassword'
import ProductDetail from '@/pages/ProductDetail'
import Policy from '@/pages/Policy'
import NotFound from '@/pages/NotFound'

// The admin panel is a separate concern from the storefront and is only reached
// by a handful of admin users. Lazy-load the whole thing so anonymous shoppers
// never download it in the main bundle.
const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout'))
const AdminDashboard = lazy(() => import('@/pages/admin/Dashboard'))
const AdminProducts = lazy(() => import('@/pages/admin/Products'))
const AdminProductForm = lazy(() => import('@/pages/admin/ProductForm'))
const AdminCollections = lazy(() => import('@/pages/admin/Collections'))
const AdminOrders = lazy(() => import('@/pages/admin/Orders'))
const AdminCoupons = lazy(() => import('@/pages/admin/Coupons'))
const AdminColours = lazy(() => import('@/pages/admin/Colours'))
const AdminBanners = lazy(() => import('@/pages/admin/Banners'))
const AdminFaqs = lazy(() => import('@/pages/admin/Faqs'))
const AdminReviews = lazy(() => import('@/pages/admin/Reviews'))
const AdminCustomers = lazy(() => import('@/pages/admin/Customers'))
const AdminLogs = lazy(() => import('@/pages/admin/Logs'))
const AdminContactRequests = lazy(() => import('@/pages/admin/ContactRequests'))

function AdminFallback() {
  return <div className="grid min-h-[40vh] place-items-center font-body text-sm text-muted-foreground">Loading…</div>
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="/collections" element={<Collections />} />
        <Route path="/collections/:slug" element={<CollectionDetail />} />
        <Route path="/special-collections" element={<SpecialCollections />} />
        <Route path="/special-collections/:slug" element={<CollectionDetail special />} />
        <Route path="/accessories" element={<Accessories />} />
        <Route path="/products/:slug" element={<ProductDetail />} />
        <Route path="/about" element={<About />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/account" element={<Account />} />
        <Route path="/account/wishlist" element={<Account tab="wishlist" />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          path="/admin"
          element={
            <Suspense fallback={<AdminFallback />}>
              <AdminLayout />
            </Suspense>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="products/new" element={<AdminProductForm />} />
          <Route path="products/:id/edit" element={<AdminProductForm />} />
          <Route path="collections" element={<AdminCollections />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="coupons" element={<AdminCoupons />} />
          <Route path="colours" element={<AdminColours />} />
          <Route path="banners" element={<AdminBanners />} />
          <Route path="faqs" element={<AdminFaqs />} />
          <Route path="reviews" element={<AdminReviews />} />
          <Route path="customers" element={<AdminCustomers />} />
          <Route path="logs" element={<AdminLogs />} />
          <Route path="contact-requests" element={<AdminContactRequests />} />
        </Route>
        <Route path="/privacy-policy" element={<Policy kind="privacy" />} />
        <Route path="/terms" element={<Policy kind="terms" />} />
        <Route path="/shipping-policy" element={<Policy kind="shipping" />} />
        <Route path="/refund-policy" element={<Policy kind="refund" />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
