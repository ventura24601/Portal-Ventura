
import React, { useState } from 'react';
import { CheckCircle, XCircle, MessageSquare, Save, Package, Info, AlertTriangle, ArrowLeft } from 'lucide-react';
import { Quotation, QuotationItem, ProspectJob } from '../types';
import { ITAU_THEME, MOCK_PROSPECT_JOBS } from '../constants';

interface PublicQuotationViewProps {
  quotation: Quotation;
  job?: ProspectJob;
  onApprove: (comments: string) => void;
  onAdjust: (comments: string) => void;
  onBack?: () => void;
}

const PublicQuotationView: React.FC<PublicQuotationViewProps> = ({ quotation, job: providedJob, onApprove, onAdjust, onBack }) => {
  const [items, setItems] = useState<QuotationItem[]>(quotation.items);
  const [comments, setComments] = useState('');
  const job = providedJob || MOCK_PROSPECT_JOBS.find(j => j.id === quotation.prospectJobId);

  const handleUpdateQty = (id: string, qty: number) => {
    setItems(items.map(item => item.id === id ? { ...item, quantity: qty } : item));
  };

  // Helper para arredondamento
  const round2 = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;

  const calculateTotals = () => {
    let subtotal = 0;
    let feeTotal = 0;
    let grandTotal = 0;

    items.forEach(item => {
      const lineSubtotal = round2((item.quantity || 0) * (item.unitPrice || 0));
      const lineFee = round2(lineSubtotal * 0.08); // Fee (8%): Valor Definido * 0.08
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

  const tableHeaderClass = "bg-[#003366] text-white text-[10px] font-black uppercase tracking-wider py-5 px-4 text-center border-r border-white/10 last:border-r-0";
  const cellClass = "p-4 border-r border-gray-100 last:border-r-0 text-sm font-bold text-gray-700";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4 animate-in fade-in duration-700">
      <div className="max-w-7xl w-full space-y-8">
        {/* Navigation & Branding */}
        <div className="flex justify-between items-center">
          <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-gray-600 font-bold text-xs uppercase tracking-widest transition-colors">
            <ArrowLeft size={16} /> Voltar p/ o Portal
          </button>
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center text-white font-black text-xl shadow-lg">V</div>
             <span className="font-black text-gray-800 tracking-tighter text-xl">VENTURA <span className="text-orange-600">PROMOCIONAL</span></span>
          </div>
        </div>

        {/* Hero Info */}
        <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-8">
           <div className="flex-1">
              <span className="text-[10px] font-black text-orange-600 bg-orange-50 px-3 py-1 rounded-full uppercase tracking-[0.2em]">Cotação Detalhada de Evento</span>
              <h1 className="text-4xl font-black text-gray-900 mt-4 leading-tight">{job?.description}</h1>
              <p className="text-gray-500 mt-2 font-medium">Prezada {job?.clientName}, confira abaixo os detalhes da sua cotação. Você pode ajustar as quantidades caso necessário.</p>
           </div>
           <div className="bg-gray-900 p-8 rounded-[2.5rem] text-white text-center min-w-[280px] shadow-2xl shadow-blue-900/20">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Investimento Total Estimado</p>
              <p className="text-4xl font-black">R$ {totals.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <div className="mt-4 flex items-center justify-center gap-2 text-[10px] font-bold text-green-400">
                 <CheckCircle size={14} /> Valores válidos por 7 dias
              </div>
           </div>
        </div>

        {/* Detailed Table */}
        <div className="bg-white rounded-[3rem] shadow-xl border border-gray-100 overflow-hidden">
           <div className="p-8 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
              <h3 className="font-black text-gray-800 uppercase tracking-widest flex items-center gap-2">
                 <Package size={20} className="text-blue-600" />
                 Itens do Orçamento
              </h3>
              <div className="flex items-center gap-2 text-xs font-bold text-gray-400 bg-white px-4 py-2 rounded-xl border border-gray-100">
                 <Info size={14} /> Ajuste o campo "Quantidade" se desejar recalcular
              </div>
           </div>
           
           <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                 <thead>
                    <tr>
                       <th className={tableHeaderClass}>Descrição do Item</th>
                       <th className={tableHeaderClass}>Obs/Produção</th>
                       <th className={tableHeaderClass}>Imagem</th>
                       <th className={tableHeaderClass}>Incluído?</th>
                       <th className={tableHeaderClass} style={{ width: '120px' }}>Quantidade</th>
                       <th className={tableHeaderClass}>Valor Unitário</th>
                       <th className={tableHeaderClass}>Subtotal (com FEE 8%)</th>
                       <th className={tableHeaderClass}>Total Item (com Impostos)</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100">
                    {items.map(item => {
                       const lineSub = round2(item.quantity * item.unitPrice);
                       const lineSubWithFee = round2(lineSub * 1.08); // (Valor Definido + Fee 8%)
                       const lineTotal = round2(lineSubWithFee / 0.825); // (Valor Definido + Fee) / 0.825

                       return (
                          <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                             <td className={cellClass}>{item.description}</td>
                             <td className={cellClass}>
                                <div className="text-[10px] text-gray-400 font-bold uppercase mb-1">{item.productionTime}</div>
                                <div className="text-xs font-medium">{item.observations}</div>
                             </td>
                             <td className={cellClass}>
                                <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden flex items-center justify-center">
                                   {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover" /> : <Package size={20} className="text-gray-200" />}
                                </div>
                             </td>
                             <td className={cellClass}>
                                <span className={`text-[10px] font-black uppercase px-2 py-1 rounded ${item.include === 'sim' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                   {item.include}
                                </span>
                             </td>
                             <td className={cellClass}>
                                <input 
                                   type="number" 
                                   value={item.quantity}
                                   onChange={(e) => handleUpdateQty(item.id, parseInt(e.target.value) || 0)}
                                   className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-center font-black text-blue-600 focus:ring-2 focus:ring-blue-500/20 outline-none"
                                />
                             </td>
                             <td className={cellClass}>R$ {item.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                             <td className={cellClass}>R$ {lineSubWithFee.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                             <td className={`${cellClass} font-black text-blue-900 bg-blue-50/20`}>R$ {lineTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          </tr>
                       );
                    })}
                 </tbody>
                 <tfoot>
                    <tr className="bg-[#003366] text-white">
                       <td colSpan={7} className="p-6 text-xs font-black uppercase tracking-[0.2em] text-right border-r border-white/10">Investimento Total do JOB</td>
                       <td className="p-6 text-xl font-black text-right bg-orange-600">R$ {totals.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                 </tfoot>
              </table>
           </div>
        </div>

        {/* Interaction Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
           <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] shadow-xl border border-gray-100 space-y-6">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                    <MessageSquare size={20} />
                 </div>
                 <h4 className="text-xl font-black text-gray-800">Deseja solicitar algum ajuste ou deixar um comentário?</h4>
              </div>
              <textarea 
                 value={comments}
                 onChange={(e) => setComments(e.target.value)}
                 className="w-full p-6 bg-gray-50 border border-gray-200 rounded-[2rem] outline-none focus:ring-2 focus:ring-blue-500/20 text-gray-700 font-medium min-h-[150px] resize-none"
                 placeholder="Ex: Gostaria de alterar a cor da impressão..."
              />
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                 <button 
                    onClick={() => onApprove(comments)}
                    className="flex-1 py-5 bg-[#EC7000] text-white font-black rounded-3xl shadow-xl hover:bg-orange-600 transition-all flex items-center justify-center gap-3 text-lg"
                 >
                    <CheckCircle size={24} /> APROVAR COTAÇÃO
                 </button>
                 <button 
                    onClick={() => onAdjust(comments)}
                    className="flex-1 py-5 bg-white text-gray-500 border-2 border-gray-200 font-black rounded-3xl hover:bg-gray-50 transition-all flex items-center justify-center gap-3 text-lg"
                 >
                    <XCircle size={24} /> SOLICITAR AJUSTES
                 </button>
              </div>
           </div>

           <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-gray-100 space-y-6">
              <h4 className="text-sm font-black text-gray-800 uppercase tracking-widest border-b border-gray-100 pb-4">Avisos Importantes</h4>
              <div className="space-y-4">
                 <div className="flex gap-4">
                    <AlertTriangle className="text-orange-500 shrink-0" size={20} />
                    <p className="text-xs text-gray-500 leading-relaxed font-medium">Os prazos de produção começam a contar a partir da aprovação da arte final.</p>
                 </div>
                 <div className="flex gap-4">
                    <Info className="text-blue-500 shrink-0" size={20} />
                    <p className="text-xs text-gray-500 leading-relaxed font-medium">Logística de entrega não inclusa nos valores de produto acima.</p>
                 </div>
              </div>
              <div className="pt-6 border-t border-gray-100 text-center">
                 <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Responsável Ventura</p>
                 <p className="text-sm font-black text-gray-800 mt-1">Pablo Vinicius</p>
              </div>
           </div>
        </div>

        <div className="text-center py-10 opacity-40">
           <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.5em]">Portal de Gestão Ventura & Itaú</p>
        </div>
      </div>
    </div>
  );
};

export default PublicQuotationView;
