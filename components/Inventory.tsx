
import React, { useState, useEffect, useRef } from 'react';
import { Search, Eye, X, Save, PlusCircle, Loader2, Package, MapPin, Tag, Box, ArrowUpCircle, ArrowDownCircle, History, ClipboardList, User, ArrowRight, ImageIcon, Printer, Download, Filter, AlertTriangle, ChevronDown, Plus, Trash2, Settings2, Upload, Camera, Edit2, Users, Building2 } from 'lucide-react';
import { MOCK_INVENTORY, MOCK_MOVEMENTS } from '../constants';
import { InventoryItem, User as UserType, Movement, QuotationItem, Institution } from '../types';
import { supabase, isSupabaseConfigured } from '../supabase';

interface InventoryProps {
  user: UserType;
  onNewRequestFromInventory?: (item: string) => void;
}

const Inventory: React.FC<InventoryProps> = ({ user, onNewRequestFromInventory }) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<string[]>(['Geral', 'Kits', 'Brindes', 'Papelaria', 'Têxtil', 'Tecnologia']);
  const [clientsList, setClientsList] = useState<any[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [stockStatus, setStockStatus] = useState<'Todos' | 'Baixo Saldo'>('Todos');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [skuError, setSkuError] = useState<string | null>(null);
  
  const [tempEditFields, setTempEditFields] = useState({ area: '', location: '', clientName: '', company: '', category: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [movements, setMovements] = useState<any[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [newMovement, setNewMovement] = useState({
    type: 'entrada',
    quantity: 1,
    observations: '',
    job_id: ''
  });

  const [newItem, setNewItem] = useState({
    sku: '',
    description: '',
    total_quantity: 0,
    image_url: '',
    category: 'Geral',
    company: '',
    client_name: '', 
    area: '',
    location: 'Estoque Geral'
  });

  const isBackoffice = user.role === 'backoffice';

  const fetchInstitutions = async () => {
    if (!isSupabaseConfigured()) return;
    try {
      const { data, error } = await supabase.from('institutions').select('*').order('name');
      if (!error) setInstitutions(data || []);
    } catch (err) {
      console.error("Erro ao buscar instituições:", err);
    }
  };

  const fetchClients = async () => {
    if (!isSupabaseConfigured()) return;
    try {
      const { data, error } = await supabase
        .from('members')
        .select('name, company, role')
        .order('name');
      if (!error) setClientsList(data || []);
    } catch (err) {
      console.error("Erro ao buscar lista de responsáveis:", err);
    }
  };

  const handleUpdateDetails = async () => {
    if (!selectedItem) return;
    setIsSaving(true);
    try {
      if (isSupabaseConfigured()) {
        const { error: updateError } = await supabase
          .from('inventory')
          .update({ 
            area: tempEditFields.area, 
            location: tempEditFields.location,
            client_name: tempEditFields.clientName,
            company: tempEditFields.company,
            category: tempEditFields.category
          })
          .eq('id', selectedItem.id);

        if (updateError) throw updateError;

        await supabase.from('movements').insert([{
          item_id: selectedItem.id,
          responsible: user.name,
          quantity_change: 0,
          type: 'ajuste',
          observations: `Ajuste de Cadastro: [Responsável: ${tempEditFields.clientName} | Unidade: ${tempEditFields.company}]`
        }]);

        setSelectedItem({ 
          ...selectedItem, 
          area: tempEditFields.area, 
          location: tempEditFields.location,
          clientName: tempEditFields.clientName,
          company: tempEditFields.company,
          category: tempEditFields.category
        });

        setIsEditingDetails(false);
        await fetchInventory(); 
        alert('Informações atualizadas com sucesso!');
      }
    } catch (err: any) {
      alert('Erro ao atualizar: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const fetchInventory = async () => {
    setLoading(true);
    if (!isSupabaseConfigured()) {
      setItems(MOCK_INVENTORY);
      setLoading(false);
      return;
    }

    try {
      let query = supabase.from('inventory').select('*');
      if (!isBackoffice) {
        query = query.eq('company', user.company);
      }
      const { data, error } = await query.order('description');
      if (error) throw error;

      const mappedData: InventoryItem[] = (data || []).map((dbItem: any) => ({
        id: dbItem.id,
        sku: dbItem.sku,
        description: dbItem.description,
        totalQuantity: dbItem.total_quantity || 0,
        category: dbItem.category || 'Geral',
        imageUrl: dbItem.image_url || 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?q=80&w=200&auto=format&fit=crop',
        company: dbItem.company,
        area: dbItem.area || 'N/A',
        location: dbItem.location || 'Estoque Geral',
        clientName: dbItem.client_name || 'Não informado', 
        clientId: '1',
        supplier: dbItem.supplier || 'N/A',
        job: dbItem.job || 'N/A',
        qrCode: '',
        boxes: 0,
        generatePdf: false,
        weightUnitG: 0,
        dimensions: { width: 0, height: 0, depth: 0 }
      }));
      setItems(mappedData);
    } catch (err) {
      console.error('Erro ao buscar estoque:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMovements = async (itemId: string) => {
    setLoadingMovements(true);
    if (!isSupabaseConfigured()) {
      setMovements(MOCK_MOVEMENTS.filter(m => m.itemId === itemId));
      setLoadingMovements(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('movements')
        .select('*')
        .eq('item_id', itemId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setMovements(data || []);
    } catch (err) {
      console.error('Erro ao buscar movimentações:', err);
    } finally {
      setLoadingMovements(false);
    }
  };

  const handleSaveNewItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setSkuError(null);
    const skuClean = newItem.sku.trim().toUpperCase();
    
    if (items.some(item => item.sku === skuClean)) {
      setSkuError(`O SKU "${skuClean}" já existe.`);
      return;
    }

    setIsSaving(true);
    try {
      if (isSupabaseConfigured()) {
        const generatedId = crypto.randomUUID();
        const { error } = await supabase.from('inventory').insert([{
          id: generatedId,
          sku: skuClean,
          description: newItem.description,
          total_quantity: newItem.total_quantity,
          category: newItem.category,
          image_url: newItem.image_url,
          company: newItem.company,
          client_name: newItem.client_name,
          area: newItem.area,
          location: newItem.location
        }]);
        
        if (error) throw error;
        
        setIsAddModalOpen(false);
        setImagePreview(null);
        fetchInventory();
        alert('Item cadastrado com sucesso!');
      }
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    const qtyChange = newMovement.type === 'entrada' ? newMovement.quantity : -newMovement.quantity;
    setIsSaving(true);
    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase.from('movements').insert([{
          item_id: selectedItem.id,
          responsible: user.name,
          quantity_change: qtyChange,
          type: newMovement.type,
          observations: newMovement.observations
        }]);
        if (error) throw error;
        setIsMovementModalOpen(false);
        setNewMovement({ type: 'entrada', quantity: 1, observations: '', job_id: '' });
        fetchInventory();
        fetchMovements(selectedItem.id);
      }
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredItems = items.filter(item => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = (item.description || '').toLowerCase().includes(term) || 
                         (item.sku || '').toLowerCase().includes(term) ||
                         (item.clientName || '').toLowerCase().includes(term) ||
                         (item.company || '').toLowerCase().includes(term);
    const matchesCategory = selectedCategory === 'Todas' || item.category === selectedCategory;
    const matchesStock = stockStatus === 'Todos' || item.totalQuantity < 20;
    return matchesSearch && matchesCategory && matchesStock;
  });

  useEffect(() => {
    fetchInventory();
    fetchClients();
    fetchInstitutions();
  }, [user]);

  useEffect(() => {
    if (selectedItem) {
      fetchMovements(selectedItem.id);
      setTempEditFields({ 
        area: selectedItem.area || '', 
        location: selectedItem.location || '',
        clientName: selectedItem.clientName || '',
        company: selectedItem.company || '',
        category: selectedItem.category || 'Geral'
      });
    }
  }, [selectedItem]);

  const inputClass = "w-full px-5 py-4 bg-white border border-gray-300 rounded-2xl text-base font-bold text-gray-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 outline-none transition-all shadow-sm";
  const labelClass = "block text-[10px] font-black text-gray-500 mb-2 uppercase tracking-widest";

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Filtros e Busca */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar por item, SKU ou cliente..." 
              className="w-full pl-14 pr-6 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold text-gray-800 focus:outline-none focus:ring-4 focus:ring-orange-500/10 shadow-inner transition-all"
            />
          </div>
          <div className="flex gap-2">
            {isBackoffice && (
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 px-8 py-4 text-white font-black rounded-2xl shadow-lg bg-[#004481] text-[10px] uppercase tracking-widest hover:bg-blue-900 transition-all"
              >
                <PlusCircle size={18} /> Novo Item
              </button>
            )}
            <button onClick={fetchInventory} className="p-4 bg-gray-50 text-gray-400 rounded-2xl hover:text-orange-600 transition-colors shadow-sm">
              <Loader2 size={20} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Filtro de Categorias */}
        <div className="flex flex-wrap items-center gap-3 border-t border-gray-50 pt-6">
           <div className="flex items-center gap-2 text-gray-400 mr-2">
             <Filter size={14} />
             <span className="text-[10px] font-black uppercase tracking-widest">Filtrar Categoria:</span>
           </div>
           <button 
             onClick={() => setSelectedCategory('Todas')} 
             className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${selectedCategory === 'Todas' ? 'bg-[#004481] text-white shadow-lg' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
           >
             Todas
           </button>
           {categories.map(cat => (
             <button 
               key={cat} 
               onClick={() => setSelectedCategory(cat)} 
               className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${selectedCategory === cat ? 'bg-[#004481] text-white shadow-lg' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
             >
               {cat}
             </button>
           ))}
        </div>
      </div>

      {/* Tabela Principal */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden relative min-h-[500px]">
        {loading && <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={32} /></div>}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white border-b border-gray-100">
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">SKU</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Saldo</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Foto</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Item / Unidade</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Categoria</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-orange-600">Responsável</th>
                <th className="px-8 py-6"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-8 py-5"><span className="font-mono px-3 py-1 bg-gray-900 text-white rounded-lg text-[9px] font-black uppercase tracking-widest">{item.sku}</span></td>
                  <td className="px-8 py-5 text-base font-black text-gray-900">{item.totalQuantity.toLocaleString()}</td>
                  <td className="px-8 py-5">
                    <div className="w-12 h-12 rounded-xl border border-gray-100 overflow-hidden bg-gray-50 shadow-sm">
                      {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover" /> : <Box size={20} className="text-gray-200 m-auto mt-3" />}
                    </div>
                  </td>
                  <td className="px-8 py-5">
                     <div className="text-sm font-black text-gray-800">{item.description}</div>
                     <div className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">{item.company}</div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="px-3 py-1 bg-gray-100 text-gray-500 text-[9px] font-black rounded-lg uppercase tracking-widest">{item.category}</span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-orange-600">
                      <User size={14} />
                      {item.clientName}
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <button onClick={() => setSelectedItem(item)} className="p-3 text-gray-300 hover:text-orange-500 transition-all"><Eye size={22} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Adicionar Novo Item */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-5xl max-h-[90vh] shadow-2xl overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-[210] shadow-sm">
              <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">Novo SKU no Estoque</h3>
              <button onClick={() => { setIsAddModalOpen(false); setImagePreview(null); }} className="p-3 hover:bg-red-50 hover:text-red-600 rounded-full text-gray-400 transition-colors"><X size={32} /></button>
            </div>
            
            <form onSubmit={handleSaveNewItem} className="p-10 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div><label className={labelClass}>SKU Oficial</label><input type="text" required className={inputClass} value={newItem.sku} onChange={e => setNewItem({...newItem, sku: e.target.value.toUpperCase()})} /></div>
                <div><label className={labelClass}>Categoria</label>
                  <select className={inputClass} value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})}>
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2"><label className={labelClass}>Descrição do Item</label><input type="text" required className={inputClass} value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} /></div>
                <div><label className={labelClass}>Unidade Bancária</label>
                  <select className={inputClass} value={newItem.company} onChange={e => setNewItem({...newItem, company: e.target.value})} required>
                    <option value="">Selecione...</option>
                    {institutions.map(inst => <option key={inst.id} value={inst.name}>{inst.name}</option>)}
                  </select>
                </div>
                <div><label className={labelClass}>Responsável Direto</label>
                  <select className={inputClass} value={newItem.client_name} onChange={e => setNewItem({...newItem, client_name: e.target.value})} required>
                    <option value="">Selecione...</option>
                    {clientsList.map(c => <option key={c.name} value={c.name}>{c.name} ({c.company})</option>)}
                  </select>
                </div>
                <div><label className={labelClass}>Endereço (Prateleira)</label><input type="text" className={inputClass} value={newItem.area} onChange={e => setNewItem({...newItem, area: e.target.value})} /></div>
              </div>
              <div className="flex justify-end pt-6 border-t border-gray-50"><button type="submit" disabled={isSaving} className="px-16 py-6 bg-blue-900 text-white font-black rounded-[2rem] shadow-xl text-xs uppercase tracking-widest hover:bg-black transition-all">Gravar no Estoque</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detalhes do Item */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-6xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-white shrink-0 z-30 shadow-sm">
              <div className="flex items-center gap-4">
                <span className="font-mono px-3 py-1 bg-gray-900 text-white rounded-lg text-xs font-black uppercase tracking-widest">{selectedItem.sku}</span>
                <h3 className="text-2xl font-black text-gray-800 tracking-tight truncate max-w-md">{selectedItem.description}</h3>
              </div>
              <button 
                onClick={() => { setSelectedItem(null); setIsEditingDetails(false); }} 
                className="p-3 bg-gray-50 hover:bg-red-50 hover:text-red-600 rounded-full text-gray-400 transition-all flex items-center justify-center shadow-inner"
              >
                <X size={32} strokeWidth={2.5} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto flex flex-col lg:flex-row min-h-0">
              <div className="w-full lg:w-1/3 p-10 border-r border-gray-100 bg-gray-50/30 overflow-y-auto">
                <div className="aspect-square rounded-[2rem] overflow-hidden bg-white border border-gray-100 flex items-center justify-center p-8 shadow-sm mb-8">
                  {selectedItem.imageUrl ? <img src={selectedItem.imageUrl} className="max-w-full max-h-full object-contain" /> : <Box size={60} className="text-gray-100" />}
                </div>
                <div className="space-y-6 pb-10">
                   <div className="flex flex-col">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Saldo Atual</span>
                      <span className="text-5xl font-black leading-none text-blue-900">{selectedItem.totalQuantity.toLocaleString()} <span className="text-xl">un</span></span>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-6 p-6 bg-white rounded-3xl border border-gray-100 relative group">
                      {isBackoffice && <button onClick={() => setIsEditingDetails(!isEditingDetails)} className="absolute -top-3 -right-3 p-2 bg-orange-600 text-white rounded-full shadow-lg hover:scale-110 transition-all z-20">{isEditingDetails ? <X size={14} /> : <Edit2 size={14} />}</button>}
                      
                      {isEditingDetails ? (
                        <div className="col-span-2 space-y-4 animate-in fade-in">
                          <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase">Categoria</label>
                            <select className="w-full p-3 bg-white border-2 border-orange-200 rounded-xl text-xs font-black" value={tempEditFields.category} onChange={e => setTempEditFields({...tempEditFields, category: e.target.value})}>
                              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                          </div>
                          <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase">Empresa / Unidade</label>
                            <select className="w-full p-3 bg-white border-2 border-orange-200 rounded-xl text-xs font-black" value={tempEditFields.company} onChange={e => setTempEditFields({...tempEditFields, company: e.target.value})}>
                              {institutions.map(inst => <option key={inst.id} value={inst.name}>{inst.name}</option>)}
                            </select>
                          </div>
                          <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase">Responsável</label>
                            <select className="w-full p-3 bg-white border-2 border-orange-200 rounded-xl text-xs font-black" value={tempEditFields.clientName} onChange={e => setTempEditFields({...tempEditFields, clientName: e.target.value})}>
                              {clientsList.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                            </select>
                          </div>
                          <button onClick={handleUpdateDetails} disabled={isSaving} className="w-full py-4 bg-green-600 text-white font-black rounded-xl text-[10px] uppercase tracking-widest shadow-lg hover:bg-green-700 transition-all">
                             {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Confirmar Alterações
                          </button>
                        </div>
                      ) : (
                        <>
                          <DetailItem label="Unidade" value={selectedItem.company} />
                          <DetailItem label="Responsável" value={selectedItem.clientName} />
                          <DetailItem label="Categoria" value={selectedItem.category} />
                          <DetailItem label="Área" value={selectedItem.area} />
                        </>
                      )}
                   </div>
                   
                   <button onClick={() => setIsMovementModalOpen(true)} className="w-full py-4 bg-[#004481] text-white font-black rounded-2xl shadow-lg flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest hover:bg-blue-900 transition-all"><History size={16} /> Lançar Movimentação</button>
                </div>
              </div>

              <div className="flex-1 p-10 overflow-y-auto bg-white">
                <h4 className="text-xs font-black text-gray-800 uppercase tracking-widest flex items-center gap-2 mb-8"><ClipboardList size={20} className="text-orange-500" /> Histórico de Movimentações</h4>
                <div className="space-y-3">
                  {loadingMovements ? <div className="py-20 text-center"><Loader2 className="animate-spin inline text-orange-500" /></div> : movements.length === 0 ? <div className="py-20 text-center text-gray-300 italic">Nenhuma movimentação registrada.</div> : movements.map((m, idx) => (
                    <div key={m.id || idx} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-6">
                           <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${m.type === 'ajuste' ? 'bg-blue-50 text-blue-600' : m.quantity_change > 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>{m.type === 'ajuste' ? <Settings2 size={24} /> : m.quantity_change > 0 ? <ArrowUpCircle size={24} /> : <ArrowDownCircle size={24} />}</div>
                           <div className="flex-1 min-w-0">
                             <div className="text-sm font-black text-gray-800">
                               {m.type === 'ajuste' ? 'Ajuste de Cadastro' : `${m.quantity_change > 0 ? '+' : ''}${m.quantity_change} unidades`}
                             </div>
                             <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest truncate">{m.observations}</p>
                           </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[10px] font-black text-gray-400 uppercase">{m.responsible}</p>
                          <p className="text-[9px] font-bold text-gray-300">{new Date(m.created_at).toLocaleString('pt-BR')}</p>
                        </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="p-8 border-t border-gray-100 bg-gray-50 flex justify-end shrink-0 z-30 shadow-inner">
               <button onClick={() => { setSelectedItem(null); setIsEditingDetails(false); }} className="px-12 py-5 bg-gray-900 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-xl">Fechar Detalhes</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Lançar Movimentação */}
      {isMovementModalOpen && selectedItem && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[250] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
             <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-white"><h3 className="text-xl font-black text-gray-800 tracking-tight">Lançar Movimentação</h3><button onClick={() => setIsMovementModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400"><X size={28} /></button></div>
             <form onSubmit={handleSaveMovement} className="p-10 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                   <div><label className={labelClass}>Tipo</label><select className={inputClass} value={newMovement.type} onChange={e => setNewMovement({...newMovement, type: e.target.value})}><option value="entrada">Entrada (+)</option><option value="saída">Saída (-)</option></select></div>
                   <div><label className={labelClass}>Qtd</label><input type="number" min="1" required className={inputClass} value={newMovement.quantity} onChange={e => setNewMovement({...newMovement, quantity: parseInt(e.target.value) || 0})} /></div>
                </div>
                <div><label className={labelClass}>Observação</label><textarea className={`${inputClass} h-24`} required value={newMovement.observations} onChange={e => setNewMovement({...newMovement, observations: e.target.value})} /></div>
                <div className="pt-4"><button type="submit" disabled={isSaving} className="w-full py-5 bg-blue-900 text-white font-black rounded-2xl shadow-xl flex items-center justify-center gap-3 text-sm uppercase tracking-widest">{isSaving ? <Loader2 className="animate-spin" size={24} /> : <Save size={24} />} Confirmar</button></div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

const DetailItem = ({ label, value }: { label: string, value: string }) => (
  <div className="space-y-0.5">
    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
    <p className="text-sm text-gray-800 font-black truncate">{value || 'N/A'}</p>
  </div>
);

export default Inventory;
