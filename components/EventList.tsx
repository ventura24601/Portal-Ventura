
import React, { useState, useEffect } from 'react';
import { Search, Filter, Eye, MoreVertical, Download, Loader2, AlertCircle, X, Package, CheckCircle, Clock, Truck, Receipt, DollarSign, Calendar as CalendarIcon, User as UserIcon, Save, FileCheck, Layers, Building2, UserCheck, Phone, CreditCard, Calculator, ArrowRightCircle, MapPin } from 'lucide-react';
import { MOCK_EVENTS } from '../constants';
import { DetailedEvent, User, EventStatus, VenturaFulfillment, EventItem } from '../types';
import { supabase, isSupabaseConfigured } from '../supabase';

interface EventListProps {
  user?: User;
}

const STATUS_OPTIONS: { label: EventStatus; icon: any; color: string; badge: string }[] = [
  { label: 'Pendente', icon: Clock, color: 'text-orange-500 bg-orange-50', badge: 'bg-orange-100 text-orange-700' },
  { label: 'Processando', icon: Loader2, color: 'text-blue-500 bg-blue-50', badge: 'bg-blue-100 text-blue-700' },
  { label: 'Enviado', icon: Truck, color: 'text-purple-500 bg-purple-50', badge: 'bg-purple-100 text-purple-700' },
  { label: 'Entregue', icon: CheckCircle, color: 'text-green-500 bg-green-50', badge: 'bg-green-100 text-green-700' },
  { label: 'Faturado', icon: Receipt, color: 'text-emerald-700 bg-emerald-50', badge: 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' },
];

const EventList: React.FC<EventListProps> = ({ user }) => {
  const [events, setEvents] = useState<DetailedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<DetailedEvent | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  
  const [editFulfillment, setEditFulfillment] = useState<Partial<VenturaFulfillment & { status: EventStatus }>>({});

  const isBackoffice = user?.role === 'backoffice';

  const round2 = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;

  const fetchEvents = async () => {
    if (!isSupabaseConfigured()) {
      setEvents(MOCK_EVENTS);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      let query = supabase.from('events').select('*');
      
      if (!isBackoffice && user?.company) {
        query = query.eq('company', user.company);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      const mappedEvents: DetailedEvent[] = (data || []).map((db: any) => {
        const totalInv = db.total_invoiced || db.fulfillment?.totalInvoiced || 0;
        const feeVal = db.fee_value || db.fulfillment?.fee || 0;
        const taxVal = db.taxes_value || db.fulfillment?.taxes || 0;
        const logVal = db.logistics_value || db.fulfillment?.logisticsValue || 0;

        return {
          id: db.id,
          requestDate: db.request_date,
          createdAt: db.created_at,
          requestedBy: db.requested_by || db.email,
          item: db.item,
          quantity: db.quantity,
          items: db.items || [],
          superintendency: db.superintendency,
          billingName: db.billing_name,
          billingWhatsapp: db.billing_whatsapp,
          eventDate: db.event_date,
          eventTime: db.event_time,
          location: db.location,
          address: db.address || { street: '', city: '', state: '', zipCode: '' },
          focalPoint: db.focal_point,
          email: db.email,
          notes: db.notes,
          status: db.status,
          fulfillment: {
            ...(db.fulfillment || {}),
            orderAcceptanceNumber: db.order_acceptance_number || db.fulfillment?.orderAcceptanceNumber,
            deliveryDate: db.delivery_date || db.fulfillment?.deliveryDate,
            totalInvoiced: round2(totalInv),
            receivedBy: db.fulfillment?.receivedBy,
            logisticsValue: round2(logVal),
            fee: round2(feeVal),
            taxes: round2(taxVal)
          }
        };
      });

      setEvents(mappedEvents);
    } catch (err) {
      console.error("Erro ao buscar eventos:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleBaseValueChange = (val: number) => {
    const base = round2(val);
    const fee = round2(base * 0.08);
    const totalInvoiced = round2((base + fee) / 0.825);
    const taxes = round2(totalInvoiced - base - fee);

    setEditFulfillment(prev => ({
      ...prev,
      logisticsValue: base,
      fee: fee,
      taxes: taxes,
      totalInvoiced: totalInvoiced
    }));
  };

  const handleSaveFulfillment = async () => {
    if (!selectedEvent || !isBackoffice) return;
    
    setIsUpdating(true);
    try {
      const base = round2(editFulfillment.logisticsValue || 0);
      const fee = round2(editFulfillment.fee || 0);
      const taxes = round2(editFulfillment.taxes || 0);
      const total = round2(editFulfillment.totalInvoiced || 0);
      const newStatus = editFulfillment.status || selectedEvent.status;

      const updatedFulfillment = {
        ...(selectedEvent.fulfillment || {}),
        ...editFulfillment,
        logisticsValue: base,
        fee: fee,
        taxes: taxes,
        totalInvoiced: total,
        eventId: selectedEvent.id
      };

      if (isSupabaseConfigured()) {
        const { error } = await supabase
          .from('events')
          .update({ 
            fulfillment: updatedFulfillment,
            status: newStatus,
            order_acceptance_number: editFulfillment.orderAcceptanceNumber,
            delivery_date: editFulfillment.deliveryDate,
            total_invoiced: total,
            fee_value: fee,
            taxes_value: taxes,
            logistics_value: base
          })
          .eq('id', selectedEvent.id);
        
        if (error) throw error;
      }

      const newDetailedEvent = { 
        ...selectedEvent, 
        status: newStatus,
        fulfillment: updatedFulfillment as VenturaFulfillment 
      };
      setEvents(events.map(ev => ev.id === selectedEvent.id ? newDetailedEvent : ev));
      setSelectedEvent(newDetailedEvent);
      
      alert('Faturamento e Status atualizados com sucesso!');
    } catch (err: any) {
      alert(`Erro ao salvar: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (selectedEvent) {
      setEditFulfillment({
        ...(selectedEvent.fulfillment || {}),
        status: selectedEvent.status
      });
    }
  }, [selectedEvent]);

  const filteredEvents = events.filter(event => 
    (event.item || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (event.location || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (event.fulfillment?.orderAcceptanceNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (event.superintendency || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (event.billingName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderItemSummary = (event: DetailedEvent) => {
    if (event.items && event.items.length > 0) {
      return (
        <div>
          <div className="flex items-center gap-1.5">
            <Layers size={14} className="text-orange-500" />
            <div className="text-sm font-black text-gray-800">{event.items.length} Tipos de Brindes</div>
          </div>
          <div className="text-[10px] text-orange-600 font-bold uppercase tracking-widest truncate max-w-[200px]">
            {event.items.map(i => i.name).join(', ')}
          </div>
        </div>
      );
    }
    return (
      <div>
        <div className="text-sm font-black text-gray-800">{event.item}</div>
        <div className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">{event.location}</div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por item, local ou nº aceite..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-orange-500/10 shadow-sm"
          />
        </div>
        <button 
          onClick={fetchEvents}
          className="p-3.5 bg-white border border-gray-200 rounded-2xl text-gray-400 hover:text-blue-600 transition-colors shadow-sm"
        >
          <Loader2 size={20} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden relative min-h-[400px]">
        {loading && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex items-center justify-center">
            <Loader2 className="animate-spin text-orange-500" size={32} />
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Solicitação</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Data Pedido</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Item / Resumo</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Total Qtd</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Valor Total</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Nº Aceite</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredEvents.map((event) => {
                const hasAcceptance = !!event.fulfillment?.orderAcceptanceNumber;
                const statusConfig = STATUS_OPTIONS.find(s => s.label === event.status) || STATUS_OPTIONS[0];
                const totalQty = (event.items && event.items.length > 0) 
                  ? event.items.reduce((acc, item) => acc + (item.quantity || 0), 0)
                  : event.quantity;
                const totalVal = event.fulfillment?.totalInvoiced || 0;

                return (
                  <tr key={event.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-8 py-5 text-sm font-black text-blue-600">#{event.id.toString().slice(-4)}</td>
                    <td className="px-8 py-5 text-xs font-bold text-gray-600">{event.requestDate}</td>
                    <td className="px-8 py-5">{renderItemSummary(event)}</td>
                    <td className="px-8 py-5 text-center">
                      <div className="text-sm font-black text-gray-700 bg-gray-50 inline-block px-3 py-1 rounded-lg border border-gray-100">{totalQty}</div>
                    </td>
                    <td className="px-8 py-5 text-sm font-black text-slate-900">
                      {totalVal > 0 ? `R$ ${totalVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                    </td>
                    <td className="px-8 py-5">
                      <span className={`px-3 py-1 text-[10px] font-black rounded-lg uppercase tracking-wider ${
                        hasAcceptance ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {event.fulfillment?.orderAcceptanceNumber || 'Pendente'}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`px-4 py-1.5 text-[9px] font-black rounded-full uppercase tracking-widest transition-all ${statusConfig.badge}`}>
                        {event.status}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <button 
                        onClick={() => setSelectedEvent(event)}
                        className="p-3 text-gray-300 hover:text-orange-500 hover:bg-orange-50 rounded-2xl transition-all"
                      >
                        <Eye size={22} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedEvent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[150] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-white shrink-0 z-10 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center shadow-inner">
                   <Package size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-gray-800 tracking-tight leading-none">Solicitação #{selectedEvent.id.toString().slice(-4)}</h3>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">Detalhamento Logístico & Fiscal</p>
                </div>
              </div>
              <button onClick={() => setSelectedEvent(null)} className="p-3 hover:bg-red-50 hover:text-red-600 rounded-full text-gray-400 transition-colors"><X size={32} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto flex flex-col md:flex-row min-h-0">
                <div className="flex-1 p-10 space-y-10 overflow-y-auto border-r border-gray-100">
                  <section className="space-y-6">
                    <h4 className="text-[10px] font-black text-orange-600 bg-orange-50 px-3 py-1 rounded-lg uppercase tracking-[0.2em] inline-block">Itens do Evento</h4>
                    <div className="space-y-3">
                      {selectedEvent.items?.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-white p-5 border border-gray-100 rounded-2xl shadow-sm">
                           <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center text-orange-500 border border-gray-100 font-black text-[10px]">
                                {idx + 1}
                              </div>
                              <div className="text-sm font-black text-gray-800">{item.name}</div>
                           </div>
                           <div className="text-sm font-black text-orange-600 bg-orange-50 px-3 py-1 rounded-lg">{item.quantity} un</div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="pt-6 border-t border-gray-50 space-y-6">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Origem & Contato</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-gray-50/50 rounded-3xl border border-gray-100">
                      <DetailItem label="Solicitante" value={selectedEvent.requestedBy} icon={<UserCheck size={14} className="text-blue-500" />} />
                      <DetailItem label="Unidade Itaú" value={selectedEvent.superintendency || '-'} icon={<Building2 size={14} className="text-blue-500" />} />
                      <DetailItem label="Faturamento Nome" value={selectedEvent.billingName || '-'} icon={<CreditCard size={14} className="text-orange-500" />} />
                      <DetailItem label="Faturamento WhatsApp" value={selectedEvent.billingWhatsapp || '-'} icon={<Phone size={14} className="text-orange-500" />} />
                    </div>
                  </section>

                  <section className="pt-6 border-t border-gray-50 space-y-6">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Local de Entrega</h4>
                    <div className="space-y-4">
                      <DetailItem label="Local" value={selectedEvent.location} icon={<MapPin size={14} className="text-red-500" />} />
                      <DetailItem label="Endereço" value={`${selectedEvent.address?.street}, ${selectedEvent.address?.city} - ${selectedEvent.address?.state}`} />
                      <DetailItem label="Ponto Focal" value={selectedEvent.focalPoint} />
                      <DetailItem label="E-mail" value={selectedEvent.email} />
                      <DetailItem label="Observações do Cliente" value={selectedEvent.notes} />
                    </div>
                  </section>
                </div>

                <div className="w-full md:w-[450px] bg-gray-50/50 p-10 overflow-y-auto">
                   <h4 className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-lg uppercase tracking-[0.2em] inline-block mb-8">Processamento de Faturamento</h4>
                   
                   {isBackoffice ? (
                      <div className="space-y-8 animate-in fade-in">
                         <div className="space-y-3">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Alterar Status do Evento</label>
                            <div className="grid grid-cols-2 gap-2">
                               {STATUS_OPTIONS.map(opt => (
                                 <button 
                                   key={opt.label}
                                   onClick={() => setEditFulfillment({...editFulfillment, status: opt.label})}
                                   className={`flex items-center gap-2 p-3 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all ${
                                      editFulfillment.status === opt.label 
                                        ? 'bg-blue-600 text-white border-blue-700 shadow-md scale-[1.02]' 
                                        : 'bg-white text-gray-400 border-gray-100 hover:border-blue-200'
                                   }`}
                                 >
                                    <opt.icon size={12} />
                                    {opt.label}
                                 </button>
                               ))}
                            </div>
                         </div>

                         <div className="space-y-4 bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                            <div>
                               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Logística Base (Frete + Manuseio)</label>
                               <div className="relative">
                                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-xs text-gray-400">R$</span>
                                  <input 
                                     type="number"
                                     value={editFulfillment.logisticsValue || ''}
                                     onChange={(e) => handleBaseValueChange(parseFloat(e.target.value) || 0)}
                                     className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl text-sm font-black text-gray-800 focus:ring-4 focus:ring-blue-500/10 transition-all"
                                     placeholder="0,00"
                                  />
                               </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                               <div>
                                  <label className="text-[9px] font-black text-gray-400 uppercase mb-1 block">FEE Ventura (8%)</label>
                                  <div className="py-3 px-4 bg-gray-50 rounded-xl text-xs font-black text-blue-600">R$ {editFulfillment.fee?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                               </div>
                               <div>
                                  <label className="text-[9px] font-black text-gray-400 uppercase mb-1 block">Impostos (Estimado)</label>
                                  <div className="py-3 px-4 bg-gray-50 rounded-xl text-xs font-black text-gray-600">R$ {editFulfillment.taxes?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                               </div>
                            </div>

                            <div className="pt-4 border-t border-gray-50">
                               <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Total a Faturar</p>
                               <p className="text-3xl font-black text-orange-600 tracking-tighter">R$ {editFulfillment.totalInvoiced?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            </div>
                         </div>

                         <div className="space-y-4">
                            <div>
                               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Nº de Aceite Bancário</label>
                               <input 
                                  type="text"
                                  value={editFulfillment.orderAcceptanceNumber || ''}
                                  onChange={(e) => setEditFulfillment({...editFulfillment, orderAcceptanceNumber: e.target.value})}
                                  className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl text-xs font-black text-gray-900 focus:border-blue-500 outline-none transition-all shadow-sm"
                                  placeholder="Ex: 800045129"
                               />
                            </div>
                            <div>
                               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Data de Entrega Efetiva</label>
                               <input 
                                  type="date"
                                  value={editFulfillment.deliveryDate || ''}
                                  onChange={(e) => setEditFulfillment({...editFulfillment, deliveryDate: e.target.value})}
                                  className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl text-xs font-black text-gray-900 focus:border-blue-500 outline-none transition-all shadow-sm"
                               />
                            </div>
                         </div>

                         <button 
                           onClick={handleSaveFulfillment}
                           disabled={isUpdating}
                           className="w-full py-5 bg-blue-900 text-white font-black rounded-3xl shadow-xl flex items-center justify-center gap-3 text-xs uppercase tracking-widest hover:bg-black transition-all disabled:opacity-50"
                         >
                            {isUpdating ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                            Salvar Alterações
                         </button>
                      </div>
                   ) : (
                      <div className="space-y-8">
                         <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm text-center">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Total Invertido</p>
                            <p className="text-4xl font-black text-gray-900 tracking-tighter">R$ {selectedEvent.fulfillment?.totalInvoiced?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            <div className="mt-4 flex items-center justify-center gap-2">
                               <span className={`px-4 py-1.5 text-[9px] font-black rounded-full uppercase tracking-widest ${STATUS_OPTIONS.find(s => s.label === selectedEvent.status)?.badge}`}>
                                  {selectedEvent.status}
                               </span>
                            </div>
                         </div>

                         <div className="space-y-4">
                            <DetailItem label="Logística Base" value={`R$ ${selectedEvent.fulfillment?.logisticsValue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
                            <DetailItem label="Fee Operacional" value={`R$ ${selectedEvent.fulfillment?.fee?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
                            <DetailItem label="Impostos" value={`R$ ${selectedEvent.fulfillment?.taxes?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
                            <DetailItem label="Nº Aceite" value={selectedEvent.fulfillment?.orderAcceptanceNumber || 'Não informado'} />
                            <DetailItem label="Entrega Realizada" value={selectedEvent.fulfillment?.deliveryDate || 'Em trânsito'} />
                         </div>
                      </div>
                   )}
                </div>
            </div>
            
            <div className="p-8 border-t border-gray-100 bg-gray-50 flex justify-end shrink-0 z-10 shadow-inner">
               <button onClick={() => setSelectedEvent(null)} className="px-12 py-5 bg-gray-900 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-xl">Fechar Detalhes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const DetailItem = ({ label, value, icon }: { label: string, value: string, icon?: React.ReactNode }) => (
  <div className="space-y-1">
    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
    <div className="flex items-center gap-2">
      {icon}
      <p className="text-sm text-gray-800 font-black truncate">{value || 'N/A'}</p>
    </div>
  </div>
);

export default EventList;
