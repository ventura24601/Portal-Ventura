
import React, { useState, useEffect } from 'react';
import { Search, UserPlus, Mail, Shield, Calendar, MoreVertical, X, Save, CheckCircle, Clock, Loader2, AlertCircle, Key, Lock, Edit2, Eye, EyeOff } from 'lucide-react';
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
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    id: '',
    name: '',
    email: '',
    department: 'Comercial' as VenturaDepartment,
    role: 'backoffice',
    password: '',
    must_change_password: true
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

  const handleEditMember = (member: User) => {
    setError(null);
    setShowPassword(false);
    setFormData({
      id: member.id,
      name: member.name,
      email: member.email,
      department: (member.department as VenturaDepartment) || 'Comercial',
      role: member.role || 'backoffice',
      password: '',
      must_change_password: member.mustChangePassword ?? true
    });
    setIsModalOpen(true);
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      alert('Por favor, preencha nome e e-mail.');
      return;
    }

    setIsSubmitting(true);
    try {
      const isEditing = !!formData.id;
      
      const memberPayload: any = {
        name: formData.name,
        email: formData.email,
        company: 'Ventura Promocional',
        role: formData.role,
        department: formData.department,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name)}&background=1e293b&color=fff`
      };

      if (formData.password) {
        memberPayload.password = formData.password;
        memberPayload.must_change_password = formData.must_change_password;
      } else if (!isEditing) {
        memberPayload.password = 'Ventura123';
        memberPayload.must_change_password = true;
      }

      const { error: dbError } = isEditing 
        ? await supabase.from('members').update(memberPayload).eq('id', formData.id)
        : await supabase.from('members').insert([memberPayload]);

      if (dbError) throw dbError;

      alert(isEditing ? 'Colaborador atualizado!' : 'Colaborador cadastrado com sucesso!');
      setIsModalOpen(false);
      setFormData({ id: '', name: '', email: '', department: 'Comercial', role: 'backoffice', password: '', must_change_password: true });
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

  const inputClass = "w-full px-6 py-4 rounded-2xl border-2 border-gray-100 bg-white outline-none font-bold focus:border-[#1e293b] focus:ring-4 focus:ring-[#1e293b]/5 transition-all";
  const labelClass = "text-[11px] font-black text-gray-500 uppercase block mb-2 tracking-widest";

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1 max-w-md relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
          <input 
            type="text"
            placeholder="Buscar por nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-[#1e293b]/10 transition-all"
          />
        </div>
        <button 
          onClick={() => {
            setFormData({ id: '', name: '', email: '', department: 'Comercial', role: 'backoffice', password: '', must_change_password: true });
            setIsModalOpen(true);
          }}
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
                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status / Acesso</th>
                <th className="px-10 py-6"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredTeam.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50/30 transition-colors group">
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-5">
                      <img src={member.avatar || `https://ui-avatars.com/api/?name=${member.name}`} className="w-12 h-12 rounded-2xl object-cover border border-gray-100" />
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
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider">
                      {member.mustChangePassword ? (
                        <span className="flex items-center gap-1.5 text-orange-600 bg-orange-50 px-3 py-1 rounded-lg">
                          <AlertCircle size={14} /> Senha Pendente
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-gray-500">
                          <Clock size={14} className="text-gray-300" /> {member.lastLogin || 'Nunca logou'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-10 py-6 text-right">
                    <button 
                      onClick={() => handleEditMember(member)}
                      className="p-3 text-gray-300 hover:text-[#1e293b] hover:bg-gray-100 rounded-xl transition-all"
                    >
                      <Edit2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[130] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-xl max-h-[90vh] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
            <div className="p-10 border-b border-gray-100 flex justify-between items-center bg-gray-50/30 shrink-0">
              <h3 className="text-2xl font-black text-gray-800 tracking-tight uppercase">
                {formData.id ? 'Editar Colaborador' : 'Novo Colaborador'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-gray-100 rounded-full text-gray-400"><X size={28} /></button>
            </div>
            <form onSubmit={handleSaveMember} className="p-12 space-y-8 overflow-y-auto custom-scrollbar">
              <div className="space-y-6">
                <div>
                  <label className={labelClass}>Nome Completo</label>
                  <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>E-mail Corporativo</label>
                  <input type="email" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className={inputClass} />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className={labelClass}>Departamento</label>
                    <select value={formData.department} onChange={(e) => setFormData({...formData, department: e.target.value as VenturaDepartment})} className={inputClass}>
                      <option value="Comercial">Comercial</option>
                      <option value="Logística">Logística</option>
                      <option value="Produção">Produção</option>
                      <option value="Administrativo">Administrativo</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Permissão</label>
                    <select value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} className={inputClass}>
                      <option value="backoffice">Administrador</option>
                      <option value="viewer">Visualizador</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-50">
                   <div className="flex items-center gap-2 mb-4 text-[#1e293b]">
                      <Key size={18} />
                      <h4 className="font-black text-[10px] uppercase tracking-widest">Redefinição de Senha</h4>
                   </div>
                   <div className="space-y-4">
                      <div>
                        <label className={labelClass}>{formData.id ? 'Nova Senha (Opcional)' : 'Senha Inicial'}</label>
                        <div className="relative">
                          <input 
                            type={showPassword ? 'text' : 'password'}
                            value={formData.password}
                            onChange={(e) => setFormData({...formData, password: e.target.value})}
                            placeholder={formData.id ? "Deixe em branco para não alterar" : "Mínimo 6 caracteres"}
                            className={inputClass}
                          />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400">
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                        <input 
                          type="checkbox" 
                          id="teamMustChange"
                          className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                          checked={formData.must_change_password}
                          onChange={(e) => setFormData({...formData, must_change_password: e.target.checked})}
                        />
                        <label htmlFor="teamMustChange" className="text-xs font-bold text-gray-600 cursor-pointer">Exigir troca de senha no próximo login</label>
                      </div>
                   </div>
                </div>
              </div>
              <button type="submit" disabled={isSubmitting} className="w-full py-6 bg-[#1e293b] text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-2xl hover:bg-black flex items-center justify-center gap-3 transition-all disabled:opacity-50">
                {isSubmitting ? <Loader2 size={24} className="animate-spin" /> : <Save size={24} />} 
                {formData.id ? 'Salvar Alterações' : 'Efetivar Cadastro'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VenturaTeamManagement;
