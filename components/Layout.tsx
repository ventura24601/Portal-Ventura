
import React, { useState, useEffect } from 'react';
import { LayoutDashboard, PlusCircle, Package, Receipt, LogOut, Briefcase, Box, Users, Wrench, BarChartHorizontal, Menu, X, ChevronLeft, ChevronRight, UserCheck, BarChart3 } from 'lucide-react';
import { ITAU_THEME } from '../constants';
import { User } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: User;
  onLogout: () => void;
  onSwitchUser: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, user, onLogout, onSwitchUser }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['backoffice', 'client'] },
    { id: 'crm', label: 'CRM Comercial', icon: BarChartHorizontal, roles: ['backoffice'] },
    { id: 'price-consultation', label: 'Consulta de Preços', icon: BarChart3, roles: ['backoffice'] },
    { id: 'new-request', label: 'Nova Solicitação', icon: PlusCircle, roles: ['backoffice', 'client'] },
    { id: 'events', label: 'Meus Eventos', icon: Package, roles: ['backoffice', 'client'] },
    { id: 'inventory', label: 'Estoque', icon: Box, roles: ['backoffice', 'client'] },
    { id: 'jobs', label: 'Produção & Jobs', icon: Wrench, roles: ['backoffice', 'client'] },
    { id: 'financial', label: 'Faturamento', icon: Receipt, roles: ['backoffice', 'client'] },
    { id: 'clients', label: 'Clientes Externos', icon: Users, roles: ['backoffice'] },
    { id: 'team', label: 'Equipe Ventura', icon: UserCheck, roles: ['backoffice'] },
  ];

  const filteredMenu = menuItems.filter(item => item.roles.includes(user.role));

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const toggleMinimize = () => setIsMinimized(!isMinimized);

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white">
      <div className={`p-6 flex items-center gap-3 border-b border-gray-100 ${isMinimized ? 'md:justify-center md:px-0' : ''}`}>
        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 shadow-sm" style={{ backgroundColor: ITAU_THEME.primary }}>
          <Briefcase className="text-white w-5 h-5" />
        </div>
        {(!isMinimized || isSidebarOpen) && (
          <div className="animate-in fade-in duration-300">
            <h1 className="font-black text-gray-800 leading-none text-lg">Ventura</h1>
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1">
              {user.role === 'backoffice' ? 'Admin Portal' : 'Client Area'}
            </p>
          </div>
        )}
      </div>
      
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto custom-scrollbar">
        {filteredMenu.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all relative group ${
                isActive 
                  ? 'text-white shadow-lg shadow-orange-500/20' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
              } ${isMinimized ? 'md:justify-center md:px-0' : ''}`}
              style={isActive ? { backgroundColor: ITAU_THEME.primary } : {}}
            >
              <item.icon size={20} className="shrink-0" />
              {(!isMinimized || isSidebarOpen) && (
                <span className="font-bold text-sm animate-in fade-in duration-300 truncate">{item.label}</span>
              )}
              
              {isMinimized && !isSidebarOpen && (
                <div className="absolute left-full ml-4 px-3 py-2 bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-[200] shadow-xl">
                  {item.label}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      <div className={`p-4 border-t border-gray-100 space-y-3 ${isMinimized ? 'md:items-center' : ''}`}>
        {user.role === 'backoffice' && (!isMinimized || isSidebarOpen) && (
          <button 
            onClick={onSwitchUser}
            className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 rounded-2xl hover:bg-blue-100 transition-colors"
          >
            <Users size={16} /> <span>Trocar Acesso</span>
          </button>
        )}
        
        <button 
          onClick={onLogout} 
          className={`w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-red-500 transition-colors rounded-2xl hover:bg-red-50/50 ${isMinimized ? 'md:justify-center md:px-0' : ''}`}
        >
          <LogOut size={20} className="shrink-0" />
          {(!isMinimized || isSidebarOpen) && <span className="font-bold text-sm">Sair do Portal</span>}
        </button>
        
        <button 
          onClick={toggleMinimize}
          className={`hidden md:flex w-full items-center gap-3 px-4 py-3 text-gray-300 hover:text-gray-500 transition-colors mt-2 ${isMinimized ? 'justify-center' : ''}`}
        >
          {isMinimized ? <ChevronRight size={20} /> : <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"><ChevronLeft size={16} /> Recolher</div>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden">
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] md:hidden transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsSidebarOpen(false)}
      />

      <aside 
        className={`
          fixed inset-y-0 left-0 z-[110] transition-transform duration-300 ease-in-out bg-white border-r border-gray-100
          md:relative md:translate-x-0
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          ${isMinimized ? 'md:w-20' : 'w-72 md:w-64'}
        `}
      >
        <SidebarContent />
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-6 md:px-10 shrink-0 z-50">
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleSidebar}
              className="p-3 -ml-2 text-gray-400 hover:text-gray-800 hover:bg-gray-50 rounded-2xl md:hidden transition-all"
            >
              <Menu size={24} />
            </button>
            <div>
              <h2 className="text-xl font-black text-gray-800 tracking-tight leading-none">
                {menuItems.find(m => m.id === activeTab)?.label}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sistema Ativo</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-5">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-black text-gray-800 leading-none">{user.name}</p>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">{user.company}</p>
            </div>
            <div className="relative group cursor-pointer">
              <img 
                src={user.avatar} 
                className="w-10 h-10 md:w-11 md:h-11 rounded-2xl border-2 border-orange-500/20 p-0.5 object-cover shadow-sm group-hover:border-orange-500 transition-all" 
                alt="User Avatar"
              />
              <div className="absolute -right-1 -bottom-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full shadow-sm"></div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 md:p-10 scroll-smooth">
          <div className="max-w-[1400px] mx-auto h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
