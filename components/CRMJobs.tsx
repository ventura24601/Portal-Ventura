
import React, { useState, useEffect } from 'react';
import { 
  Search, Plus, X, Save, Loader2, FileSpreadsheet, TrendingUp, User, 
  Calendar, Briefcase, AlertCircle, Users, ImageIcon, Building2, 
  Zap, Mail, ChevronDown, MapPin, BadgeCheck, Contact, UserPlus, 
  Type, Database, LayoutGrid, List, Filter, ArrowRight, RotateCcw, Clock
} from 'lucide-react';
import { MOCK_PROSPECT_JOBS, MOCK_CLIENTS } from '../constants';
import { ProspectJob, ProspectJobStatus, Quotation, QuotationItem } from '../types';
import { supabase, isSupabaseConfigured } from '../supabase';
import QuotationEditor from './QuotationEditor';

interface CRMJobsProps {
  onSimulateClientView?: (quotation: Quotation, job: ProspectJob) => void;
}

const PROSPECT_STATUSES: ProspectJobStatus[] = [
  'Não iniciada', 'Em orçamento', 'Aguardando Cliente', 'Em Follow', 'Congelado', 'Reprovado', 'Aprovado'
];

const CRMJobs: React.FC<CRMJobsProps> = ({ onSimulateClientView }) => {
  const [prospects, setProspects] = useState<(ProspectJob & { quotation?: Quotation })[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Todos');
  const [dateStart, setDateStart] = useState<string>('');
  const [dateEnd, setDateEnd] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isQuotationOpen, setIsQuotationOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<(ProspectJob & { quotation?: Quotation }) | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isManualClient, setIsManualClient] = useState(false);

  const round2 = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('Todos');
    setDateStart('');
    setDateEnd('');
  };

  const parseDbError = (err: any): string => {
    if (typeof err === 'string') return err;
    if (err && typeof err === 'object') {
      return err.message || 'Erro de conexão';
    }
    return 'Erro desconhecido';
  };

  const fetchData = async () => {
    setLoading(true);
    setErrorMessage(null);
    
    if (!isSupabaseConfigured()) {
      setProspects(MOCK_PROSPECT_JOBS.map(p => ({ ...p })));
      setClients(MOCK_CLIENTS);
      setLoading(false);
      return;
    }

    try {
      const { data: prospectData, error: prospectError } = await supabase
        .from('prospect_jobs')
        .select(`
          *,
          quotations (
            *,
            quotation_items (*)
          )
        `)
        .order('opening_date', { ascending: false });
      
      if (prospectError) throw prospectError;
      
      const mapped = (prospectData || []).map(db => {
        const dbQuo = Array.isArray(db.quotations) ? db.quotations[0] : db.quotations;
        let quotationObj: Quotation | undefined = undefined;

        if (dbQuo) {
          const rawItems = dbQuo.items || dbQuo.quotation_items || [];
          quotationObj = {
            id: dbQuo.id,
            prospectJobId: dbQuo.prospect_job_id,
            status: dbQuo.status,
            lastUpdated: dbQuo.last_updated,
            clientComments: dbQuo.client_comments,
            items: rawItems.map((item: any) => ({
              id: item.id?.toString() || Math.random().toString(),
              sku: item.sku, 
              description: item.description,
              observations: item.observations,
              imageUrl: item.image_url || item.imageUrl,
              productionTime: item.production_time || item.productionTime,
              include: item.include,
              quantity: Number(item.quantity || 0),
              unitPrice: Number(item.unit_price || item.unitPrice || 0),
              feePercentage: Number(item.fee_percentage || item.feePercentage || 8),
              taxPercentage: Number(item.tax_percentage || item.taxPercentage || 21.2)
            }))
          };
        }

        // Tratamento seguro para o campo 'items' para evitar erro de renderização de objeto
        let itemsSummary = '';
        if (typeof db.items === 'string') {
          itemsSummary = db.items;
        } else if (Array.isArray(db.items)) {
          itemsSummary = db.items.map((i: any) => i.description || i.name || '').join(', ');
        } else if (quotationObj && quotationObj.items.length > 0) {
          itemsSummary = quotationObj.items.map(i => i.description).join(', ');
        }

        return {
          id: db.id,
          openingDate: db.opening_date,
          approvalMonth: db.approval_month || '',
          description: db.description,
          clientName: db.client_name,
          clientEmail: db.client_email,
          department: db.department,
          jobType: db.job_type || 'Kits Customizados',
          company: db.company,
          budgetValue: Number(db.budget_value || 0),
          status: db.status as ProspectJobStatus,
          quotationId: dbQuo?.id || db.quotation_id,
          quotation: quotationObj,
          quantity: db.quantity,
          items: itemsSummary // Agora garantido como string
        };
      });

      setProspects(mapped);

      const { data: clientData, error: clientError } = await supabase
        .from('members')
        .select('*')
        .neq('company', 'Ventura Promocional')
        .order('name');
      
      if (!clientError) setClients(clientData || []);

    } catch (err: any) {
      setErrorMessage(parseDbError(err));
      setProspects(MOCK_PROSPECT_JOBS.map(p => ({ ...p })));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleClientSelect = (clientId: string) => {
    const selected = clients.find(c => c.id === clientId);
    if (selected && editingJob) {
      setEditingJob({
        ...editingJob,
        clientName: selected.name,
        clientEmail: selected.email,
        company: selected.company,
        department: selected.department || ''
      });
    }
  };

  const handleSaveJob = async () => {
    if (!editingJob?.description || !editingJob?.clientName) {
      alert("Erro: Preencha descrição e cliente.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    try {
      if (isSupabaseConfigured()) {
        const prospectPayload: any = {
          id: editingJob.id,
          opening_date: editingJob.openingDate,
          description: editingJob.description,
          client_name: editingJob.clientName,
          company: editingJob.company,
          budget_value: editingJob.budgetValue || 0,
          status: editingJob.status,
          quantity: editingJob.quantity || 1
        };

        if (editingJob.clientEmail) prospectPayload.client_email = editingJob.clientEmail;
        if (editingJob.department) prospectPayload.department = editingJob.department;

        const { error: prospectError } = await supabase
          .from('prospect_jobs')
          .upsert([prospectPayload], { onConflict: 'id' });
        
        if (prospectError) throw prospectError;
        
        if (editingJob.status === 'Aprovado') {
          const jobId = editingJob.id.startsWith('PR-') ? editingJob.id.replace('PR-', 'JOB-') : `JOB-${editingJob.id}`;
          const jobPayload = {
            id: jobId,
            description: editingJob.description,
            company: editingJob.company,
            client_id: editingJob.clientEmail || editingJob.clientName,
            client_name: editingJob.clientName,
            quantity: editingJob.quantity || 1,
            total_value: editingJob.budgetValue || 0,
            start_date: new Date().toISOString().split('T')[0],
            status: 'Aguardando Start',
            payment_status: 'Aguardando Pagamento'
          };
          await supabase.from('jobs').upsert([jobPayload], { onConflict: 'id' });
        }
        
        await fetchData();
        setIsEditModalOpen(false);
        alert('Oportunidade salva!');
      }
    } catch (err: any) { 
      setErrorMessage(parseDbError(err));
    } finally { 
      setIsSaving(false); 
    }
  };

  const handleSaveQuotation = async (quotation: Quotation) => {
    if (!editingJob) return;
    setLoading(true);
    try {
      if (isSupabaseConfigured()) {
        const { error: qError } = await supabase.from('quotations').upsert([{
          id: quotation.id,
          prospect_job_id: editingJob.id,
          status: 'Enviado',
          last_updated: new Date().toISOString(),
          items: quotation.items
        }], { onConflict: 'id' });
        
        if (qError) throw qError;

        const totalPipelineValue = quotation.items.reduce((acc, item) => {
          const sub = round2((item.quantity || 0) * (item.unitPrice || 0));
          const fee = round2(sub * 0.08);
          const totalLine = round2((sub + fee) / 0.825);
          return acc + totalLine;
        }, 0);

        await supabase.from('prospect_jobs')
          .update({ budget_value: round2(totalPipelineValue) })
          .eq('id', editingJob.id);

        await fetchData();
        setIsQuotationOpen(false);
      }
    } catch (err: any) {
      alert(`Erro: ${parseDbError(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredProspects = prospects.filter(p => {
    const matchesSearch = (p.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (p.clientName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (p.id || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'Todos' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      {errorMessage && (
        <div className="bg-orange-50 border border-orange-200 p-6 rounded-[2rem] flex items-center gap-4 text-orange-700 shadow-md">
           <AlertCircle className="shrink-0" />
           <div className="flex-1">
              <p className="text-xs font-black uppercase tracking-widest">Aviso</p>
              <p className="text-sm font-bold">{errorMessage}</p>
           </div>
           <button onClick={() => setErrorMessage(null)} className="p-2 hover:bg-orange-100 rounded-full"><X size={18}/></button>
        </div>
      )}

      <div className="bg-[#1e293b] p-12 rounded-[3.5rem] text-white flex flex-col md:flex-row md:items-center justify-between gap-8 shadow-2xl relative overflow-hidden mb-6">
        <div className="relative z-10">
          <h2 className="text-4xl font-black tracking-tighter">Pipeline Comercial</h2>
          <p className="text-blue-400 text-xs font-black uppercase tracking-[0.25em] mt-3">Gestão de Briefings Itaú</p>
        </div>
        <div className="flex gap-4 relative z-10">
           <div className="flex bg-white/10 p-1.5 rounded-2xl border border-white/5">
              <button onClick={() => setViewMode('grid')} className={`flex items-center gap-2 px-5 py-3 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-orange-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}><LayoutGrid size={18} /> <span className="text-[10px] font-black uppercase tracking-widest">Grid</span></button>
              <button onClick={() => setViewMode('table')} className={`flex items-center gap-2 px-5 py-3 rounded-xl transition-all ${viewMode === 'table' ? 'bg-orange-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}><List size={18} /> <span className="text-[10px] font-black uppercase tracking-widest">Tabela</span></button>
           </div>
           <button onClick={() => { setErrorMessage(null); setIsManualClient(false); setEditingJob({ id: `PR-${Math.floor(1000 + Math.random() * 9000)}`, openingDate: new Date().toISOString().split('T')[0], approvalMonth: '', description: '', clientName: '', clientEmail: '', department: '', jobType: 'Kits Customizados', company: 'Itaú', budgetValue: 0, status: 'Não iniciada', quantity: 1 }); setIsEditModalOpen(true); }} className="flex items-center gap-3 px-10 py-5 bg-orange-600 text-white font-black rounded-3xl shadow-xl hover:bg-orange-700 transition-all text-sm uppercase tracking-widest"><Plus size={22} /> Nova Oportunidade</button>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6 mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-8 relative">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input type="text" placeholder="Pesquisar descrição, cliente ou ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-16 pr-6 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold text-gray-800 focus:outline-none focus:ring-4 focus:ring-orange-500/10 shadow-inner transition-all" />
          </div>
          <div className="lg:col-span-3 flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-2xl shadow-inner border border-gray-100">
            <Filter size={16} className="text-gray-400" />
            <select className="bg-transparent border-none outline-none text-[10px] font-black uppercase tracking-widest text-gray-600 flex-1 cursor-pointer py-2" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="Todos">Status (Todos)</option>
              {PROSPECT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="lg:col-span-1 flex justify-end">
            <button onClick={fetchData} className="p-4 bg-gray-50 border border-gray-100 rounded-2xl text-gray-400 hover:text-blue-600 transition-colors shadow-sm"><Loader2 size={20} className={loading ? "animate-spin" : ""} /></button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-40 flex flex-col items-center justify-center gap-4">
           <Loader2 className="animate-spin text-orange-600" size={48} />
           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Carregando...</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProspects.map((p) => (
            <div key={p.id} className="bg-white p-10 rounded-[3.5rem] border border-gray-100 shadow-sm hover:shadow-2xl transition-all group flex flex-col relative overflow-hidden">
              <div className="flex justify-between items-start mb-8">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-widest w-fit">#{p.id}</span>
                  <div className="flex items-center gap-1.5 mt-2 text-gray-400"><Clock size={12} /><span className="text-[8px] font-black uppercase">{p.openingDate}</span></div>
                </div>
                <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full ${p.status === 'Aprovado' ? 'bg-green-600 text-white' : 'bg-orange-100 text-orange-600'}`}>{p.status}</span>
              </div>
              <h4 className="text-2xl font-black text-gray-800 mb-6 leading-tight group-hover:text-orange-600 transition-colors h-14 overflow-hidden line-clamp-2">{p.description}</h4>
              <div className="space-y-4 mt-auto pt-6 border-t border-gray-50">
                <div className="flex items-center gap-3 text-sm font-black text-gray-800"><User size={14} className="text-orange-500" /> {p.clientName}</div>
                <div className="flex items-center gap-3 text-base font-black text-gray-900"><TrendingUp size={16} className="text-green-600" /> R$ {(p.budgetValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-10">
                <button onClick={() => { setEditingJob(p); setIsEditModalOpen(true); }} className="py-4 bg-gray-50 text-gray-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100">Editar</button>
                <button onClick={() => { setEditingJob(p); setIsQuotationOpen(true); }} className="py-4 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-orange-600 shadow-lg transition-all"><FileSpreadsheet size={16} /> Planilha</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden relative min-h-[500px]">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">ID</th>
                  <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Briefing</th>
                  <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Cliente</th>
                  <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Valor (R$)</th>
                  <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                  <th className="px-8 py-6"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredProspects.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-8 py-5 text-[10px] font-bold text-blue-600">#{p.id}</td>
                    <td className="px-8 py-5">
                       <div className="text-sm font-black text-gray-800">{p.description}</div>
                       <div className="text-[10px] text-gray-400 font-bold truncate max-w-xs">{p.items}</div>
                    </td>
                    <td className="px-8 py-5 text-xs font-black text-gray-800">{p.clientName}</td>
                    <td className="px-8 py-5 text-right font-black text-gray-900">{(p.budgetValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="px-8 py-5 text-center"><span className="px-3 py-1 text-[9px] font-black rounded-full uppercase bg-gray-100 text-gray-500">{p.status}</span></td>
                    <td className="px-8 py-5 text-right">
                       <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setEditingJob(p); setIsEditModalOpen(true); }} className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-orange-600 hover:text-white transition-all"><Briefcase size={14} /></button>
                          <button onClick={() => { setEditingJob(p); setIsQuotationOpen(true); }} className="p-2 bg-gray-900 text-white rounded-lg hover:bg-blue-600 transition-all"><FileSpreadsheet size={14} /></button>
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isEditModalOpen && editingJob && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[150] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3.5rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
             <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
                <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">Briefing Comercial</h3>
                <button onClick={() => setIsEditModalOpen(false)} className="p-3 hover:bg-gray-100 rounded-full text-gray-400"><X size={24} /></button>
             </div>
             <div className="p-10 space-y-8 max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-6">
                   <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Data</label><input type="date" className="w-full px-6 py-4 rounded-2xl border-2 border-gray-100 bg-white outline-none font-bold" value={editingJob.openingDate} onChange={e => setEditingJob({...editingJob, openingDate: e.target.value})} /></div>
                   <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Status</label><select className="w-full px-6 py-4 rounded-2xl border-2 border-gray-100 bg-white outline-none font-bold" value={editingJob.status} onChange={e => setEditingJob({...editingJob, status: e.target.value as ProspectJobStatus})}>{PROSPECT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                </div>
                <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Descrição</label><input className="w-full px-6 py-4 rounded-2xl border-2 border-gray-100 bg-white outline-none font-bold" value={editingJob.description} onChange={e => setEditingJob({...editingJob, description: e.target.value})} /></div>
                <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Cliente</label><input className="w-full px-6 py-4 rounded-2xl border-2 border-gray-100 bg-white outline-none font-bold" value={editingJob.clientName} onChange={e => setEditingJob({...editingJob, clientName: e.target.value})} /></div>
                <button onClick={handleSaveJob} disabled={isSaving} className="w-full py-6 bg-blue-600 text-white font-black rounded-2xl shadow-xl flex items-center justify-center gap-3 uppercase tracking-[0.2em] text-xs hover:bg-blue-700 transition-all">{isSaving ? <Loader2 size={24} className="animate-spin" /> : <Save size={24} />} Salvar Oportunidade</button>
             </div>
          </div>
        </div>
      )}

      {isQuotationOpen && editingJob && (
        <QuotationEditor job={editingJob} initialItems={editingJob.quotation?.items || []} onClose={() => setIsQuotationOpen(false)} onSave={handleSaveQuotation} onViewAsClient={(quotation) => onSimulateClientView?.(quotation, editingJob)} />
      )}
    </div>
  );
};

export default CRMJobs;
