import { Routes, Route } from 'react-router-dom'
import Layout from '@/components/Layout'
import Home from '@/pages/Home'
import Collections from '@/pages/Collections'
import CollectionDetail from '@/pages/CollectionDetail'
import SpecialCollections from '@/pages/SpecialCollections'
import Accessories from '@/pages/Accessories'
import About from '@/pages/About'
import Contact from '@/pages/Contact'
import FAQ from '@/pages/FAQ'
import Cart from '@/pages/Cart'
import Checkout from '@/pages/Checkout'
import Account from '@/pages/Account'
import ProductDetail from '@/pages/ProductDetail'
import Policy from '@/pages/Policy'
import AdminLayout from '@/pages/admin/AdminLayout'
import AdminDashboard from '@/pages/admin/Dashboard'
import AdminProducts from '@/pages/admin/Products'
import AdminProductForm from '@/pages/admin/ProductForm'
import AdminCollections from '@/pages/admin/Collections'
import AdminOrders from '@/pages/admin/Orders'
import AdminCoupons from '@/pages/admin/Coupons'
import AdminColours from '@/pages/admin/Colours'
import AdminBanners from '@/pages/admin/Banners'
import AdminFaqs from '@/pages/admin/Faqs'
import AdminReviews from '@/pages/admin/Reviews'
import AdminCustomers from '@/pages/admin/Customers'
import AdminLogs from '@/pages/admin/Logs'
import AdminContactRequests from '@/pages/admin/ContactRequests'
import NotFound from '@/pages/NotFound'

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
        <Route path="/contact" element={<Contact />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/account" element={<Account />} />
        <Route path="/account/wishlist" element={<Account tab="wishlist" />} />
        <Route path="/admin" element={<AdminLayout />}>
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
