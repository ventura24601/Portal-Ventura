
import React, { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import EventRequestForm from './components/EventRequestForm';
import EventList from './components/EventList';
import FinancialOverview from './components/FinancialOverview';
import Inventory from './components/Inventory';
import ClientManagement from './components/ClientManagement';
import JobManagement from './components/JobManagement';
import CRMJobs from './components/CRMJobs';
import PublicQuotationView from './components/PublicQuotationView';
import VenturaTeamManagement from './components/VenturaTeamManagement';
import PriceConsultation from './components/PriceConsultation';
import Login from './components/Login';
import { MOCK_USERS, MOCK_QUOTATIONS } from './constants';
import { User, Quotation, ProspectJob } from './types';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [prefilledItem, setPrefilledItem] = useState<string>('');
  
  const [isPublicView, setIsPublicView] = useState(false);
  const [selectedQuotationForPublic, setSelectedQuotationForPublic] = useState<Quotation | null>(null);
  const [selectedJobForPublic, setSelectedJobForPublic] = useState<ProspectJob | null>(null);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsPublicView(false);
    setSelectedQuotationForPublic(null);
    setSelectedJobForPublic(null);
  };

  const handleSwitchUser = () => {
    if (!currentUser) return;
    const nextUser = currentUser.role === 'backoffice' ? MOCK_USERS.itau_client : MOCK_USERS.ventura_admin;
    setCurrentUser(nextUser);
    setActiveTab('dashboard');
    setIsPublicView(false);
  };

  const handleNewRequestFromInventory = (itemName: string) => {
    setPrefilledItem(itemName);
    setActiveTab('new-request');
  };

  const handleSimulateClientView = (quotation: Quotation, job: ProspectJob) => {
    setSelectedQuotationForPublic(quotation);
    setSelectedJobForPublic(job);
    setIsPublicView(true);
  };

  const renderContent = () => {
    if (isPublicView) {
      return (
        <PublicQuotationView 
          quotation={selectedQuotationForPublic || MOCK_QUOTATIONS[0]}
          job={selectedJobForPublic || undefined}
          onApprove={(comments) => {
            alert('Cotação Aprovada pelo Cliente! O JOB entrará em produção.');
            setIsPublicView(false);
            setActiveTab('jobs');
          }}
          onAdjust={(comments) => {
            alert('Pedido de ajuste enviado para a Ventura.');
            setIsPublicView(false);
          }}
          onBack={() => setIsPublicView(false)}
        />
      );
    }

    if (!currentUser) return null;

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard user={currentUser} />;
      case 'crm':
        return currentUser.role === 'backoffice' ? <CRMJobs onSimulateClientView={handleSimulateClientView} /> : <Dashboard user={currentUser} />;
      case 'price-consultation':
        return currentUser.role === 'backoffice' ? <PriceConsultation /> : <Dashboard user={currentUser} />;
      case 'new-request':
        return <EventRequestForm user={currentUser} prefilledItem={prefilledItem} onClearPrefill={() => setPrefilledItem('')} />;
      case 'events':
        return <EventList user={currentUser} />;
      case 'inventory':
        return <Inventory user={currentUser} onNewRequestFromInventory={handleNewRequestFromInventory} />;
      case 'jobs':
        return <JobManagement user={currentUser} />;
      case 'clients':
        return currentUser.role === 'backoffice' ? <ClientManagement /> : <Dashboard user={currentUser} />;
      case 'team':
        return currentUser.role === 'backoffice' ? <VenturaTeamManagement /> : <Dashboard user={currentUser} />;
      case 'financial':
        return <FinancialOverview user={currentUser} />;
      default:
        return <Dashboard user={currentUser} />;
    }
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  if (isPublicView) {
    return renderContent();
  }

  return (
    <Layout 
      activeTab={activeTab} 
      setActiveTab={setActiveTab} 
      user={currentUser} 
      onLogout={handleLogout}
      onSwitchUser={handleSwitchUser}
    >
      {renderContent()}
    </Layout>
  );
};

export default App;
