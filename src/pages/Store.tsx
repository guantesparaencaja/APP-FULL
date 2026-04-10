import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, 
  ExternalLink, 
  ChevronRight, 
  Info, 
  Package, 
  Clock, 
  CheckCircle2,
  X,
  Plus
} from 'lucide-react';
import { 
  collection, 
  onSnapshot, 
  query, 
  addDoc, 
  serverTimestamp, 
  deleteDoc, 
  doc,
  updateDoc 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useStore } from '../store/useStore';
import { Trash2, Edit2, AlertCircle } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string;
  description: string;
  delivery_time: string;
  care_instructions?: string;
}

export function Store() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [orderStatus, setOrderStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const user = useStore(state => state.user);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: 0,
    delivery_time: '',
    image_url: '',
    description: '',
    care_instructions: ''
  });
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'products'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const prods = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];
      setProducts(prods);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleOrder = async (product: Product) => {
    if (!user) return;
    setOrderStatus('loading');
    
    try {
      await addDoc(collection(db, 'orders'), {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        productId: product.id,
        productName: product.name,
        price: product.price,
        status: 'pending',
        created_at: serverTimestamp()
      });
      
      // Notify Admin (optional, handled by Firestore trigger or Admin Panel)
      setOrderStatus('success');
      setTimeout(() => {
        setOrderStatus('idle');
        setSelectedProduct(null);
      }, 3000);
    } catch (e) {
      console.error('Error placing order:', e);
      setOrderStatus('idle');
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-20">
      {/* Admin Toggle */}
      {(user?.role === 'admin' || user?.role === 'teacher') && (
        <div className="flex justify-center">
          <button
            onClick={() => setShowAdminPanel(!showAdminPanel)}
            className={`flex items-center gap-3 px-8 py-4 rounded-4xl font-black uppercase tracking-widest text-xs transition-all border-2 ${
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

      {/* Admin Panel */}
      <AnimatePresence>
        {showAdminPanel && (user?.role === 'admin' || user?.role === 'teacher') && (
          <motion.section
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="glass-card rounded-[3rem] p-10 border-primary/30 bg-primary/5">
              <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-8 flex items-center gap-4">
                <span className="p-3 bg-primary/20 rounded-2xl"><Plus className="w-6 h-6 text-primary" /></span>
                Nuevo Item en Stock
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-2">Nombre del Producto</label>
                    <input 
                      type="text" 
                      placeholder="Ej: Vendajes Semi-elásticos" 
                      value={newProduct.name}
                      onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                      className="w-full bg-slate-900/50 border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-primary transition-all font-bold" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-2">Precio ($)</label>
                    <input 
                      type="number" 
                      placeholder="0" 
                      value={newProduct.price || ''}
                      onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})}
                      className="w-full bg-slate-900/50 border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-primary transition-all font-bold" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-2">Tiempo de Entrega</label>
                    <input 
                      type="text" 
                      placeholder="Ej: Inmediata / 3-5 días" 
                      value={newProduct.delivery_time}
                      onChange={e => setNewProduct({...newProduct, delivery_time: e.target.value})}
                      className="w-full bg-slate-900/50 border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-primary transition-all font-bold" 
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-2">URL de Imagen</label>
                    <input 
                      type="text" 
                      placeholder="https://..." 
                      value={newProduct.image_url}
                      onChange={e => setNewProduct({...newProduct, image_url: e.target.value})}
                      className="w-full bg-slate-900/50 border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-primary transition-all font-bold" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-2">Descripción</label>
                    <textarea 
                      placeholder="Detalles sobre el producto..." 
                      value={newProduct.description}
                      onChange={e => setNewProduct({...newProduct, description: e.target.value})}
                      className="w-full bg-slate-900/50 border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-primary transition-all h-[152px] resize-none font-bold"
                    />
                  </div>
                </div>

                <div className="col-span-full">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-2">Cuidados / Instrucciones (Opcional)</label>
                  <textarea 
                    placeholder="Lavado, uso, etc..." 
                    value={newProduct.care_instructions}
                    onChange={e => setNewProduct({...newProduct, care_instructions: e.target.value})}
                    className="w-full bg-slate-900/50 border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-primary transition-all h-24 resize-none font-bold"
                  />
                </div>
              </div>

              <button 
                onClick={async () => {
                  if(!newProduct.name || !newProduct.price) return alert('Nombre y Precio son obligatorios');
                  setIsSaving(true);
                  try {
                    if (editingProduct) {
                      await updateDoc(doc(db, 'products', editingProduct.id), {
                        ...newProduct,
                        updated_at: serverTimestamp()
                      });
                      alert('✅ Producto actualizado correctamente');
                    } else {
                      await addDoc(collection(db, 'products'), {
                        ...newProduct,
                        created_at: serverTimestamp()
                      });
                      alert('✅ Producto publicado correctamente');
                    }
                    setNewProduct({ name: '', price: 0, delivery_time: '', image_url: '', description: '', care_instructions: '' });
                    setEditingProduct(null);
                  } catch(e) {
                    console.error(e);
                    alert('❌ Error al guardar');
                  } finally {
                    setIsSaving(false);
                  }
                }}
                disabled={isSaving}
                className="w-full mt-8 bg-primary text-white py-6 rounded-4xl font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/40 hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50"
              >
                {isSaving ? 'Guardando...' : editingProduct ? 'Actualizar Item' : 'Publicar Item en la Store'}
              </button>
              {editingProduct && (
                <button 
                  onClick={() => {
                    setEditingProduct(null);
                    setNewProduct({ name: '', price: 0, delivery_time: '', image_url: '', description: '', care_instructions: '' });
                  }}
                  className="w-full mt-4 text-slate-500 font-bold uppercase text-[10px] tracking-widest hover:text-white transition-colors"
                >
                  Cancelar Edición
                </button>
              )}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* ── Empty state para estudiantes ── */}
      {products.length === 0 && !loading && (user?.role !== 'admin' && user?.role !== 'teacher') && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-24 text-center"
        >
          <div className="relative mb-8">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center border border-primary/20">
              <ShoppingBag className="w-14 h-14 text-primary/60" />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary flex items-center justify-center animate-bounce">
              <span className="text-white text-xs font-black">!</span>
            </div>
          </div>
          <span className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mb-3">Muy Pronto</span>
          <h2 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white mb-4 leading-tight">
            Se vienen cosas<br />muy buenas 🔥
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs leading-relaxed">
            Estamos preparando productos exclusivos GPTE para ti. Guantes, vendajes, ropa y más. ¡Pronto disponible!
          </p>
          <div className="mt-8 flex gap-3">
            {['🥊 Guantes','🩱 Ropa GPTE','🖤 Vendajes'].map((item) => (
              <span key={item} className="px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-2xl text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest border border-slate-200 dark:border-slate-700">
                {item}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {/* Product Grid */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
      >
        {products.map((product) => (
          <motion.div
            key={product.id}
            variants={itemVariants}
            whileHover={{ y: -10 }}
            className="group relative"
          >
            <div className="glass-card rounded-[2.5rem] overflow-hidden border border-white/10 dark:border-slate-800/50 flex flex-col h-full active:scale-95 transition-transform cursor-pointer"
                 onClick={() => setSelectedProduct(product)}
            >
              {/* Image Container */}
              <div className="relative aspect-4/5 overflow-hidden">
                <img 
                  src={product.image_url || 'https://images.unsplash.com/photo-1549713486-82f8d386248a?q=80&w=600'} 
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-linear-to-t from-slate-950/80 via-transparent to-transparent" />
                
                  {/* Admin Actions */}
                  {showAdminPanel && (user?.role === 'admin' || user?.role === 'teacher') && (
                    <div className="absolute top-6 right-6 flex gap-2 z-10">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingProduct(product);
                          setNewProduct({
                            name: product.name,
                            price: product.price,
                            delivery_time: product.delivery_time,
                            image_url: product.image_url,
                            description: product.description,
                            care_instructions: product.care_instructions || ''
                          });
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="p-3 bg-blue-500 text-white rounded-2xl shadow-xl shadow-blue-500/30 hover:bg-blue-600 transition-colors"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if(confirm('¿Eliminar este producto permanentemente?')) {
                            deleteDoc(doc(db, 'products', product.id));
                          }
                        }}
                        className="p-3 bg-red-500 text-white rounded-2xl shadow-xl shadow-red-500/30 hover:bg-red-600 transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  )}

                  <div className="absolute top-6 left-6 flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20">
                  <Clock className="w-3.5 h-3.5 text-white" />
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">
                    {product.delivery_time}
                  </span>
                </div>

                {/* Price Tag */}
                <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
                  <div>
                    <h3 className="text-xl font-black text-white uppercase italic tracking-tight mb-1">
                      {product.name}
                    </h3>
                    <p className="text-primary font-black text-2xl tracking-tighter">
                      ${product.price?.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 bg-primary text-white rounded-2xl shadow-xl shadow-primary/40 group-hover:bg-white group-hover:text-primary transition-colors">
                    <Plus className="w-6 h-6" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Product Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProduct(null)}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 50 }}
              className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-[3rem] overflow-hidden shadow-2xl overflow-y-auto max-h-[90vh] hide-scrollbar"
            >
              <button 
                onClick={() => setSelectedProduct(null)}
                className="absolute top-6 right-6 z-10 p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl hover:bg-primary hover:text-white transition-all"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="grid grid-cols-1 md:grid-cols-2">
                {/* Left: Image */}
                <div className="relative aspect-square md:aspect-auto">
                  <img 
                    src={selectedProduct.image_url} 
                    alt={selectedProduct.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Right: Info */}
                <div className="p-10 flex flex-col justify-center">
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-4 block">
                      GPTE Exclusive Gear
                    </span>
                    <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter mb-4">
                      {selectedProduct.name}
                    </h2>
                    <p className="text-3xl font-black text-primary mb-8 tracking-tighter">
                      ${selectedProduct.price?.toLocaleString()}
                    </p>

                    <div className="space-y-6">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                          <Package className="w-5 h-5 text-slate-500" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Descripción</p>
                          <p className="text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                            {selectedProduct.description || 'Sin descripción disponible.'}
                          </p>
                        </div>
                      </div>

                      {selectedProduct.care_instructions && (
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                            <Info className="w-5 h-5 text-slate-500" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cuidados</p>
                            <p className="text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                              {selectedProduct.care_instructions}
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-start gap-4 pb-8">
                        <div className="p-3 bg-emerald-500/10 rounded-2xl">
                          <Clock className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Entrega Estimada</p>
                          <p className="text-sm font-black text-slate-900 dark:text-white">
                            {selectedProduct.delivery_time}
                          </p>
                        </div>
                      </div>
                    </div>

                    {orderStatus === 'success' ? (
                      <motion.div 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="w-full bg-emerald-500 text-white py-6 rounded-3xl flex items-center justify-center gap-4 font-black uppercase tracking-widest"
                      >
                        <CheckCircle2 className="w-6 h-6" />
                        ¡Solicitud Enviada!
                      </motion.div>
                    ) : (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={orderStatus === 'loading'}
                        onClick={() => handleOrder(selectedProduct)}
                        className="w-full bg-primary text-white py-6 rounded-3xl font-black uppercase tracking-widest shadow-2xl shadow-primary/30 flex items-center justify-center gap-4 hover:bg-primary-dark transition-all"
                      >
                        {orderStatus === 'loading' ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <ShoppingBag className="w-6 h-6" />
                            Pedir Ahora
                          </>
                        )}
                      </motion.button>
                    )}
                    
                    <p className="text-[10px] text-slate-500 mt-6 text-center font-bold uppercase tracking-widest">
                      El pago se coordina con administración. <br/>
                      Mismo método que tu mensualidad.
                    </p>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
