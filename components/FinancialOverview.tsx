
import React, { useState, useEffect } from 'react';
import { DollarSign, FileText, CheckCircle2, AlertCircle, Save, Loader2, ReceiptText, Upload, FileCheck, X, ChevronDown, CheckCircle, AlertTriangle, Calendar, Clock, ArrowRight, TrendingUp, BarChart3, History, Search } from 'lucide-react';
import { MOCK_EVENTS, MOCK_JOBS } from '../constants';
import { User, Job, DetailedEvent, BillingStatus } from '../types';
import { supabase, isSupabaseConfigured } from '../supabase';

interface FinancialOverviewProps {
  user: User;
}

const BILLING_STATUSES: BillingStatus[] = ['Job Finalizado', 'Aceite Recebido', 'Lançado no Portal', 'Pago'];

const FinancialOverview: React.FC<FinancialOverviewProps> = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<string | null>(null);
  
  const [editValues, setEditValues] = useState<{[key: string]: {
    acceptance: string,
    status: BillingStatus,
    invoiceUrl?: string
  }}>({});

  const isBackoffice = user.role === 'backoffice';
  
  const fetchFinancialData = async () => {
    setLoading(true);
    if (!isSupabaseConfigured()) {
      setJobs(MOCK_JOBS.filter(j => j.status === 'Job Finalizado') as Job[]);
      setLoading(false);
      return;
    }

    try {
      let jobsQuery = supabase.from('jobs').select('*');
      if (!isBackoffice) jobsQuery = jobsQuery.eq('company', user.company);

      const { data: allJobs, error: jobsError } = await jobsQuery;
      if (jobsError) throw jobsError;

      const filtered = (allJobs || []).filter((db: any) => 
        db.status === 'Job Finalizado' || BILLING_STATUSES.includes(db.billing_status)
      ).map((db: any) => ({
        id: db.id,
        description: db.description,
        company: db.company,
        clientId: db.client_id,
        clientName: db.client_name,
        quantity: db.quantity,
        totalValue: db.total_value,
        startDate: db.start_date,
        status: db.status,
        billingStatus: (db.billing_status || 'Job Finalizado') as BillingStatus,
        paymentStatus: db.payment_status,
        orderAcceptanceNumber: db.order_acceptance_number,
        invoiceUrl: db.invoice_url,
        finishedAt: db.finished_at,
        acceptanceAt: db.acceptance_at,
        portalAt: db.portal_at,
        paidAt: db.paid_at
      }));

      setJobs(filtered);
      
      const initialEdits: any = {};
      filtered.forEach(j => {
        initialEdits[j.id] = {
          acceptance: j.orderAcceptanceNumber || '',
          status: j.billingStatus || 'Job Finalizado',
          invoiceUrl: j.invoiceUrl
        };
      });
      setEditValues(initialEdits);

    } catch (err) {
      console.error("Erro financeiro:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinancialData();
  }, [user]);

  const handleUpdateJob = async (jobId: string) => {
    const edit = editValues[jobId];
    if (!edit) return;
    
    setIsUpdating(jobId);
    try {
      if (isSupabaseConfigured()) {
        const now = new Date().toISOString();
        const currentJob = jobs.find(j => j.id === jobId);
        
        const payload: any = { 
          order_acceptance_number: edit.acceptance,
          billing_status: edit.status,
          invoice_url: edit.invoiceUrl,
          payment_status: edit.status === 'Pago' ? 'Pago' : (edit.acceptance ? 'Faturado' : 'Aguardando Pagamento')
        };

        if (edit.acceptance && !currentJob?.acceptanceAt) {
          payload.acceptance_at = now;
        }

        if (edit.status === 'Lançado no Portal' && !currentJob?.portalAt) {
          payload.portal_at = now;
        }

        if (edit.status === 'Pago' && !currentJob?.paidAt) {
          payload.paid_at = now;
        }

        const { error } = await supabase.from('jobs').update(payload).eq('id', jobId);
        if (error) throw error;
        
        await fetchFinancialData();
        alert('Dados de faturamento atualizados!');
      }
    } catch (err: any) { 
      alert(`Erro ao salvar: ${err.message}`); 
    } finally {
      setIsUpdating(null);
    }
  };

  const calculateAging = (start?: string, end?: string) => {
    if (!start) return 0;
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : new Date();
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const handleFileUpload = async (jobId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isSupabaseConfigured()) return;
    setIsUploading(jobId);
    try {
      const fileName = `NF-${jobId}-${Date.now()}.${file.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage.from('assets').upload(`invoices/${fileName}`, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('assets').getPublicUrl(`invoices/${fileName}`);
      setEditValues(prev => ({ ...prev, [jobId]: { ...prev[jobId], invoiceUrl: data.publicUrl } }));
      alert('Nota Fiscal carregada! Salve para concluir.');
    } catch (err: any) {
      alert(`Erro no upload: ${err.message}`);
    } finally {
      setIsUploading(null);
    }
  };

  const filteredJobs = jobs.filter(j => 
    j.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    j.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (j.orderAcceptanceNumber || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <SummaryCard 
          label="Em Faturamento" 
          value={jobs.reduce((acc, j) => acc + (j.totalValue || 0), 0)} 
          icon={<DollarSign className="text-emerald-600" size={24} />}
          subtext="Volume aguardando liquidação"
        />
        <SummaryCard 
          label="Aging Médio" 
          value={Math.round(jobs.reduce((acc, j) => acc + calculateAging(j.finishedAt, j.paidAt), 0) / (jobs.length || 1))} 
          icon={<Clock className="text-blue-600" size={24} />}
          subtext="Dias da entrega ao pagamento"
          isCount
        />
        <SummaryCard 
          label="Aceites Pendentes" 
          value={jobs.filter(j => !j.orderAcceptanceNumber).length} 
          icon={<AlertTriangle className="text-orange-600" size={24} />}
          subtext="Jobs sem número de aceite"
          isCount
        />
      </div>

      <div className="bg-white rounded-[4rem] border border-gray-100 shadow-2xl overflow-hidden relative">
        {loading && <div className="absolute inset-0 bg-white/60 z-20 flex items-center justify-center backdrop-blur-[2px]"><Loader2 className="animate-spin text-blue-600" size={48} /></div>}
        
        <div className="p-10 border-b border-gray-50 bg-gray-50/20 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-2xl font-black text-gray-800">Fluxo de Liquidação de Jobs</h3>
            <p className="text-xs text-gray-400 font-bold mt-1">Gestão de prazos e status financeiros para faturamento corporativo.</p>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Filtrar por Job, Cliente ou Aceite..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-6 py-4 bg-white border border-gray-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-[#EC7000]/10 focus:border-[#EC7000] outline-none transition-all shadow-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white border-b border-gray-50">
                <th className="px-10 py-8 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Job & Valor</th>
                <th className="px-10 py-8 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Timeline do Ciclo</th>
                <th className="px-10 py-8 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Número do Aceite</th>
                <th className="px-10 py-8 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Status de Pagamento</th>
                <th className="px-10 py-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-10 py-20 text-center text-gray-400 font-bold italic">Nenhum registro encontrado para os critérios de busca.</td>
                </tr>
              ) : (
                filteredJobs.map((job) => {
                  const edit = editValues[job.id] || { acceptance: '', status: 'Job Finalizado' };
                  const aging = calculateAging(job.finishedAt, job.paidAt);
                  const isPaid = edit.status === 'Pago';

                  return (
                    <tr key={job.id} className="hover:bg-gray-50/50 transition-all group">
                      <td className="px-10 py-8">
                        <div className="flex flex-col gap-1">
                          <div className="text-sm font-black text-gray-800">{job.description}</div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase">{job.clientName}</p>
                          <p className="text-base font-black text-[#EC7000] mt-1">R$ {job.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                      </td>
                      
                      <td className="px-10 py-8">
                         <div className="space-y-3">
                            <div className="flex items-center gap-6">
                               <div className="flex flex-col">
                                  <span className="text-[8px] font-black text-gray-300 uppercase">Finalizado em</span>
                                  <span className="text-[10px] font-bold text-gray-600">{job.finishedAt ? new Date(job.finishedAt).toLocaleDateString('pt-BR') : 'Processando...'}</span>
                               </div>
                               <div className="flex flex-col">
                                  <span className="text-[8px] font-black text-gray-300 uppercase">Aceite em</span>
                                  <span className="text-[10px] font-bold text-gray-600">{job.acceptanceAt ? new Date(job.acceptanceAt).toLocaleDateString('pt-BR') : 'Aguardando'}</span>
                               </div>
                            </div>
                            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg border text-[9px] font-black uppercase ${aging > 30 ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                               <Clock size={12} /> {aging} dias decorridos
                            </div>
                         </div>
                      </td>

                      <td className="px-10 py-8">
                         <input 
                            type="text" 
                            value={edit.acceptance}
                            onChange={(e) => setEditValues({...editValues, [job.id]: {...edit, acceptance: e.target.value}})}
                            placeholder="Número Aceite..."
                            disabled={!isBackoffice || isPaid}
                            className={`w-full px-5 py-4 rounded-2xl text-sm font-black border transition-all ${edit.acceptance ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-transparent focus:bg-white focus:border-blue-500 outline-none'}`}
                         />
                      </td>

                      <td className="px-10 py-8">
                        <div className="flex flex-col gap-3">
                           <div className="relative">
                              <select 
                                className={`w-full appearance-none px-5 py-4 rounded-2xl text-[10px] font-black uppercase border transition-all cursor-pointer ${isPaid ? 'bg-green-600 text-white' : 'bg-white text-gray-700 border-gray-200'}`}
                                value={edit.status}
                                onChange={(e) => {
                                  const newS = e.target.value as BillingStatus;
                                  setEditValues({...editValues, [job.id]: {...edit, status: newS}});
                                }}
                                disabled={!isBackoffice || job.billingStatus === 'Pago'}
                              >
                                 {BILLING_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                              {!isPaid && <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />}
                           </div>
                           <div className="flex items-center gap-2">
                             {edit.invoiceUrl ? (
                               <a href={edit.invoiceUrl} target="_blank" rel="noopener noreferrer" className="text-[9px] font-black uppercase text-green-600 flex items-center gap-1 hover:underline">
                                  <FileCheck size={14} /> NF Disponível
                               </a>
                             ) : (
                               isBackoffice && (
                                 <label className="text-[9px] font-black uppercase text-blue-600 cursor-pointer flex items-center gap-1 hover:underline">
                                    <Upload size={14} /> Anexar Nota Fiscal
                                    <input type="file" className="hidden" accept=".pdf,.jpg,.png" onChange={(e) => handleFileUpload(job.id, e)} />
                                 </label>
                               )
                             )}
                           </div>
                        </div>
                      </td>

                      <td className="px-10 py-8 text-right">
                         {isBackoffice && !isPaid && (
                           <button 
                             onClick={() => handleUpdateJob(job.id)} 
                             disabled={isUpdating === job.id}
                             className="px-8 py-4 bg-gray-900 text-white rounded-2xl hover:bg-black transition-all text-[9px] font-black uppercase flex items-center gap-2 disabled:opacity-50"
                           >
                             {isUpdating === job.id ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Salvar
                           </button>
                         )}
                         {isPaid && <CheckCircle size={20} className="text-green-500 ml-auto" />}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const SummaryCard = ({ label, value, icon, subtext, isCount = false }: any) => (
  <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
    <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mb-6">{icon}</div>
    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
    <h4 className="text-3xl font-black text-gray-900">
      {isCount ? `${value} dias` : `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
    </h4>
    <p className="text-[10px] text-gray-400 mt-2 font-bold italic">{subtext}</p>
  </div>
);

export default FinancialOverview;
