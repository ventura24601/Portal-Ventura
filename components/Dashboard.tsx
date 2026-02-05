
import React, { useState, useEffect } from 'react';
import { 
  Package, Truck, CheckCircle, Clock, TrendingUp, Briefcase, 
  AlertTriangle, ArrowUpRight, BarChart3, Wrench, ChevronRight, 
  Loader2, AlertCircle, Calendar, DollarSign, ArrowRight, Play, Palette, Box, Hand, Gift, Flag, MessageSquare, User
} from 'lucide-react';
import { MOCK_EVENTS, MOCK_JOBS, MOCK_INVENTORY } from '../constants';
import { User as UserType, Job, JobStatus, DetailedEvent, JobInteraction } from '../types';
import { supabase, isSupabaseConfigured } from '../supabase';

interface DashboardProps {
  user: UserType;
}

const STAGES: { status: JobStatus; icon: any }[] = [
  { status: 'Aguardando Start', icon: Play },
  { status: 'Pedido em Produção', icon: Wrench },
  { status: 'Pedido em Personalização', icon: Palette },
  { status: 'Pedido no Estoque', icon: Box },
  { status: 'Em Manuseio', icon: Hand },
  { status: 'Embalagem', icon: Gift },
  { status: 'Job Finalizado', icon: Flag }
];

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [stats, setStats] = useState({
    events: 0,
    jobsInProduction: 0,
    pendingAcceptance: 0
  });
  const [activeJobs, setActiveJobs] = useState<Job[]>([]);
  const [pendingJobs, setPendingJobs] = useState<Job[]>([]);
  const [latestMessages, setLatestMessages] = useState<(JobInteraction & { job_description?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  const isClient = user.role === 'client';

  const fetchData = async () => {
    setLoading(true);
    if (!isSupabaseConfigured()) {
      const clientJobs = MOCK_JOBS.filter(j => j.company === user.company || !isClient);
      const inProd = clientJobs.filter(j => j.status !== 'Job Finalizado');
      const awaitingAcc = clientJobs.filter(j => j.status === 'Job Finalizado' && !j.orderAcceptanceNumber);
      
      setStats({
        events: MOCK_EVENTS.length,
        jobsInProduction: inProd.length,
        pendingAcceptance: awaitingAcc.length
      });
      setActiveJobs(inProd);
      setPendingJobs(awaitingAcc);
      setLatestMessages([]); // Mock sem mensagens por padrão
      setLoading(false);
      return;
    }

    try {
      let jobsQuery = supabase.from('jobs').select('*');
      let eventsQuery = supabase.from('events').select('*', { count: 'exact', head: true });
      
      // Busca as últimas 5 mensagens
      let messagesQuery = supabase
        .from('job_interactions')
        .select(`
          *,
          jobs (description)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (isClient) {
        jobsQuery = jobsQuery.eq('company', user.company);
        eventsQuery = eventsQuery.eq('company', user.company);
        // Para mensagens, precisaríamos de um join mais complexo ou filtrar via job_id no cliente
        // Simplificando: o cliente vê as mensagens dos jobs dele
      }

      const [jobsRes, eventsRes, messagesRes] = await Promise.all([jobsQuery, eventsQuery, messagesQuery]);

      if (jobsRes.data) {
        const allJobs: Job[] = jobsRes.data.map((db: any) => ({
          id: db.id,
          description: db.description,
          company: db.company,
          clientName: db.client_name,
          quantity: db.quantity,
          totalValue: db.total_value,
          status: db.status as JobStatus,
          orderAcceptanceNumber: db.order_acceptance_number,
          startDate: db.start_date
        }));

        const inProd = allJobs.filter(j => j.status !== 'Job Finalizado');
        const awaitingAcc = allJobs.filter(j => j.status === 'Job Finalizado' && !j.orderAcceptanceNumber);

        setStats({
          events: eventsRes.count || 0,
          jobsInProduction: inProd.length,
          pendingAcceptance: awaitingAcc.length
        });
        setActiveJobs(inProd);
        setPendingJobs(awaitingAcc);
      }

      if (messagesRes.data) {
        setLatestMessages(messagesRes.data.map((m: any) => ({
          ...m,
          job_description: m.jobs?.description
        })));
      }
    } catch (error) {
      console.error("Erro no dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const getStatusIndex = (status: JobStatus) => {
    const idx = STAGES.findIndex(s => s.status === status);
    return idx === -1 ? 0 : idx;
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-orange-500" size={48} />
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Carregando dados consolidados...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-800 tracking-tight">Olá, {user.name.split(' ')[0]}! 👋</h2>
          <p className="text-gray-500 text-sm font-medium">Acompanhe seus processos de produção e interações recentes.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchData} className="p-3 bg-white rounded-2xl border border-gray-100 text-gray-400 hover:text-orange-500 transition-all shadow-sm">
             <Loader2 size={20} className={loading ? "animate-spin" : ""} />
          </button>
          <div className="bg-white px-5 py-3 rounded-2xl border border-gray-100 flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest shadow-sm">
             <div className="w-2 h-2 rounded-full bg-green-500"></div>
             {isSupabaseConfigured() ? 'Cloud Sync Online' : 'Modo Demonstração'}
          </div>
        </div>
      </div>

      {/* KPI Cards - Reduzido para 3 colunas para dar mais destaque às mensagens abaixo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <StatCard 
          label="Jobs em Produção" 
          value={stats.jobsInProduction} 
          icon={Wrench} 
          color="blue" 
          subtext="Processos ativos na Ventura"
        />
        <StatCard 
          label="Pendências de Aceite" 
          value={stats.pendingAcceptance} 
          icon={AlertCircle} 
          color="orange" 
          subtext="Aguardando número bancário"
          highlight={stats.pendingAcceptance > 0}
        />
        <StatCard 
          label="Eventos Ativos" 
          value={stats.events} 
          icon={Package} 
          color="purple" 
          subtext="Solicitações de saída"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Production Monitor */}
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-white rounded-[3rem] border border-gray-100 shadow-xl overflow-hidden">
            <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
              <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest flex items-center gap-2">
                <TrendingUp size={18} className="text-blue-500" /> Monitor de Produção em Tempo Real
              </h3>
              <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase">{activeJobs.length} ATIVOS</span>
            </div>
            <div className="p-8 space-y-6">
              {activeJobs.length === 0 ? (
                <div className="py-20 text-center text-gray-400 italic font-bold">Nenhum job em produção no momento.</div>
              ) : (
                activeJobs.map(job => (
                  <div key={job.id} className="p-6 rounded-[2rem] border border-gray-50 hover:border-blue-100 hover:bg-blue-50/10 transition-all group">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center font-black text-[10px] text-gray-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                          #{job.id.split('-').pop()}
                        </div>
                        <div>
                          <h4 className="text-base font-black text-gray-800 group-hover:text-blue-700 transition-colors">{job.description}</h4>
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Iniciado em {job.startDate ? new Date(job.startDate).toLocaleDateString('pt-BR') : '-'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                         <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Status Atual</p>
                         <p className="text-xs font-black text-blue-600 uppercase">{job.status}</p>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="absolute inset-0 bg-blue-600 transition-all duration-1000" 
                        style={{ width: `${((getStatusIndex(job.status) + 1) / STAGES.length) * 100}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between mt-2">
                       <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest">{STAGES[0].status}</span>
                       <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest">{STAGES[STAGES.length-1].status}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* New Section: Últimas Mensagens de Observações */}
          <section className="bg-white rounded-[3rem] border border-gray-100 shadow-xl overflow-hidden">
            <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-white">
              <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest flex items-center gap-2">
                <MessageSquare size={18} className="text-orange-500" /> Últimas Mensagens & Observações
              </h3>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                <span className="text-[8px] font-black text-gray-300 uppercase">Tempo Real</span>
              </div>
            </div>
            <div className="p-8 space-y-4">
              {latestMessages.length === 0 ? (
                <div className="py-12 text-center text-gray-400 italic font-bold text-sm">Nenhuma interação recente registrada nos Jobs.</div>
              ) : (
                latestMessages.map(msg => (
                  <div key={msg.id} className="p-5 rounded-2xl bg-gray-50 border border-gray-100 flex gap-4 hover:bg-gray-100 transition-all">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${msg.user_role === 'Ventura' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                      <User size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                          {msg.user_name} • <span className={msg.user_role === 'Ventura' ? 'text-orange-600' : 'text-blue-600'}>{msg.user_role}</span>
                        </p>
                        <span className="text-[9px] font-bold text-gray-300">{new Date(msg.created_at).toLocaleDateString('pt-BR')} {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-[11px] font-black text-blue-900 uppercase tracking-tighter mb-2 truncate">Ref: {msg.job_description || 'Job #' + msg.job_id.slice(-4)}</p>
                      <p className="text-sm font-medium text-gray-700 leading-relaxed italic">"{msg.content}"</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Acceptance Pendencies */}
        <div className="space-y-8">
          <section className="bg-white rounded-[3rem] border border-gray-100 shadow-xl overflow-hidden h-full">
            <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-orange-50/30">
              <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest flex items-center gap-2">
                <AlertCircle size={18} className="text-orange-500" /> Atenção: Aceites Pendentes
              </h3>
            </div>
            <div className="p-8 space-y-4">
              {pendingJobs.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-center gap-4 opacity-50">
                  <CheckCircle size={48} className="text-green-500" />
                  <p className="text-gray-400 font-bold italic text-sm px-6">Tudo em dia! Você não tem jobs aguardando aceite bancário.</p>
                </div>
              ) : (
                pendingJobs.map(job => (
                  <div key={job.id} className="p-6 rounded-3xl bg-orange-50/50 border border-orange-100 flex flex-col gap-4 group hover:bg-orange-50 transition-all animate-in slide-in-from-right-4">
                    <div className="flex justify-between items-center">
                       <span className="text-[10px] font-black text-orange-600 bg-white px-3 py-1 rounded-lg border border-orange-100 shadow-sm">#{job.id.split('-').pop()}</span>
                       <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Finalizado</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-gray-800 leading-tight">{job.description}</h4>
                      <p className="text-lg font-black text-orange-700 mt-2">R$ {(job.totalValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="pt-2">
                      <p className="text-[9px] font-bold text-orange-400 italic mb-3">Este Job já foi concluído e está aguardando o seu Número de Aceite para que possamos faturar.</p>
                      <button className="w-full py-3 bg-orange-600 text-white font-black rounded-xl text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-orange-700 shadow-lg shadow-orange-500/10 transition-all">
                        Informar Aceite <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon: Icon, color, subtext, isText = false, highlight = false }: any) => (
  <div className={`bg-white p-8 rounded-[2.5rem] shadow-sm border transition-all ${highlight ? 'border-orange-200 ring-4 ring-orange-500/5' : 'border-gray-100 hover:shadow-md'}`}>
    <div className={`w-12 h-12 rounded-2xl bg-${color}-50 flex items-center justify-center mb-6`}>
      <Icon size={20} className={`text-${color}-600`} />
    </div>
    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">{label}</p>
    <h4 className={`text-3xl font-black truncate ${highlight ? 'text-orange-600' : 'text-gray-900'}`}>
      {isText ? value : (value || 0).toLocaleString('pt-BR')}
    </h4>
    <p className="text-[10px] font-bold text-gray-400 mt-3 italic">{subtext}</p>
  </div>
);

export default Dashboard;
