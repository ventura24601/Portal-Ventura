
import { DetailedEvent, InventoryItem, Movement, ClientAccount, User, Job, ProspectJob, Quotation } from './types';

export const ITAU_THEME = {
  primary: '#EC7000', // Ventura Orange
  secondary: '#1e293b', // Deep Slate
  bg: '#f8fafc',
  navy: '#003366'
};

export const MOCK_USERS: { [key: string]: User } = {
  ventura_admin: {
    id: 'u1',
    name: 'Pablo Ventura',
    email: 'pablo@venturapromocional.com.br',
    company: 'Ventura Promocional',
    role: 'backoffice',
    department: 'Administrativo',
    lastLogin: '2025-02-23 09:00',
    avatar: 'https://i.pravatar.cc/150?u=pablo'
  },
  ventura_logistics: {
    id: 'u3',
    name: 'Marcos Silva',
    email: 'marcos@venturapromocional.com.br',
    company: 'Ventura Promocional',
    role: 'backoffice',
    department: 'Logística',
    lastLogin: '2025-02-23 08:30',
    avatar: 'https://i.pravatar.cc/150?u=marcos'
  },
  client_demo: {
    id: 'u2',
    name: 'Iorrana Barreto',
    email: 'iorrana.barreto@empresa.com.br',
    company: 'Cliente Corporativo',
    role: 'client',
    avatar: 'https://i.pravatar.cc/150?u=iorrana'
  }
};

export const MOCK_VENTURA_TEAM: User[] = [
  MOCK_USERS.ventura_admin,
  MOCK_USERS.ventura_logistics,
  {
    id: 'u4',
    name: 'Fernanda Lima',
    email: 'fernanda@venturapromocional.com.br',
    company: 'Ventura Promocional',
    role: 'backoffice',
    department: 'Comercial',
    lastLogin: '2025-02-22 15:45',
    avatar: 'https://i.pravatar.cc/150?u=fernanda'
  }
];

export const MOCK_QUOTATIONS: Quotation[] = [
  {
    id: 'QUO-001',
    prospectJobId: 'PR-001',
    status: 'Enviado',
    lastUpdated: '2025-02-20',
    items: [
      {
        id: 'qi-1',
        sku: 'BR-GEN-001',
        description: 'Copo biodegradável para água 200ml',
        observations: 'Impressão em 1 cor',
        imageUrl: 'https://i.ibb.co/6803YfC/copo.png',
        productionTime: '15 dias úteis',
        include: 'sim',
        quantity: 1000,
        unitPrice: 2.15,
        feePercentage: 8,
        taxPercentage: 21.2
      }
    ]
  }
];

export const MOCK_CLIENTS: ClientAccount[] = [
  { id: 'c1', name: 'Iorrana Barreto', email: 'iorrana@empresa.com.br', company: 'Cliente Corporativo', status: 'Ativo', createdAt: '2025-01-10' },
  { id: 'c2', name: 'Luciane Rosolen', email: 'luciane@empresa.com.br', company: 'Cliente Corporativo', status: 'Ativo', createdAt: '2025-01-15' },
];

export const MOCK_PROSPECT_JOBS: ProspectJob[] = [
  {
    id: 'PR-001',
    openingDate: '2025-02-15',
    approvalMonth: 'Março/2025',
    description: 'Kit Boas Vindas Integradores',
    clientName: 'Iorrana Barreto',
    jobType: 'Kits Customizados',
    company: 'Cliente Corporativo',
    budgetValue: 45000.00,
    status: 'Em orçamento',
    quantity: 1000,
    items: 'Mochila, Squeeze, Caderno, Caneta',
    quotationId: 'QUO-001'
  }
];

export const MOCK_JOBS: Job[] = [
  {
    id: 'JOB-2024-001',
    description: 'Welcome Kit Premium 2024',
    company: 'Cliente Corporativo',
    clientId: 'u2', 
    clientName: 'Iorrana Barreto',
    quantity: 5000,
    totalValue: 125000.00,
    startDate: '2024-11-20',
    status: 'Pedido no Estoque',
    paymentStatus: 'Aguardando Pagamento',
    attachments: []
  }
];

export const MOCK_INVENTORY: InventoryItem[] = [
  {
    id: '1030',
    sku: 'TAG-MALA-001',
    description: 'Tag de Mala Personalizada',
    totalQuantity: 134,
    imageUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=200',
    category: 'Brindes',
    clientId: '1',
    clientName: 'Luciane Rosolen',
    area: 'P01-A',
    weightUnitG: 60,
    dimensions: { width: 10, height: 5, depth: 1 },
    location: 'Estoque Central',
    qrCode: '',
    extraDescription: '',
    boxes: 5,
    supplier: 'Fornecedor Interno',
    job: 'JOB-2024-001',
    generatePdf: true,
    company: 'Cliente Corporativo'
  }
];

export const MOCK_MOVEMENTS: Movement[] = [
  {
    id: '605',
    itemId: '1030',
    itemName: 'Tag de Mala Personalizada',
    dateTime: '10/02/2025 16:30:40',
    responsible: 'Pablo Ventura',
    quantityChange: -1,
    boxes: -1,
    observations: 'Retirada de amostra'
  }
];

export const MOCK_EVENTS: DetailedEvent[] = [
  {
    id: '1',
    requestDate: '2025-02-20',
    requestedBy: 'Iorrana Barreto',
    item: 'Garrafa + Sacola',
    quantity: 30,
    eventDate: '2025-03-10',
    eventTime: '10:00',
    location: 'Centro de Convenções',
    address: {
      street: 'Av. Brasil, 500',
      complement: 'Auditório A',
      neighborhood: 'Jardins',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01000-000'
    },
    notes: 'Entregar na recepção principal',
    focalPoint: 'Maria da Silva',
    email: 'maria.silva@empresa.com.br',
    status: 'Faturado',
    fulfillment: {
      eventId: '1',
      deliveryDate: '2025-03-09',
      receivedBy: 'Maria da Silva',
      fulfillmentNotes: '',
      boxQuantity: 3,
      unitBoxValue: 32.00,
      totalBoxValue: 96.00,
      unitLabelValue: 7.50,
      totalLabelValue: 22.50,
      unitHandlingValue: 8.00,
      totalHandlingValue: 24.00,
      logisticsValue: 550.00,
      extraExpenses: 20.00,
      subtotalShipping: 712.50,
      fee: 57.00,
      subtotal1: 769.50,
      taxes: 163.23,
      totalInvoiced: 932.73
    }
  }
];
