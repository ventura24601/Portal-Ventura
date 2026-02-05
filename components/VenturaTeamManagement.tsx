
import React, { useState, useEffect } from 'react';
import { Search, UserPlus, Mail, Shield, Calendar, MoreVertical, X, Save, CheckCircle, Clock, Loader2, AlertCircle, Key, Lock } from 'lucide-react';
import { supabase } from '../supabase';
import { User, VenturaDepartment } from '../types';
import { MOCK_VENTURA_TEAM } from '../constants';

const VenturaTeamManagement: React.FC = () => {
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: 'Comercial' as VenturaDepartment,
    role: 'backoffice'
  });

  const fetchMembers = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('company', 'Ventura Promocional')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (!data || data.length === 0) {
        setTeamMembers(MOCK_VENTURA_TEAM);
      } else {
        const mappedData: User[] = data.map((m: any) => ({
          id: m.id,
          name: m.name,
          email: m.email,
          company: m.company,
          role: m.role,
          department: m.department,
          avatar: m.avatar,
          lastLogin: m.last_login,
          mustChangePassword: m.must_change_password
        }));
        setTeamMembers(mappedData);
      }
    } catch (err: any) {
      console.error('Erro ao buscar membros:', err);
      setError('Não foi possível sincronizar com o banco.');
      setTeamMembers(MOCK_VENTURA_TEAM);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      alert('Por favor, preencha nome e e-mail.');
      return;
    }

    setIsSubmitting(true);
    try {
      const newUser = {
        name: formData.name,
        email: formData.email,
        company: 'Ventura Promocional',
        role: formData.role,
        department: formData.department,
        password: 'Ventura123', // Senha padrão centralizada
        must_change_password: true,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name)}&background=1e293b&color=fff`,
        last_login: 'Primeiro Acesso Pendente'
      };

      const { error: insertError } = await supabase
        .from('members')
        .insert([newUser]);

      if (insertError) throw insertError;

      alert('Colaborador cadastrado com a senha padrão Ventura123. A troca será exigida no primeiro login.');
      setIsModalOpen(false);
      setFormData({ name: '', email: '', department: 'Comercial', role: 'backoffice' });
      await fetchMembers(); 
    } catch (err: any) {
      alert(`Erro ao salvar: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTeam = teamMembers.filter(u => 
    (u.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getDeptColor = (dept: VenturaDepartment) => {
    switch (dept) {
      case 'Administrativo': return 'bg-purple-100 text-purple-700';
      case 'Comercial': return 'bg-blue-100 text-blue-700';
      case 'Logística': return 'bg-orange-100 text-orange-700';
      case 'Produção': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h2 className="text-xl font-bold text-gray-800 tracking-tight">Equipe Ventura Promocional</h2>
           <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black mt-1">Gestão de credenciais de segurança</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-8 py-4 bg-[#1e293b] text-white font-black rounded-2xl shadow-lg hover:bg-black transition-all text-[10px] uppercase tracking-widest"
        >
          <UserPlus size={18} /> Cadastrar Colaborador
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden relative min-h-[400px]">
        {loading && <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex items-center justify-center"><Loader2 size={32} className="text-blue-600 animate-spin" /></div>}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Colaborador</th>
                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Departamento</th>
                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Acesso</th>
                <th className="px-10 py-6"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredTeam.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50/30 transition-colors">
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-5">
                      <img src={member.avatar} className="w-12 h-12 rounded-2xl object-cover border border-gray-100" />
                      <div>
                        <div className="text-sm font-black text-gray-800">{member.name}</div>
                        <div className="text-[11px] text-gray-400 font-bold">{member.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-6">
                    <span className={`px-4 py-1.5 text-[9px] font-black rounded-xl uppercase tracking-widest ${getDeptColor(member.department || 'Administrativo')}`}>
                      {member.department}
                    </span>
                  </td>
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-2 text-xs text-gray-500 font-bold">
                      <Clock size={14} className={member.mustChangePassword ? "text-orange-400" : "text-gray-300"} />
                      <span className={member.mustChangePassword ? "text-orange-600 italic" : ""}>
                        {member.mustChangePassword ? 'Aguardando Nova Senha' : member.lastLogin}
                      </span>
                    </div>
                  </td>
                  <td className="px-10 py-6 text-right">
                    <button className="p-3 text-gray-300 hover:text-gray-900"><MoreVertical size={20} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[130] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-10 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
              <h3 className="text-2xl font-black text-gray-800 tracking-tight">Novo Colaborador</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-gray-100 rounded-full text-gray-400"><X size={28} /></button>
            </div>
            <form onSubmit={handleInviteMember} className="p-12 space-y-8">
              <div className="bg-orange-50 p-6 rounded-2xl border border-orange-100 mb-2">
                <p className="text-[10px] font-black text-orange-700 uppercase tracking-widest">Senha Provisória</p>
                <p className="text-xs text-orange-600 font-bold mt-1">Este usuário será criado com a senha provisória padrão: <span className="font-black">Ventura123</span>.</p>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="text-[11px] font-black text-gray-500 uppercase block mb-2 tracking-widest">Nome Completo</label>
                  <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-6 py-4 rounded-2xl border-2 border-gray-100 bg-white outline-none font-bold" />
                </div>
                <div>
                  <label className="text-[11px] font-black text-gray-500 uppercase block mb-2 tracking-widest">E-mail Corporativo</label>
                  <input type="email" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full px-6 py-4 rounded-2xl border-2 border-gray-100 bg-white outline-none font-bold" />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-[11px] font-black text-gray-500 uppercase block mb-2 tracking-widest">Departamento</label>
                    <select value={formData.department} onChange={(e) => setFormData({...formData, department: e.target.value as VenturaDepartment})} className="w-full px-6 py-4 rounded-2xl border-2 border-gray-100 bg-white font-bold">
                      <option value="Comercial">Comercial</option>
                      <option value="Logística">Logística</option>
                      <option value="Produção">Produção</option>
                      <option value="Administrativo">Administrativo</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-black text-gray-500 uppercase block mb-2 tracking-widest">Permissão</label>
                    <select value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} className="w-full px-6 py-4 rounded-2xl border-2 border-gray-100 bg-white font-bold">
                      <option value="backoffice">Administrador</option>
                      <option value="viewer">Visualizador</option>
                    </select>
                  </div>
                </div>
              </div>
              <button type="submit" disabled={isSubmitting} className="w-full py-6 bg-[#1e293b] text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-2xl hover:bg-black flex items-center justify-center gap-3 transition-all disabled:opacity-50">
                {isSubmitting ? <Loader2 size={24} className="animate-spin" /> : <Save size={24} />} Efetivar Cadastro
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VenturaTeamManagement;
