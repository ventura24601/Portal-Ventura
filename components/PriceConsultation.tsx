
import React, { useState, useEffect } from 'react';
import { Search, TrendingUp, BarChart3, Package, Hand, Users, Loader2, ArrowUpRight, ArrowDownRight, Filter, Info, ChevronRight, Calculator } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../supabase';
import { MOCK_QUOTATIONS } from '../constants';
import { QuotationItem } from '../types';

interface AggregatedItem {
  description: string;
  sku: string;
  totalQuoted: number;
  totalQuantity: number;
  avgUnitPrice: number;
  minUnitPrice: number;
  maxUnitPrice: number;
  isService: boolean;
}

const PriceConsultation: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<AggregatedItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'Todos' | 'Produtos' | 'Serviços'>('Todos');

  const fetchData = async () => {
    setLoading(true);
    try {
      let rawItems: any[] = [];

      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('quotations')
          .select('items');
        
        if (error) throw error;
        rawItems = (data || []).flatMap(q => q.items || []);
      } else {
        rawItems = MOCK_QUOTATIONS.flatMap(q => q.items || []);
      }

      // Agrupamento e Cálculo
      const grouped = rawItems.reduce((acc: {[key: string]: any}, item: any) => {
        const key = (item.sku || item.description).toUpperCase();
        if (!acc[key]) {
          acc[key] = {
            description: item.description,
            sku: item.sku || 'N/A',
            totalQuoted: 0,
            totalQuantity: 0,
            prices: [],
            isService: (item.sku || '').startsWith('SVC-') || ['MANUSEIO', 'COORDENAÇÃO'].some(s => item.description.toUpperCase().includes(s))
          };
        }
        
        acc[key].totalQuoted += 1;
        acc[key].totalQuantity += Number(item.quantity || 0);
        acc[key].prices.push(Number(item.unitPrice || item.unit_price || 0));
        
        return acc;
      }, {});

      const processed: AggregatedItem[] = Object.values(grouped).map((g: any) => ({
        description: g.description,
        sku: g.sku,
        totalQuoted: g.totalQuoted,
        totalQuantity: g.totalQuantity,
        avgUnitPrice: g.prices.reduce((a: number, b: number) => a + b, 0) / g.prices.length,
        minUnitPrice: Math.min(...g.prices),
        maxUnitPrice: Math.max(...g.prices),
        isService: g.isService
      })).sort((a, b) => b.totalQuoted - a.totalQuoted);

      setItems(processed);
    } catch (err) {
      console.error("Erro na consulta de preços:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredItems = items.filter(item => {
    const matchesSearch = item.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         item.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'Todos' || 
                       (filterType === 'Produtos' && !item.isService) || 
                       (filterType === 'Serviços' && item.isService);
    return matchesSearch && matchesType;
  });

  const getStats = () => {
    const services = items.filter(i => i.isService);
    const manuseio = services.find(s => s.description.toUpperCase().includes('MANUSEIO'));
    const coordenacao = services.find(s => s.description.toUpperCase().includes('COORDENAÇÃO'));

    return {
      avgManuseio: manuseio?.avgUnitPrice || 0,
      avgCoordenacao: coordenacao?.avgUnitPrice || 0,
      totalItems: items.length
    };
  };

  const stats = getStats();

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <PriceStatCard 
          label="Média Manuseio" 
          value={stats.avgManuseio} 
          icon={<Hand className="text-orange-600" size={24} />} 
          subtext="Baseado em todo histórico"
        />
        <PriceStatCard 
          label="Média Coordenação" 
          value={stats.avgCoordenacao} 
          icon={<Users className="text-blue-600" size={24} />} 
          subtext="Baseado em todo histórico"
        />
        <PriceStatCard 
          label="Itens Monitorados" 
          value={stats.totalItems} 
          icon={<Calculator className="text-purple-600" size={24} />} 
          subtext="SKUs e Serviços únicos"
          isCount
        />
      </div>

      <div className="bg-white rounded-[3.5rem] border border-gray-100 shadow-xl overflow-hidden relative">
        {loading && <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-20 flex items-center justify-center"><Loader2 className="animate-spin text-orange-500" size={48} /></div>}
        
        <div className="p-10 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex-1 max-w-xl relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Pesquisar por descrição ou SKU..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-14 pr-6 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-4 focus:ring-orange-500/10 transition-all"
            />
          </div>
          <div className="flex bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
            {['Todos', 'Produtos', 'Serviços'].map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t as any)}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterType === t ? 'bg-[#EC7000] text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white border-b border-gray-50">
                <th className="px-10 py-8 text-[10px] font-black text-gray-400 uppercase tracking-widest">Item / Serviço</th>
                <th className="px-10 py-8 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Vezes Orçado</th>
                <th className="px-10 py-8 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Qtd Acumulada</th>
                <th className="px-10 py-8 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Média Unitária</th>
                <th className="px-10 py-8 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Variação (Mín/Máx)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-10 py-20 text-center text-gray-400 italic font-bold">Nenhum histórico encontrado para os termos pesquisados.</td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-10 py-8">
                       <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.isService ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>
                             {item.isService ? <BarChart3 size={18} /> : <Package size={18} />}
                          </div>
                          <div>
                             <div className="text-sm font-black text-gray-800">{item.description}</div>
                             <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{item.sku}</div>
                          </div>
                       </div>
                    </td>
                    <td className="px-10 py-8 text-center">
                       <span className="px-4 py-1 bg-gray-100 rounded-lg text-xs font-black text-gray-600">{item.totalQuoted}</span>
                    </td>
                    <td className="px-10 py-8 text-center font-bold text-gray-500">
                       {item.totalQuantity.toLocaleString('pt-BR')} un
                    </td>
                    <td className="px-10 py-8 text-right">
                       <div className="text-base font-black text-gray-900">R$ {item.avgUnitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </td>
                    <td className="px-10 py-8 text-right">
                       <div className="flex items-center justify-end gap-2 text-[10px] font-black uppercase">
                          <span className="text-green-600">Min: {item.minUnitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          <span className="text-gray-200">|</span>
                          <span className="text-red-600">Max: {item.maxUnitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                       </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const PriceStatCard = ({ label, value, icon, subtext, isCount = false }: any) => (
  <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
    <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mb-6">{icon}</div>
    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
    <h4 className="text-3xl font-black text-gray-900 tracking-tighter">
      {isCount ? value : `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
    </h4>
    <p className="text-[10px] font-bold text-gray-300 mt-2 italic">{subtext}</p>
  </div>
);

export default PriceConsultation;
