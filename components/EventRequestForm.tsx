
import React, { useState, useEffect } from 'react';
import { Send, MapPin, Package, Calendar, Clock, User, Loader2, Plus, Trash2, Building2, Phone, CreditCard, Search } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../supabase';
import { User as UserType, EventItem } from '../types';

interface FormProps {
  user?: UserType;
  prefilledItem?: string;
  onClearPrefill?: () => void;
}

const EventRequestForm: React.FC<FormProps> = ({ user, prefilledItem, onClearPrefill }) => {
  const [loading, setLoading] = useState(false);
  const [fetchingCep, setFetchingCep] = useState(false);
  const [items, setItems] = useState<EventItem[]>([
    { name: prefilledItem || '', quantity: 1 }
  ]);
  
  const [formData, setFormData] = useState({
    superintendency: '',
    billingName: '',
    billingWhatsapp: '',
    eventDate: '',
    eventTime: '',
    location: '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    focalPoint: '',
    email: '',
    notes: ''
  });

  useEffect(() => {
    if (prefilledItem) {
      setItems([{ name: prefilledItem, quantity: 1 }]);
    }
  }, [prefilledItem]);

  // Função para buscar CEP
  const handleCepLookup = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    setFetchingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();

      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          street: data.logradouro,
          city: data.localidade,
          state: data.uf,
          zipCode: cep // Mantém o CEP formatado se o usuário digitou com máscara
        }));
      } else {
        console.warn("CEP não encontrado");
      }
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
    } finally {
      setFetchingCep(false);
    }
  };

  const handleAddItem = () => {
    setItems([...items, { name: '', quantity: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof EventItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (items.some(it => !it.name || it.quantity < 1)) {
      alert("Por favor, preencha todos os itens e quantidades corretamente.");
      setLoading(false);
      return;
    }

    try {
      if (isSupabaseConfigured()) {
        const payload = {
          items: items,
          item: items[0].name,
          quantity: items[0].quantity,
          superintendency: formData.superintendency,
          billing_name: formData.billingName,
          billing_whatsapp: formData.billingWhatsapp,
          event_date: formData.eventDate,
          event_time: formData.eventTime,
          location: formData.location,
          requested_by: user?.name || 'Cliente Corporativo',
          company: user?.company || 'Banco Parceiro',
          address: {
            street: formData.street,
            city: formData.city,
            state: formData.state,
            zipCode: formData.zipCode
          },
          focal_point: formData.focalPoint,
          email: formData.email,
          notes: formData.notes,
          status: 'Pendente',
          request_date: new Date().toISOString().split('T')[0]
        };

        const { error } = await supabase.from('events').insert([payload]);

        if (error) throw error;
        alert('Solicitação salva com sucesso!');
      } else {
        alert('Modo Simulação: Solicitação registrada.');
      }
      
      setItems([{ name: '', quantity: 1 }]);
      setFormData({
        superintendency: '',
        billingName: '',
        billingWhatsapp: '',
        eventDate: '', eventTime: '',
        location: '', street: '', city: '', state: '',
        zipCode: '', focalPoint: '', email: '', notes: ''
      });
      onClearPrefill?.();
    } catch (err: any) {
      alert(`Erro ao sincronizar: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-5 py-4 bg-white border border-gray-300 rounded-2xl text-base font-bold text-gray-900 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all placeholder:text-gray-400 shadow-sm disabled:bg-gray-50 disabled:text-gray-400";
  const labelClass = "block text-[11px] font-black text-gray-600 mb-2 uppercase tracking-[0.1em]";

  return (
    <div className="bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 mb-20">
      <div className="p-12 border-b border-gray-100 bg-white">
        <h3 className="text-3xl font-black text-gray-800 tracking-tight">Solicitação de Saída de Evento</h3>
        <p className="text-gray-500 mt-2 font-medium italic text-sm">Preencha os detalhes para envio dos brindes.</p>
      </div>

      <form onSubmit={handleSubmit} className="p-12 space-y-12 bg-white">
        {/* Dados Organizacionais e Faturamento */}
        <section>
          <div className="flex items-center gap-3 mb-8 text-orange-600">
            <Building2 size={22} />
            <h4 className="font-black uppercase text-xs tracking-[0.2em]">Dados Organizacionais</h4>
          </div>
          <div className="grid grid-cols-1 gap-8">
            <div>
              <label className={labelClass}>Unidade / Superintendência</label>
              <input 
                type="text" 
                className={inputClass} 
                value={formData.superintendency}
                onChange={(e) => setFormData({...formData, superintendency: e.target.value})}
                placeholder="Ex: Superintendência de Marketing Institucional" 
                required 
              />
            </div>
          </div>
        </section>

        {/* Dados para Nota e Pagamento */}
        <section>
          <div className="flex items-center gap-3 mb-8 text-orange-600">
            <CreditCard size={22} />
            <h4 className="font-black uppercase text-xs tracking-[0.2em]">Responsável pela Nota e Pagamento</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className={labelClass}>Nome do Responsável</label>
              <input 
                type="text" 
                className={inputClass} 
                value={formData.billingName}
                onChange={(e) => setFormData({...formData, billingName: e.target.value})}
                placeholder="Nome de quem aprova a nota" 
                required 
              />
            </div>
            <div>
              <label className={labelClass}>WhatsApp do Responsável</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  className={`${inputClass} pl-12`}
                  value={formData.billingWhatsapp}
                  onChange={(e) => setFormData({...formData, billingWhatsapp: e.target.value})}
                  placeholder="(00) 00000-0000" 
                  required 
                />
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3 text-orange-600">
              <Package size={22} />
              <h4 className="font-black uppercase text-xs tracking-[0.2em]">Cesta de Brindes / Itens</h4>
            </div>
            <button 
              type="button"
              onClick={handleAddItem}
              className="flex items-center gap-2 px-6 py-2 bg-orange-50 text-orange-600 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-orange-100 transition-all border border-orange-200"
            >
              <Plus size={14} /> Adicionar outro item
            </button>
          </div>
          
          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="md:col-span-7">
                  <label className={labelClass}>Nome do Item {items.length > 1 ? `#${index + 1}` : ''}</label>
                  <input 
                    type="text" 
                    className={inputClass} 
                    value={item.name}
                    onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                    placeholder="Ex: Tag de Mala Corporativa" 
                    required 
                  />
                </div>
                <div className="md:col-span-3">
                  <label className={labelClass}>Qtd</label>
                  <input 
                    type="number" 
                    className={inputClass} 
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                    placeholder="Ex: 50" 
                    required 
                  />
                </div>
                <div className="md:col-span-2">
                  <button 
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    disabled={items.length === 1}
                    className="w-full py-4 bg-gray-50 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all flex items-center justify-center disabled:opacity-30 border border-gray-200"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-3 mb-8 text-orange-600">
            <Calendar size={22} />
            <h4 className="font-black uppercase text-xs tracking-[0.2em]">Data e Horário</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className={labelClass}>Data da Entrega / Evento</label>
              <input 
                type="date" 
                className={inputClass} 
                value={formData.eventDate}
                onChange={(e) => setFormData({...formData, eventDate: e.target.value})}
                required 
              />
            </div>
            <div>
              <label className={labelClass}>Horário Sugerido</label>
              <input 
                type="time" 
                className={inputClass} 
                value={formData.eventTime}
                onChange={(e) => setFormData({...formData, eventTime: e.target.value})}
                required 
              />
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-center gap-3 mb-8 text-orange-600">
            <MapPin size={22} />
            <h4 className="font-black uppercase text-xs tracking-[0.2em]">Endereço de Destino</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1">
              <label className={labelClass}>CEP</label>
              <div className="relative">
                <input 
                  type="text" 
                  className={inputClass} 
                  value={formData.zipCode} 
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({...formData, zipCode: val});
                    if (val.replace(/\D/g, '').length === 8) {
                      handleCepLookup(val);
                    }
                  }} 
                  onBlur={(e) => handleCepLookup(e.target.value)}
                  placeholder="00000-000" 
                  maxLength={9}
                  required 
                />
                {fetchingCep && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <Loader2 size={18} className="animate-spin text-orange-500" />
                  </div>
                )}
              </div>
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Nome do Local</label>
              <input type="text" className={inputClass} value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} placeholder="Ex: Auditório Sede" required />
            </div>
            <div className="md:col-span-3">
              <label className={labelClass}>Logradouro e Número</label>
              <input type="text" className={inputClass} value={formData.street} onChange={(e) => setFormData({...formData, street: e.target.value})} placeholder="Rua, Número, Bloco..." required />
            </div>
            <div>
              <label className={labelClass}>Cidade</label>
              <input type="text" className={inputClass} value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} placeholder="Ex: São Paulo" required />
            </div>
            <div>
              <label className={labelClass}>UF</label>
              <input type="text" className={inputClass} value={formData.state} onChange={(e) => setFormData({...formData, state: e.target.value})} placeholder="SP" maxLength={2} required />
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-center gap-3 mb-8 text-orange-600">
            <User size={22} />
            <h4 className="font-black uppercase text-xs tracking-[0.2em]">Quem recebe?</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className={labelClass}>Responsável no Local</label>
              <input type="text" className={inputClass} value={formData.focalPoint} onChange={(e) => setFormData({...formData, focalPoint: e.target.value})} placeholder="Ex: Maria José" required />
            </div>
            <div>
              <label className={labelClass}>E-mail de Contato</label>
              <input type="email" className={inputClass} value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="Ex: email@empresa.com.br" required />
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-center gap-3 mb-8 text-orange-600">
            <Clock size={22} />
            <h4 className="font-black uppercase text-xs tracking-[0.2em]">Notas Adicionais</h4>
          </div>
          <div>
            <label className={labelClass}>Observações</label>
            <textarea 
              className={`${inputClass} h-32 resize-none`} 
              value={formData.notes} 
              onChange={(e) => setFormData({...formData, notes: e.target.value})} 
              placeholder="Ex: Entregar na recepção principal e procurar por Maria."
            />
          </div>
        </section>

        <div className="pt-12 border-t border-gray-100 flex justify-end">
          <button 
            type="submit" 
            disabled={loading}
            className="flex items-center gap-4 px-16 py-6 bg-[#EC7000] text-white font-black rounded-3xl hover:bg-orange-600 transition-all transform hover:scale-[1.02] disabled:opacity-50 shadow-2xl shadow-orange-500/20 text-sm uppercase tracking-widest"
          >
            {loading ? <Loader2 size={24} className="animate-spin" /> : <Send size={24} />}
            FINALIZAR SOLICITAÇÃO
          </button>
        </div>
      </form>
    </div>
  );
};

export default EventRequestForm;
