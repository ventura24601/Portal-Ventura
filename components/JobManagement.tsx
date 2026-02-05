
import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Briefcase, CheckCircle2, X, ImageIcon, Loader2, ListChecks, 
  Building2, User, ChevronRight, Calendar, Package, 
  Clock, Play, Wrench, Palette, Box, Hand, Gift, Flag, Info, DollarSign, Edit3, Save, MessageSquare, Tag, ReceiptText, AlertTriangle, Send, Archive, ArchiveRestore
} from 'lucide-react';
import { MOCK_JOBS } from '../constants';
import { Job, JobStatus, User as UserType, JobInteraction } from '../types';
import { supabase, isSupabaseConfigured } from '../supabase';

interface JobManagementProps {
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

const JobManagement: React.FC<JobManagementProps> = ({ user }) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [quickAcceptance, setQuickAcceptance] = useState('');
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  
  const [interactions, setInteractions] = useState<JobInteraction[]>([]);
  const [newInteraction, setNewInteraction] = useState('');
  const [isSendingInteraction, setIsSendingInteraction] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isBackoffice = user.role === 'backoffice';

  const fetchJobs = async () => {
    setLoading(true);
    if (!isSupabaseConfigured()) {
      setJobs(MOCK_JOBS);
      setLoading(false);
      return;
    }

    try {
      let query = supabase.from('jobs').select('*');
      if (!isBackoffice) {
        query = query.eq('company', user.company);
      }
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;

      setJobs((data || []).map((db: any) => ({
        id: db.id,
        description: db.description,
        company: db.company,
        clientId: db.client_id,
        clientName: db.client_name,
        quantity: db.quantity || 0,
        totalValue: db.total_value || 0,
        startDate: db.start_date,
        status: (db.status || 'Aguardando Start') as JobStatus,
        paymentStatus: db.payment_status,
        isArchived: db.is_archived || false,
        orderAcceptanceNumber: db.order_acceptance_number,
        notes: db.notes,
        attachments: db.attachments || [],
        finishedAt: db.finished_at
      })));
    } catch (err) {
      console.error("Erro ao carregar Jobs:", err);
      setJobs(MOCK_JOBS);
    } finally {
      setLoading(false);
    }
  };

  const updateJobStatus = async (jobId: string, newStatus: JobStatus) => {
    setIsUpdating(true);
    try {
      if (isSupabaseConfigured()) {
        const payload: any = { status: newStatus };
        if (newStatus === 'Job Finalizado') {
          payload.finished_at = new Date().toISOString();
        }
        const { error } = await supabase.from('jobs').update(payload).eq('id', jobId);
        if (error) throw error;
        await fetchJobs();
        if (selectedJob?.id === jobId) {
          setSelectedJob(prev => prev ? { ...prev, status: newStatus } : null);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleArchiveJob = async (jobId: string, currentState: boolean) => {
    setIsUpdating(true);
    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase
          .from('jobs')
          .update({ is_archived: !currentState })
          .eq('id', jobId);
        
        if (error) throw error;
        await fetchJobs();
        if (selectedJob?.id === jobId) {
          setSelectedJob(prev => prev ? { ...prev, isArchived: !currentState } : null);
        }
        alert(currentState ? 'Job restaurado com sucesso!' : 'Job arquivado com sucesso!');
      } else {
        setJobs(jobs.map(j => j.id === jobId ? { ...j, isArchived: !currentState } : j));
        alert(currentState ? 'Job restaurado (Simulação)' : 'Job arquivado (Simulação)');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao alterar estado de arquivamento.');
    } finally {
      setIsUpdating(false);
    }
  };

  const saveQuickAcceptance = async () => {
    if (!selectedJob || !quickAcceptance) return;
    setIsUpdating(true);
    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase
          .from('jobs')
          .update({ 
            order_acceptance_number: quickAcceptance,
            payment_status: 'Faturado',
            acceptance_at: new Date().toISOString()
          })
          .eq('id', selectedJob.id);
        
        if (error) throw error;
        alert('Número de Aceite registrado!');
        await fetchJobs();
        setSelectedJob(prev => prev ? { ...prev, orderAcceptanceNumber: quickAcceptance, paymentStatus: 'Faturado' } : null);
      }
    } catch (err) {
      alert("Erro ao gravar aceite bancário.");
    } finally {
      setIsUpdating(false);
    }
  };

  const fetchJobInteractions = async (jobId: string) => {
    if (!isSupabaseConfigured()) return;
    try {
      const { data, error } = await supabase
        .from('job_interactions')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setInteractions(data || []);
      
      setTimeout(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }, 100);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendInteraction = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newInteraction.trim() || !selectedJob) return;

    setIsSendingInteraction(true);
    try {
      if (isSupabaseConfigured()) {
        const payload = {
          job_id: selectedJob.id,
          user_id: user.id,
          user_name: user.name,
          user_role: user.role === 'backoffice' ? 'Ventura' : 'Cliente',
          content: newInteraction.trim()
        };

        const { data, error } = await supabase.from('job_interactions').insert([payload]).select().single();
        if (error) throw error;
        
        setInteractions([...interactions, data]);
        setNewInteraction('');
        setTimeout(() => {
          if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }, 100);
      }
    } catch (err) {
      alert("Erro ao enviar mensagem.");
    } finally {
      setIsSendingInteraction(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [user]);

  const filteredJobs = jobs.filter(j => {
    const matchesSearch = (j.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesArchiveStatus = showArchived ? j.isArchived : !j.isArchived;
    return matchesSearch && matchesArchiveStatus;
  });

  const getStatusIndex = (status: JobStatus) => STAGES.findIndex(s => s.status === status) || 0;

  const ProgressBar = ({ currentStatus, compact = false }: { currentStatus: JobStatus, compact?: boolean }) => {
    const currentIndex = getStatusIndex(currentStatus);
    return (
      <div className={`w-full ${compact ? 'py-4' : 'py-10'}`}>
        <div className="relative flex items-center justify-between">
          {/* Linha de fundo */}
          <div className="absolute left-0 top-5 -translate-y-1/2 w-full h-1 bg-gray-100 rounded-full z-0"></div>
          {/* Linha de progresso ativa */}
          <div 
            className="absolute left-0 top-5 -translate-y-1/2 h-1 bg-[#EC7000] rounded-full z-0 transition-all duration-700"
            style={{ width: `${(currentIndex / (STAGES.length - 1)) * 100}%` }}
          ></div>
          
          {STAGES.map((stage, idx) => {
            const isCompleted = idx < currentIndex;
            const isCurrent = idx === currentIndex;
            const Icon = stage.icon;
            
            // Lógica de exibição da legenda: 
            // - No modo compacto (card), mostramos apenas a legenda do estágio atual.
            // - No modo detalhado (modal), mostramos todas.
            const shouldShowLabel = !compact || isCurrent;

            return (
              <div key={stage.status} className="relative z-10 flex flex-col items-center">
                {/* Círculo do Ícone */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isCompleted ? 'bg-[#EC7000] text-white shadow-lg' : isCurrent ? 'bg-white border-4 border-[#EC7000] text-[#EC7000] scale-125 shadow-xl' : 'bg-white border-2 border-gray-100 text-gray-200'}`}>
                  <Icon size={isCurrent ? 18 : 16} strokeWidth={3} />
                </div>
                
                {/* Legenda (Texto do Status) */}
                {shouldShowLabel && (
                  <div className={`absolute top-12 whitespace-nowrap text-center animate-in fade-in duration-500`}>
                    <p className={`text-[7px] font-black uppercase tracking-tighter leading-none ${isCurrent ? 'text-[#EC7000]' : isCompleted ? 'text-gray-600' : 'text-gray-300'}`}>
                      {stage.status}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex-1 relative w-full">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Pesquisar Jobs..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-14 pr-6 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-[#EC7000]/20 transition-all"
          />
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
          {isBackoffice && (
            <button 
              onClick={() => setShowArchived(!showArchived)}
              className={`flex-1 md:flex-none px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border ${showArchived ? 'bg-gray-900 text-white border-gray-900 shadow-lg' : 'bg-white text-gray-400 border-gray-100 hover:bg-gray-50'}`}
            >
              {showArchived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
              {showArchived ? 'Exibir Ativos' : 'Exibir Arquivados'}
            </button>
          )}
          <button onClick={fetchJobs} className="p-4 bg-gray-50 text-gray-400 rounded-2xl hover:text-[#EC7000] transition-colors shadow-sm">
            <Loader2 size={20} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {filteredJobs.length === 0 ? (
          <div className="xl:col-span-2 py-32 text-center bg-white rounded-[3rem] border border-dashed border-gray-200">
            <p className="text-gray-400 font-bold italic">Nenhum job {showArchived ? 'arquivado' : 'ativo'} encontrado.</p>
          </div>
        ) : (
          filteredJobs.map((job) => (
            <div 
              key={job.id}
              onClick={() => { 
                setSelectedJob(job); 
                setQuickAcceptance(job.orderAcceptanceNumber || '');
                fetchJobInteractions(job.id);
                setIsDetailsOpen(true); 
              }}
              className={`bg-white p-8 rounded-[3rem] border transition-all cursor-pointer group hover:shadow-xl relative overflow-hidden ${job.isArchived ? 'opacity-70 grayscale-[0.3]' : ''} ${job.status === 'Job Finalizado' && !job.orderAcceptanceNumber ? 'border-orange-200 shadow-orange-100' : 'border-gray-100 shadow-sm'}`}
            >
              {job.isArchived && (
                <div className="absolute top-4 right-8 bg-gray-900 text-white px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest z-10">
                  Arquivado
                </div>
              )}
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${job.isArchived ? 'bg-gray-100 text-gray-400' : 'bg-orange-50 text-[#EC7000]'}`}>#{job.id.split('-').pop()}</div>
                  <div>
                    <h4 className="text-lg font-black text-gray-800">{job.description}</h4>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{job.company}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-gray-900">R$ {(job.totalValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  <span className={`text-[8px] font-black uppercase tracking-widest ${job.status === 'Job Finalizado' ? 'text-green-600' : 'text-orange-500'}`}>{job.status}</span>
                </div>
              </div>
              <ProgressBar currentStatus={job.status} compact />
            </div>
          ))
        )}
      </div>

      {isDetailsOpen && selectedJob && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[150] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-5xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            {/* Header Fixo */}
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-white shrink-0 z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-50 text-[#EC7000] rounded-2xl flex items-center justify-center shadow-inner">
                  <Briefcase size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-800 tracking-tight leading-none">
                    {selectedJob.description}
                    {selectedJob.isArchived && <span className="ml-3 px-3 py-1 bg-gray-900 text-white rounded-full text-[9px] uppercase tracking-widest">Arquivado</span>}
                  </h3>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">Detalhamento da Produção</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {isBackoffice && selectedJob.status === 'Job Finalizado' && (
                  <button 
                    onClick={() => toggleArchiveJob(selectedJob.id, selectedJob.isArchived || false)}
                    disabled={isUpdating}
                    title={selectedJob.isArchived ? "Restaurar Job" : "Arquivar Job"}
                    className={`p-3 rounded-full transition-all flex items-center justify-center ${selectedJob.isArchived ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' : 'bg-gray-50 text-gray-400 hover:bg-gray-200'}`}
                  >
                    {selectedJob.isArchived ? <ArchiveRestore size={24} /> : <Archive size={24} />}
                  </button>
                )}
                <button onClick={() => setIsDetailsOpen(false)} className="p-3 hover:bg-red-50 hover:text-red-600 rounded-full text-gray-400 transition-all"><X size={32} /></button>
              </div>
            </div>

            {/* Conteúdo Rolável */}
            <div className="flex-1 p-8 bg-gray-50/30 overflow-y-auto space-y-8 min-h-0">
              {/* Progresso */}
              <div className="bg-white p-12 rounded-[2.5rem] shadow-sm overflow-x-auto">
                <div className="min-w-[800px]">
                  <ProgressBar currentStatus={selectedJob.status} />
                </div>
                {isBackoffice && !selectedJob.isArchived && (
                  <div className="mt-16 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                    {STAGES.map((stage) => (
                      <button
                        key={stage.status}
                        onClick={() => updateJobStatus(selectedJob.id, stage.status)}
                        className={`p-3 rounded-xl text-[8px] font-black uppercase tracking-tighter transition-all border ${selectedJob.status === stage.status ? 'bg-[#EC7000] text-white border-[#EC7000] shadow-md' : 'bg-white text-gray-400 border-gray-100 hover:border-[#EC7000] hover:text-[#EC7000]'}`}
                      >
                        {stage.status}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Card de Aceite Rápido */}
              {isBackoffice && selectedJob.status === 'Job Finalizado' && !selectedJob.isArchived && (
                <div className="bg-orange-50 p-8 rounded-[2rem] border-2 border-orange-200 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div>
                    <h4 className="text-lg font-black text-orange-900">Aguardando Aceite Bancário</h4>
                    <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">A data de finalização foi gravada automaticamente.</p>
                  </div>
                  <div className="flex gap-2 w-full max-w-xs">
                    <input 
                      type="text" 
                      placeholder="Número Aceite..." 
                      className="flex-1 px-4 py-3 bg-white border-2 border-orange-200 rounded-xl text-sm font-black text-gray-900 outline-none focus:border-orange-500"
                      value={quickAcceptance}
                      onChange={(e) => setQuickAcceptance(e.target.value)}
                    />
                    <button 
                      onClick={saveQuickAcceptance}
                      className="px-6 py-3 bg-orange-600 text-white font-black rounded-xl text-[10px] uppercase shadow-md hover:bg-orange-700 transition-all"
                    >
                      Gravar
                    </button>
                  </div>
                </div>
              )}

              {/* Chat / Observações */}
              <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col h-[450px]">
                <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><MessageSquare size={14} className="text-orange-500" /> Conversa de Produção</h4>
                </div>
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/20">
                  {interactions.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-300 gap-2">
                       <MessageSquare size={32} />
                       <p className="text-[10px] font-black uppercase">Nenhuma interação registrada.</p>
                    </div>
                  ) : (
                    interactions.map((msg) => (
                      <div key={msg.id} className={`flex flex-col ${msg.user_name === user.name ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl p-4 text-sm font-medium ${msg.user_name === user.name ? 'bg-[#1e293b] text-white shadow-md' : 'bg-white text-gray-800 border border-gray-100'}`}>
                          {msg.content}
                        </div>
                        <span className="text-[8px] font-black text-gray-400 uppercase mt-1 px-2">{msg.user_name.split(' ')[0]} • {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    ))
                  )}
                </div>
                {!selectedJob.isArchived && (
                  <form onSubmit={handleSendInteraction} className="p-4 border-t border-gray-50 bg-white">
                    <div className="relative">
                      <input 
                        type="text"
                        value={newInteraction}
                        onChange={(e) => setNewInteraction(e.target.value)}
                        placeholder="Enviar mensagem para a equipe..."
                        className="w-full pl-5 pr-12 py-4 bg-gray-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-[#EC7000]/20 outline-none"
                      />
                      <button type="submit" disabled={isSendingInteraction} className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#EC7000] text-white rounded-xl flex items-center justify-center hover:bg-orange-600 transition-all disabled:opacity-50">
                        {isSendingInteraction ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>

            {/* Footer Fixo */}
            <div className="p-8 border-t border-gray-100 bg-gray-50 flex justify-end shrink-0 z-10 shadow-inner">
               <button onClick={() => setIsDetailsOpen(false)} className="px-12 py-5 bg-gray-900 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-xl">Fechar Detalhes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobManagement;
