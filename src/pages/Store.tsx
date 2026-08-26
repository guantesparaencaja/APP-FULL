import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShoppingBag, Info, Package,
  Clock, CheckCircle2, X, Plus, Minus, Trash2, Edit2,
  AlertCircle, ShoppingCart, Upload, Loader2, Check,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { trackEvent } from '../lib/analytics';
import { useStore } from '../store/useStore';
import { Reveal } from '../components/Reveal';
import { PageHeader } from '../components/PageHeader';
import { staggerContainer, staggerItem, liftCard, spring } from '../lib/animations';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string;
  description: string;
  delivery_time: string;
  care_instructions?: string;
}

interface CartItem {
  product: Product;
  quantity: number;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function Store() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const user = useStore(state => state.user);

  // Admin state
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '', price: 0, delivery_time: '', image_url: '', description: '', care_instructions: ''
  });
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);

  // Checkout state: 'idle' | 'cart' | 'payment' | 'success'
  const [checkoutStep, setCheckoutStep] = useState<'idle' | 'payment' | 'success'>('idle');
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isAdmin = user?.role === 'admin' || user?.role === 'teacher';

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase.from('products').select('*');
      if (!error && data) setProducts(data as Product[]);
    } catch (err: any) {
      console.error('Error cargando productos:', err?.message);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('products').delete().eq('id', deleteTarget.id);
      if (error) {
        alert('No se pudo eliminar: ' + error.message);
        return;
      }
      setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setCart((prev) => prev.filter((item) => item.product.id !== deleteTarget.id));
    } catch (err: any) {
      alert('No se pudo eliminar: ' + (err?.message || 'error inesperado'));
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  // ── Load products ─────────────────────────────────────────────────────────
  useEffect(() => {
    loadProducts().finally(() => setLoading(false));
    const channel = supabase.channel('store-products')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, loadProducts)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // ── Cart helpers ──────────────────────────────────────────────────────────
  const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { product, quantity: 1 }];
    });
    setSelectedProduct(null);
    // Show cart briefly
    setShowCart(true);
    setTimeout(() => setShowCart(false), 2000);
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(i => i.product.id !== productId));
  };

  const updateQty = (productId: string, delta: number) => {
    setCart(prev => prev
      .map(i => i.product.id === productId ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i)
    );
  };

  // ── Place order ───────────────────────────────────────────────────────────
  const handlePlaceOrder = async () => {
    if (!user || cart.length === 0) return;
    if (!paymentFile) {
      setOrderError('Debes adjuntar el comprobante de pago.');
      return;
    }

    setIsSubmitting(true);
    setOrderError(null);

    try {
      // Subir comprobante a Supabase Storage (no base64)
      const safeName = paymentFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${user.id}/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(storagePath, paymentFile, { contentType: paymentFile.type, upsert: false });
      if (uploadError) throw uploadError;

      await supabase.from('orders').insert({
        user_id: user.id,
        user_name: user.name,
        user_email: user.email,
        items: cart.map(i => ({ productId: i.product.id, productName: i.product.name, price: i.product.price, quantity: i.quantity, subtotal: i.product.price * i.quantity })),
        total: cartTotal,
        status: 'pending',
        receipt_url: storagePath,
        receipt_filename: paymentFile.name,
        created_at: new Date().toISOString(),
      });

      setCheckoutStep('success');
      setCart([]);
      setPaymentFile(null);
      trackEvent('order_placed', { value: cartTotal, items: cart.length });
    } catch (e: any) {
      console.error('Error placing order:', e);
      setOrderError('No se pudo procesar el pedido. Inténtalo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Admin save product ─────────────────────────────────────────────────────
  const handleSaveProduct = async () => {
    if (!newProduct.name || !newProduct.price) {
      alert('Nombre y Precio son obligatorios');
      return;
    }
    setIsSaving(true);
    try {
      const payload = { ...newProduct };
      const { error } = editingProduct
        ? await supabase.from('products').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editingProduct.id)
        : await supabase.from('products').insert({ ...payload, created_at: new Date().toISOString() });
      if (error) throw new Error(error.message);
      setNewProduct({ name: '', price: 0, delivery_time: '', image_url: '', description: '', care_instructions: '' });
      setEditingProduct(null);
      await loadProducts();
    } catch (e: any) {
      alert('❌ No se pudo guardar: ' + (e?.message || 'sin permisos en Supabase'));
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-10 pb-32">
        <div className="skeleton h-12 w-64 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="skeleton aspect-4/5" />
              <div className="skeleton h-4 w-3/4" />
              <div className="skeleton h-4 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-32 relative">

      <PageHeader
        emoji="🥊"
        title="Tienda GPTE"
        subtitle="Equipamiento y accesorios exclusivos"
      />

      {/* ── Floating Cart Button ── */}
      <AnimatePresence>
        {cart.length > 0 && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={spring}
            onClick={() => setShowCart(true)}
            className="btn-press fixed bottom-24 right-4 z-50 flex items-center gap-2 bg-primary text-white px-4 py-3 rounded-2xl shadow-2xl shadow-primary/40 font-black text-sm"
            id="cart-float-btn"
          >
            <div className="relative">
              <ShoppingCart className="w-5 h-5" />
              <motion.span
                key={cartCount}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={spring}
                className="absolute -top-2 -right-2 min-w-5 h-5 px-1 bg-white text-primary text-[10px] font-black rounded-full flex items-center justify-center"
              >
                {cartCount}
              </motion.span>
            </div>
            <span>${cartTotal.toLocaleString()}</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Admin Toggle (sin opción de "Comprar" para admin) ── */}
      {isAdmin && (
        <div className="flex justify-center">
          <button
            onClick={() => setShowAdminPanel(!showAdminPanel)}
            className={`btn-press flex items-center gap-3 px-8 py-4 rounded-4xl font-black uppercase tracking-widest text-xs transition-all border-2 ${
              showAdminPanel
                ? 'bg-red-500/10 border-red-500/20 text-red-500'
                : 'bg-primary/10 border-primary/20 text-primary shadow-lg shadow-primary/10'
            }`}
          >
            <Edit2 className="w-4 h-4" />
            {showAdminPanel ? 'Cerrar Gestión' : 'Gestionar Inventario'}
          </button>
        </div>
      )}

      {/* ── Admin Panel ── */}
      <AnimatePresence>
        {showAdminPanel && isAdmin && (
          <motion.section
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="glass-card rounded-[3rem] p-8 border-primary/30 bg-primary/5">
              <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-6 flex items-center gap-4">
                <span className="p-3 bg-primary/20 rounded-2xl"><Plus className="w-6 h-6 text-primary" /></span>
                {editingProduct ? 'Editar Producto' : 'Nuevo Item en Stock'}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {[
                  { label: 'Nombre', key: 'name', type: 'text', placeholder: 'Ej: Vendajes Semi-elásticos' },
                  { label: 'Precio ($)', key: 'price', type: 'number', placeholder: '0' },
                  { label: 'Entrega', key: 'delivery_time', type: 'text', placeholder: 'Ej: Inmediata / 3-5 días' },
                  { label: 'URL de Imagen', key: 'image_url', type: 'text', placeholder: 'https://...' },
                ].map(({ label, key, type, placeholder }) => (
                  <div key={key}>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">{label}</label>
                    <input
                      type={type}
                      placeholder={placeholder}
                      value={(newProduct as any)[key] || ''}
                      onChange={e => setNewProduct({ ...newProduct, [key]: type === 'number' ? Number(e.target.value) : e.target.value })}
                      className="w-full bg-slate-900/50 border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-primary transition-all font-bold"
                    />
                  </div>
                ))}

                <div className="col-span-full">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Descripción</label>
                  <textarea
                    value={newProduct.description}
                    onChange={e => setNewProduct({ ...newProduct, description: e.target.value })}
                    className="w-full bg-slate-900/50 border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-primary transition-all h-24 resize-none font-bold"
                    placeholder="Detalles del producto..."
                  />
                </div>

                <div className="col-span-full">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Cuidados / Instrucciones (Opcional)</label>
                  <textarea
                    value={newProduct.care_instructions}
                    onChange={e => setNewProduct({ ...newProduct, care_instructions: e.target.value })}
                    className="w-full bg-slate-900/50 border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-primary transition-all h-20 resize-none font-bold"
                    placeholder="Lavado, uso, etc..."
                  />
                </div>
              </div>

              <button
                onClick={handleSaveProduct}
                disabled={isSaving}
                className="btn-press w-full mt-6 bg-primary text-white py-5 rounded-4xl font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/40 hover:scale-[1.01] transition-all disabled:opacity-50"
              >
                {isSaving ? 'Guardando...' : editingProduct ? 'Actualizar Item' : 'Publicar Item en la Store'}
              </button>
              {editingProduct && (
                <button
                  onClick={() => { setEditingProduct(null); setNewProduct({ name: '', price: 0, delivery_time: '', image_url: '', description: '', care_instructions: '' }); }}
                  className="btn-press w-full mt-3 text-slate-500 font-bold uppercase text-[10px] tracking-widest hover:text-white transition-colors"
                >
                  Cancelar Edición
                </button>
              )}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* ── Empty State (students only) ── */}
      {products.length === 0 && !isAdmin && (
        <Reveal className="flex flex-col items-center justify-center py-24 text-center">
          <div className="relative mb-8">
            <div className="w-32 h-32 rounded-full bg-linear-to-br from-primary/20 to-accent-purple/20 flex items-center justify-center border border-primary/20">
              <ShoppingBag className="w-14 h-14 text-primary/60" />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary flex items-center justify-center animate-bounce">
              <span className="text-white text-xs font-black">!</span>
            </div>
          </div>
          <span className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mb-3">Muy Pronto</span>
          <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white mb-4 leading-tight">
            Se vienen cosas<br />muy buenas 🔥
          </h2>
          <p className="text-slate-500 text-sm max-w-xs leading-relaxed">
            Guantes, vendajes, ropa y más. ¡Pronto disponible!
          </p>
        </Reveal>
      )}

      {/* ── Product Grid ── */}
      {products.length > 0 && (
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-40px' }}
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {products.map((product) => (
            <motion.div
              key={product.id}
              variants={staggerItem}
              {...liftCard}
              className="group relative"
            >
              <div
                className="glass-card rounded-[2.5rem] overflow-hidden border border-white/10 dark:border-slate-800/50 flex flex-col h-full transition-transform cursor-pointer active:scale-95"
                onClick={() => setSelectedProduct(product)}
              >
                {/* Image */}
                <div className="relative aspect-4/5 overflow-hidden">
                  <img
                    src={product.image_url || 'https://images.unsplash.com/photo-1549713486-82f8d386248a?q=80&w=600'}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1549713486-82f8d386248a?q=80&w=600'; }}
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-slate-950/80 via-transparent to-transparent" />

                  {/* Admin Actions */}
                  {showAdminPanel && isAdmin && (
                    <div className="absolute top-4 right-4 flex gap-2 z-10">
                      <button type="button" onClick={(e) => {
                        e.stopPropagation();
                        setEditingProduct(product);
                        setNewProduct({
                          name: product.name, price: product.price, delivery_time: product.delivery_time,
                          image_url: product.image_url, description: product.description,
                          care_instructions: product.care_instructions || ''
                        });
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }} className="btn-press p-3 bg-blue-500 text-white rounded-2xl shadow-xl">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button aria-label="Eliminar" type="button" onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(product);
                      }} className="btn-press p-3 bg-red-500 text-white rounded-2xl shadow-xl">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Delivery badge */}
                  <div className="absolute top-4 left-4 flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20">
                    <Clock className="w-3 h-3 text-white" />
                    <span className="text-[9px] font-black text-white uppercase tracking-widest">{product.delivery_time}</span>
                  </div>

                  {/* Price + Add to cart */}
                  <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                    <div>
                      <h3 className="text-lg font-black text-white uppercase italic tracking-tight mb-0.5">{product.name}</h3>
                      <p className="text-primary font-black text-xl tracking-tighter">${product.price?.toLocaleString()}</p>
                    </div>
                    {!isAdmin && (
                      <button aria-label="Agregar"
                        onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                        className="btn-press p-3 bg-primary text-white rounded-2xl shadow-xl shadow-primary/40 hover:bg-white hover:text-primary transition-colors"
                        id={`add-cart-${product.id}`}
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* ── Product Detail Modal ── */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedProduct(null)}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 40 }}
              transition={spring}
              className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-[3rem] overflow-hidden shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <button aria-label="Cerrar"
                onClick={() => setSelectedProduct(null)}
                className="btn-press absolute top-5 right-5 z-10 p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl hover:bg-primary hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="grid grid-cols-1 md:grid-cols-2">
                <div className="relative aspect-square md:aspect-auto min-h-[280px]">
                  <img
                    src={selectedProduct.image_url || 'https://images.unsplash.com/photo-1549713486-82f8d386248a?q=80&w=600'}
                    alt={selectedProduct.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1549713486-82f8d386248a?q=80&w=600'; }}
                  />
                </div>

                <div className="p-8 sm:p-10 flex flex-col justify-center">
                  <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-3 block">GPTE Exclusive Gear</span>
                  <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter mb-3">{selectedProduct.name}</h2>
                  <p className="text-3xl font-black text-primary mb-6 tracking-tighter">${selectedProduct.price?.toLocaleString()}</p>

                  <div className="space-y-4 mb-6">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl"><Package className="w-4 h-4 text-slate-500" /></div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Descripción</p>
                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{selectedProduct.description || 'Sin descripción.'}</p>
                      </div>
                    </div>
                    {selectedProduct.care_instructions && (
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl"><Info className="w-4 h-4 text-slate-500" /></div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Cuidados</p>
                          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{selectedProduct.care_instructions}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-emerald-500/10 rounded-xl"><Clock className="w-4 h-4 text-emerald-500" /></div>
                      <div>
                        <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-0.5">Entrega Estimada</p>
                        <p className="text-sm font-black text-slate-900 dark:text-white">{selectedProduct.delivery_time}</p>
                      </div>
                    </div>
                  </div>

                  {/* Add to cart button */}
                  {!isAdmin && (
                    <button
                      onClick={() => addToCart(selectedProduct)}
                      className="btn-press w-full bg-primary text-white py-5 rounded-3xl font-black uppercase tracking-widest shadow-2xl shadow-primary/30 flex items-center justify-center gap-3 hover:bg-primary/90 transition-all"
                      id="add-cart-modal"
                    >
                      <ShoppingCart className="w-5 h-5" />
                      Añadir al Carrito
                    </button>
                  )}

                  <p className="text-[9px] text-slate-500 mt-4 text-center font-bold uppercase tracking-widest">
                    El pago se coordina con administración.<br />Mismo método que tu mensualidad.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Cart Drawer ── */}
      <AnimatePresence>
        {showCart && (
          <div className="fixed inset-0 z-110 flex justify-end">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { setShowCart(false); setCheckoutStep('idle'); }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="relative w-full max-w-md bg-slate-950 border-l border-slate-800 h-full flex flex-col overflow-hidden shadow-2xl"
            >
              {/* Cart Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-3">
                  <ShoppingCart className="w-5 h-5 text-primary" />
                  <h3 className="font-black text-white text-lg uppercase tracking-tight">
                    Mi Carrito
                    <span className="ml-2 text-primary text-sm">({cartCount})</span>
                  </h3>
                </div>
                <button aria-label="Cerrar" type="button" onClick={() => { setShowCart(false); setCheckoutStep('idle'); }} className="btn-press p-2 bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* ── STEP: Cart Items ── */}
              {checkoutStep === 'idle' && (
                <>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {cart.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-600">
                        <ShoppingBag className="w-12 h-12" />
                        <p className="text-sm font-bold uppercase tracking-widest">Carrito vacío</p>
                      </div>
                    ) : (
                      cart.map(({ product, quantity }) => (
                        <div key={product.id} className="flex items-center gap-3 bg-slate-900 rounded-2xl p-3 border border-slate-800">
                          <img
                            src={product.image_url || 'https://images.unsplash.com/photo-1549713486-82f8d386248a?q=80&w=200'}
                            alt={product.name}
                            className="w-16 h-16 object-cover rounded-xl shrink-0"
                            onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1549713486-82f8d386248a?q=80&w=200'; }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-black text-white truncate">{product.name}</p>
                            <p className="text-primary font-black text-sm">${(product.price * quantity).toLocaleString()}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <button aria-label="Quitar" type="button" onClick={() => updateQty(product.id, -1)} className="btn-press w-7 h-7 bg-slate-800 rounded-lg flex items-center justify-center text-white hover:bg-primary transition-colors">
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-white font-black text-sm w-4 text-center">{quantity}</span>
                              <button aria-label="Agregar" type="button" onClick={() => updateQty(product.id, 1)} className="btn-press w-7 h-7 bg-slate-800 rounded-lg flex items-center justify-center text-white hover:bg-primary transition-colors">
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          <button aria-label="Eliminar" type="button" onClick={() => removeFromCart(product.id)} className="btn-press p-2 text-slate-600 hover:text-red-500 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {cart.length > 0 && (
                    <div className="p-5 border-t border-slate-800 shrink-0">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-slate-400 font-bold uppercase text-xs tracking-widest">Total</span>
                        <span className="text-2xl font-black text-primary">${cartTotal.toLocaleString()}</span>
                      </div>
                      <button
                        onClick={() => setCheckoutStep('payment')}
                        className="btn-press w-full bg-primary text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/30 hover:bg-primary/90 transition-all"
                        id="checkout-btn"
                      >
                        Confirmar Pedido
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* ── STEP: Payment (mismo flujo que Plans.tsx) ── */}
              {checkoutStep === 'payment' && (
                <>
                  <div className="flex-1 overflow-y-auto p-5 space-y-5">
                    {/* Order summary */}
                    <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Resumen del Pedido</p>
                      {cart.map(({ product, quantity }) => (
                        <div key={product.id} className="flex justify-between text-sm mb-2">
                          <span className="text-slate-300 font-bold">{product.name} x{quantity}</span>
                          <span className="text-white font-black">${(product.price * quantity).toLocaleString()}</span>
                        </div>
                      ))}
                      <div className="border-t border-slate-700 mt-3 pt-3 flex justify-between">
                        <span className="text-slate-300 font-black uppercase text-sm">Total</span>
                        <span className="text-primary font-black text-lg">${cartTotal.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Payment info */}
                    <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 text-center">
                      <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-2">Pago</p>
                      <p className="text-white font-bold text-sm">Nequi / Transferencia</p>
                      <p className="text-slate-400 text-xs mt-1">Mismo método que tu mensualidad</p>
                    </div>

                    {/* Upload receipt */}
                    <div>
                      <input type="file" accept="image/*" ref={fileInputRef} onChange={(e) => setPaymentFile(e.target.files?.[0] || null)} className="hidden" />
                      <button aria-label="Subir"
                        onClick={() => fileInputRef.current?.click()}
                        className={`btn-press w-full py-4 border-2 border-dashed rounded-2xl font-bold text-sm uppercase tracking-widest transition-all ${paymentFile ? 'border-primary text-primary bg-primary/5' : 'border-slate-700 text-slate-500 hover:border-primary hover:text-primary'}`}
                      >
                        <Upload className="w-5 h-5 mx-auto mb-1" />
                        {paymentFile ? paymentFile.name : 'Subir Comprobante'}
                      </button>
                    </div>

                    {orderError && (
                      <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold py-3 px-4 rounded-2xl">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {orderError}
                      </div>
                    )}
                  </div>

                  <div className="p-5 border-t border-slate-800 space-y-3 shrink-0">
                    <button
                      onClick={handlePlaceOrder}
                      disabled={isSubmitting || !paymentFile}
                      className="btn-press w-full bg-primary text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/30 flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                      id="place-order-btn"
                    >
                      {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                      {isSubmitting ? 'Procesando...' : 'Enviar Pedido'}
                    </button>
                    <button type="button" onClick={() => setCheckoutStep('idle')} className="btn-press w-full text-slate-500 font-bold uppercase text-xs tracking-widest hover:text-white transition-colors py-2">
                      ← Volver al Carrito
                    </button>
                  </div>
                </>
              )}

              {/* ── STEP: Success ── */}
              {checkoutStep === 'success' && (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                  <motion.div
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 12 }}
                    className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6 border border-emerald-500/30"
                  >
                    <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                  </motion.div>
                  <h3 className="text-2xl font-black text-white uppercase italic tracking-tight mb-3">¡Pedido Enviado!</h3>
                  <p className="text-slate-400 text-sm leading-relaxed mb-8">
                    El admin revisará tu comprobante y confirmará tu pedido pronto.
                  </p>
                  <button
                    onClick={() => { setShowCart(false); setCheckoutStep('idle'); }}
                    className="btn-press bg-primary text-white px-8 py-3 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/30"
                  >
                    Continuar
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Confirmar Eliminación (modal custom, no depende de window.confirm) ── */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-120 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => !isDeleting && setDeleteTarget(null)}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 40 }}
              transition={spring}
              className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2rem] p-8 text-center shadow-2xl"
            >
              <div className="w-16 h-16 mx-auto bg-red-500/15 rounded-full flex items-center justify-center mb-5 border border-red-500/30">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight mb-2">¿Eliminar producto?</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Se eliminará <span className="font-black">{deleteTarget.name}</span> de forma permanente.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  disabled={isDeleting}
                  className="btn-press flex-1 py-3 rounded-2xl font-black uppercase tracking-widest text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="btn-press flex-1 py-3 rounded-2xl font-black uppercase tracking-widest text-xs bg-red-500 text-white shadow-xl shadow-red-500/30 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  {isDeleting ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
