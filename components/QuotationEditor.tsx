
import React, { useState, useEffect } from 'react';
import { X, Plus, Save, Trash2, FileSpreadsheet, Eye, ImageIcon, Loader2, Copy, Check, Hand, Users, Search, Box, ArrowRight, Tag, Lock, MapPin } from 'lucide-react';
import { Quotation, QuotationItem, ProspectJob, InventoryItem } from '../types';
import { supabase, isSupabaseConfigured } from '../supabase';

interface QuotationEditorProps {
  job: ProspectJob;
  onClose: () => void;
  onSave: (quotation: Quotation) => void;
  onViewAsClient?: (quotation: Quotation) => void;
  initialItems?: QuotationItem[];
}

const QuotationEditor: React.FC<QuotationEditorProps> = ({ job, onClose, onSave, onViewAsClient, initialItems = [] }) => {
  const [items, setItems] = useState<QuotationItem[]>(initialItems.length > 0 ? initialItems : []);
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryResults, setInventoryResults] = useState<any[]>([]);
  const [isSearchingInventory, setIsSearchingInventory] = useState(false);

  // Auxiliar para arredondamento correto de 2 casas decimais
  const round2 = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;

  const handleAddItem = (customFields: Partial<QuotationItem> = {}) => {
    setItems([...items, {
      id: Math.random().toString(36).substr(2, 9),
      sku: customFields.sku || '', 
      description: customFields.description || '', 
      observations: customFields.observations || '', 
      imageUrl: customFields.imageUrl || '',
      productionTime: customFields.productionTime || '', 
      include: (customFields.include as any) || 'sim',
      quantity: customFields.quantity || 1, 
      unitPrice: customFields.unitPrice || 0, 
      feePercentage: 8, 
      taxPercentage: 21.2,
      ...customFields
    }]);
  };

  const handleAddFromInventory = (invItem: any) => {
    handleAddItem({
      sku: invItem.sku,
      description: invItem.description,
      imageUrl: invItem.image_url,
      observations: `Produto vinculado ao SKU: ${invItem.sku}`,
      quantity: 1
    });
    setIsInventoryModalOpen(false);
  };

  const searchInventory = async () => {
    if (!isSupabaseConfigured()) return;
    setIsSearchingInventory(true);
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .or(`description.ilike.%${inventorySearch}%,sku.ilike.%${inventorySearch}%`)
        .limit(12);
      
      if (error) throw error;
      setInventoryResults(data || []);
    } catch (err) {
      console.error("Erro na busca de catálogo:", err);
    } finally {
      setIsSearchingInventory(false);
    }
  };

  useEffect(() => {
    if (inventorySearch.length > 1) {
      const delayDebounceFn = setTimeout(() => {
        searchInventory();
      }, 300);
      return () => clearTimeout(delayDebounceFn);
    } else {
      setInventoryResults([]);
    }
  }, [inventorySearch]);

  const handleAddStandardService = (name: string, isCortesia: boolean = false) => {
    handleAddItem({
      sku: `SVC-${name.toUpperCase().replace(/\s+/g, '-')}`,
      description: name,
      observations: 'Serviço operacional padrão Ventura',
      include: isCortesia ? 'cortesia' : 'sim',
      quantity: 1,
      unitPrice: 0
    });
  };

  const handleCopyLink = () => {
    const fakeLink = `${window.location.origin}/proposta/${job.id}/${job.quotationId || 'novo'}`;
    navigator.clipboard.writeText(fakeLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUpdateItem = (id: string, field: keyof QuotationItem, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleViewAsClient = () => {
    if (onViewAsClient) {
      onViewAsClient({
        id: job.quotationId || 'novo',
        prospectJobId: job.id,
        items: items,
        status: 'Rascunho',
        lastUpdated: new Date().toISOString()
      });
    }
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let feeTotal = 0;
    let grandTotal = 0;

    items.forEach(item => {
      const lineSubtotal = round2((item.quantity || 0) * (item.unitPrice || 0));
      const lineFee = round2(lineSubtotal * 0.08); // Fee (8%): Preço Unitário * 0.08 (escalonado pela qtd)
      const lineTotal = round2((lineSubtotal + lineFee) / 0.825); // Valor Total: (Valor Definido + Fee) / 0.825

      subtotal += lineSubtotal;
      feeTotal += lineFee;
      grandTotal += lineTotal;
    });

    const taxesTotal = round2(grandTotal - (subtotal + feeTotal)); // Impostos: Valor Total - (Valor Definido + Fee)

    return { 
      subtotal: round2(subtotal), 
      fee: round2(feeTotal), 
      taxes: round2(taxesTotal), 
      total: round2(grandTotal) 
    };
  };

  const totals = calculateTotals();

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[130] flex items-center justify-center p-4">
      <div className="bg-white rounded-[3rem] w-[95vw] max-w-7xl h-[92vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
        <div className="p-8 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center bg-white sticky top-0 z-20 gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shadow-inner">
              <FileSpreadsheet size={28} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-gray-800">Orçamento Consolidado</h3>
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{job.description} | {job.clientName}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={handleCopyLink} className={`px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-sm ${copied ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {copied ? <Check size={16} /> : <Copy size={16} />} Compartilhar Link
            </button>
            <button onClick={handleViewAsClient} className="px-6 py-4 bg-blue-50 text-blue-600 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm hover:bg-blue-100">
              <Eye size={16} /> Visualizar Proposta
            </button>
            <button onClick={onClose} className="p-3 text-gray-300 hover:text-gray-900 transition-colors"><X size={32} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-10 bg-gray-50/30">
          <div className="flex flex-wrap gap-3 mb-8">
            <button 
              onClick={() => setIsInventoryModalOpen(true)}
              className="flex items-center gap-3 px-8 py-5 bg-[#1e293b] text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 shadow-xl transition-all hover:scale-105"
            >
              <Box size={18} /> Puxar Itens do Catálogo (SKU)
            </button>
            <div className="w-px h-10 bg-gray-200 mx-2" />
            <button onClick={() => handleAddStandardService('Manuseio')} className="flex items-center gap-2 px-5 py-3 bg-white border border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-600 hover:border-orange-500 shadow-sm transition-all">
              <Hand size={14} /> + Manuseio
            </button>
            <button onClick={() => handleAddStandardService('Coordenação')} className="flex items-center gap-2 px-5 py-3 bg-white border border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-600 hover:border-blue-500 shadow-sm transition-all">
              <Users size={14} /> + Coordenação
            </button>
          </div>

          <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden min-w-[1250px] shadow-sm">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#003366] text-white text-[10px] font-black uppercase tracking-widest">
                  <th className="p-5 text-center">SKU</th>
                  <th className="p-5 text-center">Imagem</th>
                  <th className="p-5 w-[25%]">Produto / Serviço</th>
                  <th className="p-5 w-[100px] text-center">Modo</th>
                  <th className="p-5 w-[100px] text-center">Qtd</th>
                  <th className="p-5 w-[140px] text-right">Preço Unit.</th>
                  <th className="p-5 text-right">Encargos (FEE 8%)</th>
                  <th className="p-5 text-right">Total c/ Imp. (/0.825)</th>
                  <th className="p-5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.length === 0 ? (
                  <tr><td colSpan={9} className="p-24 text-center text-gray-400 font-bold italic">Nenhum SKU selecionado para este orçamento.</td></tr>
                ) : (
                  items.map((item) => {
                    const lineSub = round2((item.quantity || 0) * (item.unitPrice || 0));
                    const lineFee = round2(lineSub * 0.08);
                    const lineTotal = round2((lineSub + lineFee) / 0.825);
                    const isOfficialSku = item.observations?.includes("Referência SKU") || item.observations?.includes("vínculo");

                    return (
                      <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="p-4 text-center">
                           <div className="relative group/sku">
                             <input 
                              readOnly={isOfficialSku}
                              className={`font-mono text-[9px] font-black px-2 py-1.5 rounded-lg border-none outline-none w-28 text-center uppercase tracking-wider ${isOfficialSku ? 'bg-gray-900 text-white cursor-not-allowed' : 'bg-orange-50 text-orange-600'}`} 
                              value={item.sku} 
                              onChange={e => handleUpdateItem(item.id, 'sku', e.target.value.toUpperCase())}
                              placeholder="SKU"
                             />
                             {isOfficialSku && <Lock size={10} className="absolute -top-1 -right-1 text-gray-400" />}
                           </div>
                        </td>
                        <td className="p-4">
                          <div className="w-14 h-14 mx-auto rounded-xl bg-gray-50 border border-gray-100 overflow-hidden flex items-center justify-center shadow-inner">
                            {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover" /> : <ImageIcon size={20} className="text-gray-200" />}
                          </div>
                        </td>
                        <td className="p-4">
                          <input className="w-full bg-transparent font-black text-gray-800 outline-none mb-1 border-b border-transparent focus:border-blue-200" value={item.description} onChange={e => handleUpdateItem(item.id, 'description', e.target.value)} placeholder="Nome do item..." />
                          <input className="w-full bg-transparent text-gray-400 text-[10px] font-bold outline-none" value={item.observations} onChange={e => handleUpdateItem(item.id, 'observations', e.target.value)} placeholder="Notas técnicas..." />
                        </td>
                        <td className="p-4 text-center">
                          <select className="text-[9px] font-black uppercase px-2 py-1.5 rounded-lg bg-gray-100 border-none outline-none cursor-pointer" value={item.include} onChange={e => handleUpdateItem(item.id, 'include', e.target.value)}>
                            <option value="sim">Sim</option>
                            <option value="cortesia">Cortesia</option>
                            <option value="não">Não</option>
                          </select>
                        </td>
                        <td className="p-4 text-center">
                          <input type="number" className="w-16 bg-gray-100 p-2 rounded-lg text-center font-black text-blue-600 border border-transparent focus:border-blue-200 outline-none" value={item.quantity} onChange={e => handleUpdateItem(item.id, 'quantity', parseInt(e.target.value) || 0)} />
                        </td>
                        <td className="p-4 text-right font-black">
                          <div className="flex items-center justify-end gap-1">
                             <span className="text-[9px] text-gray-400">R$</span>
                             <input type="number" step="0.01" className="w-24 bg-gray-100 p-2 rounded-lg text-right font-black text-gray-800 border border-transparent focus:border-green-200 outline-none" value={item.unitPrice} onChange={e => handleUpdateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)} />
                          </div>
                        </td>
                        <td className="p-4 text-right text-blue-600/60 font-black text-xs">R$ {lineFee.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="p-4 text-right font-black text-blue-900 bg-blue-50/20">R$ {lineTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="p-4 text-center">
                          <button onClick={() => setItems(items.filter(i => i.id !== item.id))} className="text-gray-300 hover:text-red-500 transition-colors p-2"><Trash2 size={18} /></button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            <button onClick={() => handleAddItem()} className="w-full p-10 text-xs font-black text-gray-400 hover:bg-gray-50 hover:text-blue-600 transition-all uppercase tracking-[0.2em] flex items-center justify-center gap-3 bg-white border-t border-gray-50">
              <Plus size={20} /> Inserir Item Avulso (Sem SKU de Estoque)
            </button>
          </div>
        </div>

        <div className="p-10 border-t border-gray-100 bg-white flex flex-col md:flex-row justify-between items-center gap-6">
           <div className="flex gap-16">
              <div className="text-left">
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Subtotal Produção</p>
                 <p className="text-2xl font-black text-gray-800 tracking-tighter">R$ {totals.subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div className="text-left">
                 <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">FEE Operacional (8%)</p>
                 <p className="text-2xl font-black text-blue-600 tracking-tighter">R$ {totals.fee.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div className="text-left">
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Impostos Previstos</p>
                 <p className="text-2xl font-black text-gray-600 tracking-tighter">R$ {totals.taxes.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
           </div>
           <div className="flex items-center gap-12">
              <div className="text-right">
                 <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1">Investimento Total Previsto</p>
                 <p className="text-5xl font-black text-orange-600 tracking-tighter">R$ {totals.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <button 
                onClick={async () => {
                  setIsSaving(true);
                  try {
                    // Mapeia para o formato esperado pelo Supabase (com snake_case se necessário para colunas específicas)
                    const quotationPayload: Quotation = {
                      id: job.quotationId || `QUO-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
                      prospectJobId: job.id, 
                      items: items.map(i => ({
                        ...i,
                        unit_price: i.unitPrice, // Garante que ambos existam no JSON
                        tax_percentage: i.taxPercentage,
                        fee_percentage: i.feePercentage
                      })), 
                      status: 'Enviado', 
                      lastUpdated: new Date().toISOString()
                    };
                    await onSave(quotationPayload);
                  } catch (e) {
                    console.error("Erro ao sincronizar:", e);
                  } finally {
                    setIsSaving(false);
                  }
                }}
                disabled={isSaving}
                className="px-20 py-7 bg-[#004481] text-white font-black rounded-[2.5rem] shadow-2xl hover:bg-blue-900 transition-all text-sm uppercase tracking-widest flex items-center gap-4 disabled:opacity-50 hover:scale-105 active:scale-95"
              >
                {isSaving ? <Loader2 size={24} className="animate-spin" /> : <Save size={24} />} 
                SINCRONIZAR WITH BANCO ITAÚ
              </button>
           </div>
        </div>

        {/* Inventory Selection Modal */}
        {isInventoryModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[140] flex items-center justify-center p-4">
            <div className="bg-white rounded-[3rem] w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl">
               <div className="p-8 border-b border-gray-100 flex justify-between items-center">
                  <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">Catálogo de Produtos (SKU)</h3>
                  <button onClick={() => setIsInventoryModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"><X size={28} /></button>
               </div>
               <div className="p-8 border-b border-gray-50">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input 
                      autoFocus
                      type="text" 
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold text-gray-800 outline-none focus:ring-4 focus:ring-blue-500/10 shadow-inner"
                      placeholder="Pesquisar por SKU ou descrição..."
                      value={inventorySearch}
                      onChange={(e) => setInventorySearch(e.target.value)}
                    />
                  </div>
               </div>
               <div className="flex-1 overflow-y-auto p-8 space-y-4">
                  {isSearchingInventory ? (
                    <div className="py-20 flex justify-center"><Loader2 size={32} className="animate-spin text-blue-600" /></div>
                  ) : inventoryResults.length === 0 ? (
                    <div className="py-20 text-center text-gray-400 italic font-bold">Inicie uma busca no catálogo para vincular SKUs.</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       {inventoryResults.map(item => (
                         <div 
                           key={item.id} 
                           onClick={() => handleAddFromInventory(item)}
                           className="p-4 bg-white border border-gray-100 rounded-2xl flex items-center gap-4 cursor-pointer hover:border-blue-500 hover:shadow-lg transition-all group"
                         >
                            <div className="w-16 h-16 bg-gray-50 rounded-xl overflow-hidden shrink-0">
                               {item.image_url ? <img src={item.image_url} className="w-full h-full object-cover" /> : <Box size={24} className="text-gray-200 m-auto mt-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                               <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{item.sku}</p>
                               <h5 className="text-sm font-black text-gray-800 truncate">{item.description}</h5>
                               <p className="text-[9px] font-bold text-gray-400 uppercase mt-1 flex items-center gap-1"><MapPin size={10} /> {item.area || 'N/A'}</p>
                            </div>
                            <ArrowRight className="text-gray-200 group-hover:text-blue-500 transition-colors" size={20} />
                         </div>
                       ))}
                    </div>
                  )}
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuotationEditor;
