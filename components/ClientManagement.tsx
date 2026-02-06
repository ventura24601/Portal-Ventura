
import React, { useState, useEffect } from 'react';
import { Search, UserPlus, Mail, Building, X, Save, Loader2, MoreVertical, ShieldCheck, Database, AlertCircle, Plus, LayoutPanelTop, Edit2, Key, Eye, EyeOff } from 'lucide-react';
import { MOCK_CLIENTS } from '../constants';
import { supabase, isSupabaseConfigured } from '../supabase';
import { Institution } from '../types';

const ClientManagement: React.FC = () => {
  const [clients, setClients] = useState<any[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInstModalOpen, setIsInstModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [newClient, setNewClient] = useState({
    id: '',
    name: '',
    email: '',
    company: '',
    department: '',
    role: 'client',
    password: '',
    must_change_password: true
  });

  const [newInstData, setNewInstData] = useState({
    name: '',
    department: ''
  });

  const parseSupabaseError = (err: any): string => {
    if (!err) return 'Erro desconhecido';
    if (typeof err === 'string') return err;
    if (typeof err === 'object') {
      let msg = err.message || err.error_description || err.error || 'Erro no banco';
      if (err.details) msg += ` (${err.details})`;
      return msg;
    }
    return JSON.stringify(err);
  };

  const fetchInstitutions = async () => {
    if (!isSupabaseConfigured()) {
      setInstitutions([
        { id: '1', name: 'Banco Parceiro 01', department: 'Marketing', createdAt: '' },
        { id: '2', name: 'Cliente Corporativo', department: 'Sede Administrativa', createdAt: '' }
      ]);
      return;
    }
    try {
      const { data, error } = await supabase.from('institutions').select('*').order('name');
      if (error) throw error;
      setInstitutions(data || []);
      if (data && data.length > 0 && !newClient.company) {
        setNewClient(prev => ({ ...prev, company: data[0].name, department: data[0].department || '' }));
      }
    } catch (err) {
      console.error("Erro ao buscar instituições:", err);
    }
  };

  const fetchClients = async () => {
    setLoading(true);
    setErrorMessage(null);
    
    if (!isSupabaseConfigured()) {
      setClients(MOCK_CLIENTS);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .neq('company', 'Ventura Promocional')
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (err: any) {
      setErrorMessage(parseSupabaseError(err));
      setClients(MOCK_CLIENTS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
    fetchInstitutions();
  }, []);

  const handleEditClient = (client: any) => {
    setErrorMessage(null);
    setShowPassword(false);
    setNewClient({
      id: client.id,
      name: client.name,
      email: client.email,
      company: client.company,
      department: client.department || '',
      role: client.role || 'client',
      password: '',
      must_change_password: client.must_change_password ?? true
    });
    setIsModalOpen(true);
  };

  const handleSaveInstitution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInstData.name.trim()) return;

    setIsSaving(true);
    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase.from('institutions').insert([{ 
          name: newInstData.name.trim(),
          department: newInstData.department.trim()
        }]);
        if (error) throw error;
        alert('Instituição cadastrada com sucesso!');
        setNewInstData({ name: '', department: '' });
        setIsInstModalOpen(false);
        await fetchInstitutions();
      } else {
        alert('Modo Simulação: Instituição adicionada localmente.');
        setIsInstModalOpen(false);
      }
    } catch (err: any) {
      setErrorMessage(parseSupabaseError(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.name || !newClient.email || !newClient.company) {
      alert("Preencha todos os campos obrigatórios.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      if (isSupabaseConfigured()) {
        const isEditing = !!newClient.id;
        
        const clientPayload: any = {
          name: newClient.name,
          email: newClient.email,
          company: newClient.company,
          role: 'client',
          department: newClient.department || 'Atendimento Corporativo',
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(newClient.name)}&background=EC7000&color=fff`
        };

        if (newClient.password) {
          clientPayload.password = newClient.password;
          clientPayload.must_change_password = newClient.must_change_password;
        } else if (!isEditing) {
          clientPayload.password = 'Ventura123';
          clientPayload.must_change_password = true;
        }

        const { error } = isEditing 
          ? await supabase.from('members').update(clientPayload).eq('id', newClient.id)
          : await supabase.from('members').insert([clientPayload]);

        if (error) throw error;
        
        setIsModalOpen(false);
        setNewClient({ id: '', name: '', email: '', company: '', department: '', role: 'client', password: '', must_change_password: true });
        await fetchClients(); 
        alert(isEditing ? 'Dados do cliente atualizados!' : 'Cliente cadastrado com sucesso!');
      } else {
        alert('Modo Simulação: Operação realizada localmente.');
        setIsModalOpen(false);
      }
    } catch (err: any) {
      setErrorMessage(parseSupabaseError(err));
    } finally {
      setIsSaving(false);
    }
  };

  const filteredClients = clients.filter(c => 
    (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const inputClass = "w-full px-6 py-4 bg-white border-2 border-gray-200 rounded-2xl text-base font-bold text-gray-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 outline-none transition-all placeholder:text-gray-400 shadow-sm";
  const labelClass = "block text-[11px] font-black text-gray-500 mb-2 uppercase tracking-widest";

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 p-6 rounded-[2rem] flex items-start gap-4 text-red-700 shadow-lg animate-in slide-in-from-top-4">
          <AlertCircle size={24} className="shrink-0 mt-1" />
          <div className="flex-1">
            <p className="font-black uppercase text-[10px] tracking-widest mb-1">Erro</p>
            <p className="text-sm font-bold leading-relaxed">{errorMessage}</p>
          </div>
          <button onClick={() => setErrorMessage(null)} className="p-2 hover:bg-red-100 rounded-full transition-colors"><X size={20} /></button>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar clientes externos..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold text-gray-800 focus:bg-white focus:border-blue-200 transition-all shadow-inner"
          />
        </div>
        <div className="flex gap-3">
          <button 
            onClick={fetchClients} 
            disabled={loading}
            className="p-4 bg-gray-50 text-gray-400 rounded-2xl hover:text-blue-600 transition-colors shadow-sm"
          >
            <Loader2 size={22} className={loading ? "animate-spin" : ""} />
          </button>
          <button 
            onClick={() => { setErrorMessage(null); setIsInstModalOpen(true); }}
            className="flex items-center gap-2 px-6 py-4 text-blue-600 font-black rounded-2xl shadow-sm bg-blue-50 border border-blue-100 text-xs uppercase tracking-widest hover:bg-blue-100 transition-all"
          >
            <Plus size={18} /> Nova Instituição
          </button>
          <button 
            onClick={() => { 
              setErrorMessage(null); 
              setNewClient({ id: '', name: '', email: '', company: institutions[0]?.name || '', department: '', role: 'client', password: '', must_change_password: true });
              setIsModalOpen(true); 
            }}
            className="flex items-center gap-2 px-8 py-4 text-white font-black rounded-2xl shadow-lg bg-[#004481] text-xs uppercase tracking-widest hover:bg-blue-900 transition-all"
          >
            <UserPlus size={18} /> Novo Cliente
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] border border-gray-100 shadow-xl overflow-hidden relative min-h-[500px]">
        {loading && <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={32} /></div>}
        
        <div className="p-8 border-b border-gray-100 flex items-center gap-3">
           <Database size={20} className="text-orange-500" />
           <h3 className="font-black text-[10px] uppercase tracking-widest text-gray-400">Membros & Clientes Externos</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Colaborador</th>
                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Instituição</th>
                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Departamento</th>
                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Acesso</th>
                <th className="px-10 py-6"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredClients.length === 0 ? (
                <tr><td colSpan={5} className="px-10 py-20 text-center text-gray-400 font-bold italic">Sem registros.</td></tr>
              ) : (
                filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-5">
                        <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center font-black text-xl border border-orange-100">
                          {client.avatar ? <img src={client.avatar} className="w-full h-full object-cover rounded-2xl" /> : client.name?.charAt(0)}
                        </div>
                        <div>
                          <div className="text-base font-black text-gray-900">{client.name}</div>
                          <div className="text-xs text-gray-500 font-bold">{client.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      <span className="px-4 py-1.5 bg-blue-50 text-blue-700 text-[10px] font-black rounded-xl uppercase border border-blue-100">{client.company}</span>
                    </td>
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-2">
                        <LayoutPanelTop size={14} className="text-orange-500" />
                        <span className="text-xs font-black text-gray-700 uppercase">{client.department || '-'}</span>
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-2 text-xs font-black text-green-600">
                        {client.must_change_password ? <AlertCircle size={16} className="text-orange-500" /> : <ShieldCheck size={16} />} 
                        {client.must_change_password ? 'Primeiro Acesso Pendente' : 'ATIVO'}
                      </div>
                    </td>
                    <td className="px-10 py-6 text-right">
                      <button 
                        onClick={() => handleEditClient(client)}
                        className="p-3 text-gray-300 hover:text-[#EC7000] hover:bg-orange-50 rounded-xl transition-all flex items-center gap-2"
                      >
                        <Edit2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isInstModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[150] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3.5rem] w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-10 border-b border-gray-100 flex justify-between items-center bg-white shrink-0">
              <h3 className="text-2xl font-black text-gray-800 tracking-tight uppercase">Nova Instituição</h3>
              <button onClick={() => setIsInstModalOpen(false)} className="p-3 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"><X size={32} /></button>
            </div>
            <form onSubmit={handleSaveInstitution} className="p-12 space-y-6 bg-white overflow-y-auto custom-scrollbar">
              <div>
                <label className={labelClass}>Nome da Empresa / Unidade</label>
                <input type="text" required autoFocus className={inputClass} value={newInstData.name} onChange={(e) => setNewInstData({...newInstData, name: e.target.value})} placeholder="Ex: Empresa de Investimentos" />
              </div>
              <div>
                <label className={labelClass}>Departamento Principal</label>
                <input type="text" required className={inputClass} value={newInstData.department} onChange={(e) => setNewInstData({...newInstData, department: e.target.value})} placeholder="Ex: Marketing Institucional" />
              </div>
              <div className="pt-8 flex flex-col gap-4">
                <button 
                  type="submit" disabled={isSaving}
                  className="w-full py-6 bg-blue-600 text-white font-black rounded-2xl shadow-xl flex items-center justify-center gap-3 text-xs uppercase tracking-widest hover:bg-blue-700 transition-all"
                >
                  {isSaving ? <Loader2 className="animate-spin" size={24} /> : <Save size={24} />} Gravar Instituição
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[150] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3.5rem] w-full max-w-xl max-h-[90vh] shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col">
            <div className="p-10 border-b border-gray-100 flex justify-between items-center bg-white shrink-0">
              <h3 className="text-2xl font-black text-gray-800 tracking-tight uppercase">
                {newClient.id ? 'Editar Cliente Externo' : 'Novo Cliente Externo'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"><X size={32} /></button>
            </div>
            
            <form onSubmit={handleSaveClient} className="p-12 space-y-6 bg-white overflow-y-auto custom-scrollbar">
              <div>
                <label className={labelClass}>Nome Completo</label>
                <input type="text" required className={inputClass} value={newClient.name} onChange={(e) => setNewClient({...newClient, name: e.target.value})} />
              </div>
              <div>
                <label className={labelClass}>E-mail Corporativo</label>
                <input type="email" required className={inputClass} value={newClient.email} onChange={(e) => setNewClient({...newClient, email: e.target.value})} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={labelClass}>Instituição / Unidade</label>
                  <select className={inputClass} value={newClient.company} onChange={(e) => {
                    const inst = institutions.find(i => i.name === e.target.value);
                    setNewClient({...newClient, company: e.target.value, department: inst?.department || ''});
                  }}>
                    {institutions.length === 0 ? (
                      <option value="" disabled>Carregando instituições...</option>
                    ) : (
                      institutions.map(inst => (
                        <option key={inst.id} value={inst.name}>{inst.name}</option>
                      ))
                    )}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Departamento</label>
                  <input type="text" required className={inputClass} value={newClient.department} onChange={(e) => setNewClient({...newClient, department: e.target.value})} placeholder="Setor do cliente" />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2 mb-4 text-orange-600">
                   <Key size={18} />
                   <h4 className="font-black text-[10px] uppercase tracking-widest">Segurança & Acesso</h4>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>{newClient.id ? 'Redefinir Senha' : 'Senha de Acesso'}</label>
                    <div className="relative">
                      <input 
                        type={showPassword ? 'text' : 'password'} 
                        className={inputClass} 
                        value={newClient.password} 
                        onChange={(e) => setNewClient({...newClient, password: e.target.value})} 
                        placeholder={newClient.id ? "Deixe em branco para não alterar" : "Senha inicial"}
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400">
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <input 
                      type="checkbox" 
                      id="mustChange"
                      className="w-5 h-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500" 
                      checked={newClient.must_change_password}
                      onChange={(e) => setNewClient({...newClient, must_change_password: e.target.checked})}
                    />
                    <label htmlFor="mustChange" className="text-xs font-bold text-gray-600 cursor-pointer">Exigir troca de senha no próximo login</label>
                  </div>
                </div>
              </div>

              <div className="pt-8 flex flex-col gap-4 sticky bottom-0 bg-white">
                <button 
                  type="submit" disabled={isSaving}
                  className="w-full py-6 bg-[#004481] text-white font-black rounded-2xl shadow-xl flex items-center justify-center gap-3 text-xs uppercase tracking-widest hover:bg-blue-900 transition-all"
                >
                  {isSaving ? <Loader2 className="animate-spin" size={24} /> : <Save size={24} />} 
                  {newClient.id ? 'Salvar Alterações' : 'Gravar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientManagement;
