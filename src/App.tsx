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
import Admin from '@/pages/Admin'
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
        <Route path="/admin" element={<Admin />} />
        <Route path="/privacy-policy" element={<Policy kind="privacy" />} />
        <Route path="/terms" element={<Policy kind="terms" />} />
        <Route path="/shipping-policy" element={<Policy kind="shipping" />} />
        <Route path="/refund-policy" element={<Policy kind="refund" />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
