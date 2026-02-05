
import React, { useState } from 'react';
import { LogIn, ShieldCheck, Briefcase, UserCircle, ArrowRight, KeyRound, Lock, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';
import { ITAU_THEME, MOCK_USERS } from '../constants';
import { User } from '../types';
import { supabase, isSupabaseConfigured } from '../supabase';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [view, setView] = useState<'login' | 'change-password'>('login');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [tempUser, setTempUser] = useState<User | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('members')
          .select('*')
          .eq('email', email)
          .eq('password', password)
          .single();

        if (error || !data) {
          alert('E-mail ou senha incorretos.');
          setLoading(false);
          return;
        }

        const user: User = {
          id: data.id,
          name: data.name,
          email: data.email,
          company: data.company,
          role: data.role,
          avatar: data.avatar,
          department: data.department,
          mustChangePassword: data.must_change_password
        };

        if (user.mustChangePassword) {
          setTempUser(user);
          setView('change-password');
        } else {
          // Atualiza o last_login ao logar com sucesso
          await supabase.from('members').update({ last_login: new Date().toLocaleString('pt-BR') }).eq('id', user.id);
          onLogin(user);
        }
      } catch (err) {
        alert('Erro ao realizar login. Verifique sua conexão.');
      }
    } else {
      // Fallback demo logic
      const mockUser = email.includes('itau') ? MOCK_USERS.client_demo : MOCK_USERS.ventura_admin;
      const userWithFlag = { ...mockUser, mustChangePassword: email.includes('primeiro') };
      
      if (userWithFlag.mustChangePassword) {
        setTempUser(userWithFlag);
        setView('change-password');
      } else {
        onLogin(userWithFlag);
      }
    }
    setLoading(false);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert('As senhas não coincidem.');
      return;
    }
    if (newPassword.length < 6) {
      alert('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      if (isSupabaseConfigured() && tempUser) {
        const { error } = await supabase
          .from('members')
          .update({ 
            password: newPassword, 
            must_change_password: false,
            last_login: new Date().toLocaleString('pt-BR')
          })
          .eq('id', tempUser.id);
        
        if (error) throw error;
      }

      alert('Sua nova senha foi salva com sucesso!');
      if (tempUser) onLogin({ ...tempUser, mustChangePassword: false });
    } catch (err) {
      alert('Erro ao salvar nova senha.');
    } finally {
      setLoading(false);
    }
  };

  if (view === 'change-password') {
    return (
      <div className="min-h-screen bg-[#1e293b] flex items-center justify-center p-6 font-sans">
        <div className="bg-white rounded-[3.5rem] w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
           <div className="p-12 text-center bg-gray-50/50 border-b border-gray-100">
              <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                <KeyRound size={40} />
              </div>
              <h2 className="text-3xl font-black text-gray-900 tracking-tight">Primeiro Acesso</h2>
              <p className="text-gray-500 font-medium mt-2">Olá {tempUser?.name.split(' ')[0]}, por segurança, defina uma nova senha pessoal.</p>
           </div>
           
           <form onSubmit={handlePasswordChange} className="p-12 space-y-8">
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Nova Senha</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="w-full pl-12 pr-12 py-5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all font-bold text-gray-900" 
                      placeholder="Mínimo 6 caracteres"
                    />
                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Confirmar Nova Senha</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="w-full pl-12 pr-12 py-5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all font-bold text-gray-900" 
                      placeholder="Repita a senha"
                    />
                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 flex items-start gap-4">
                 <ShieldCheck className="text-blue-600 shrink-0" size={20} />
                 <p className="text-[11px] text-blue-700 font-bold leading-relaxed">Sua nova senha substituirá a senha provisória padrão.</p>
              </div>

              <button 
                type="submit"
                disabled={loading || !newPassword || newPassword !== confirmPassword}
                className="w-full py-6 bg-orange-600 text-white font-black rounded-2xl shadow-xl shadow-orange-500/20 hover:bg-orange-700 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-xs disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />} DEFINIR E ACESSAR
              </button>
           </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col md:flex-row overflow-hidden font-sans">
      <div className="md:w-1/2 bg-[#1e293b] p-12 md:p-24 flex flex-col justify-between text-white relative">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full border-[60px] border-orange-500 blur-3xl"></div>
          <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] rounded-full border-[40px] border-blue-500 blur-2xl"></div>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-16">
            <div className="w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center shadow-lg font-black text-2xl">V</div>
            <span className="text-2xl font-black tracking-tighter text-white">VENTURA <span className="text-orange-500">PROMOCIONAL</span></span>
          </div>

          <div className="space-y-6">
            <h1 className="text-5xl md:text-6xl font-black leading-none">
              Portal de Gestão <br />
              <span className="text-orange-500">Logística & Eventos</span>
            </h1>
            <p className="text-lg text-gray-400 max-w-md font-medium leading-relaxed">
              Plataforma exclusiva para o gerenciamento de estoques e faturamento de eventos do Banco Itaú.
            </p>
          </div>
        </div>

        <div className="relative z-10 pt-12 flex items-center gap-8 text-xs font-black uppercase tracking-widest text-gray-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-green-500" size={16} /> SSO Habilitado
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-green-500" size={16} /> Conexão Segura
          </div>
        </div>
      </div>

      <div className="md:w-1/2 p-8 md:p-24 flex items-center justify-center bg-white">
        <div className="max-w-md w-full animate-in fade-in slide-in-from-right-8 duration-700">
          <div className="mb-10 text-center md:text-left">
            <h2 className="text-3xl font-black text-gray-900 mb-2">Seja bem-vindo.</h2>
            <p className="text-gray-500 font-medium">Insira suas credenciais para acessar o ambiente restrito.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">E-mail Corporativo</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-orange-500/20 outline-none transition-all font-bold text-gray-700" 
                placeholder="nome@itau-unibanco.com.br"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Senha</label>
              <div className="relative">
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-5 pr-12 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-orange-500/20 outline-none transition-all font-bold text-gray-700" 
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-orange-500 transition-colors">
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-[#EC7000] text-white font-black rounded-2xl shadow-xl shadow-orange-500/20 hover:bg-orange-600 transition-all flex items-center justify-center gap-3 mt-4 group disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : 'ACESSAR PORTAL'} 
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <div className="mt-12 text-center">
             <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Suporte técnico Ventura</p>
             <p className="text-xs font-black text-blue-600 mt-1 cursor-pointer hover:underline">suporte@venturapromocional.com.br</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
