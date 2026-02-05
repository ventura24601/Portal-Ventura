
export type EventStatus = 'Pendente' | 'Processando' | 'Enviado' | 'Entregue' | 'Faturado';
export type UserRole = 'backoffice' | 'client';
export type VenturaDepartment = 'Comercial' | 'Logística' | 'Produção' | 'Administrativo';

export interface JobInteraction {
  id: string;
  job_id: string;
  user_id?: string;
  user_name: string;
  user_role: string;
  content: string;
  created_at: string;
}

export type BillingStatus = 'Job Finalizado' | 'Aceite Recebido' | 'Lançado no Portal' | 'Pago';

export type ProspectJobStatus = 
  | 'Não iniciada' 
  | 'Em orçamento' 
  | 'Aguardando Cliente' 
  | 'Em Follow' 
  | 'Congelado' 
  | 'Reprovado' 
  | 'Aprovado';

export type JobStatus = 
  | 'Aguardando Start'
  | 'Pedido em Produção'
  | 'Pedido em Personalização'
  | 'Pedido no Estoque'
  | 'Em Manuseio'
  | 'Embalagem'
  | 'Job Finalizado';

export interface JobAttachment {
  id: string;
  name: string;
  type: 'pdf' | 'image' | 'doc' | 'other';
  uploadDate: string;
  uploadedBy: string;
  size: string;
  url: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  company: string;
  role: UserRole;
  avatar?: string;
  department?: VenturaDepartment;
  lastLogin?: string;
  mustChangePassword?: boolean;
}

export interface Job {
  id: string;
  description: string;
  company: string;
  clientId: string; 
  clientName: string;
  quantity: number;
  totalValue: number;
  startDate: string;
  status: JobStatus;
  billingStatus?: BillingStatus;
  isArchived?: boolean;
  paymentStatus: 'Aguardando Pagamento' | 'Faturado' | 'Pago';
  orderAcceptanceNumber?: string;
  notes?: string;
  attachments?: JobAttachment[];
  invoiceUrl?: string;
  // Campos de ciclo de faturamento
  finishedAt?: string;
  acceptanceAt?: string;
  portalAt?: string;
  paidAt?: string;
}

export interface EventItem {
  name: string;
  quantity: number;
}

export interface EventRequest {
  id: string;
  requestDate: string;
  createdAt?: string;
  requestedBy: string;
  item: string; 
  quantity: number; 
  items?: EventItem[];
  superintendency?: string;
  billingName?: string;
  billingWhatsapp?: string;
  eventDate: string;
  eventTime: string;
  location: string;
  address: {
    street: string;
    neighborhood: string;
    complement: string;
    city: string;
    state: string;
    zipCode: string;
  };
  notes: string;
  focalPoint: string;
  email: string;
  status: EventStatus;
}

export interface VenturaFulfillment {
  eventId: string;
  deliveryDate: string;
  receivedBy: string;
  fulfillmentNotes: string;
  orderAcceptanceNumber?: string;
  boxQuantity: number;
  unitBoxValue: number;
  totalBoxValue: number;
  unitLabelValue: number;
  totalLabelValue: number;
  unitHandlingValue: number;
  totalHandlingValue: number;
  logisticsValue: number;
  extraExpenses: number;
  subtotalShipping: number;
  fee: number;
  subtotal1: number;
  taxes: number;
  totalInvoiced: number;
}

export interface DetailedEvent extends EventRequest {
  fulfillment?: VenturaFulfillment;
}

export interface InventoryItem {
  id: string;
  sku: string;
  description: string;
  totalQuantity: number;
  imageUrl: string;
  category: string;
  gender?: 'Masculino' | 'Feminino' | 'Unissex';
  size?: 'PP' | 'P' | 'M' | 'G' | 'GG' | 'XL' | 'N/A';
  clientId: string; 
  clientName: string;
  area: string;
  weightUnitG: number;
  dimensions: {
    width: number;
    height: number;
    depth: number;
  };
  location: string;
  qrCode: string;
  extraDescription?: string;
  boxes: number;
  supplier: string;
  job: string;
  generatePdf: boolean;
  company: string;
}

export interface Movement {
  id: string;
  itemId: string;
  itemName: string;
  dateTime: string;
  responsible: string;
  quantityChange: number;
  boxes?: number;
  observations: string;
  jobNumber?: string;
}

export interface Institution {
  id: string;
  name: string;
  department?: string;
  createdAt?: string;
}

export interface ClientAccount {
  id: string;
  name: string;
  email: string;
  company: string;
  status: string;
  createdAt: string;
}

export interface QuotationItem {
  id: string;
  sku: string;
  description: string;
  observations: string;
  imageUrl: string;
  productionTime: string;
  include: 'sim' | 'não' | 'cortesia';
  quantity: number;
  unitPrice: number;
  feePercentage: number;
  taxPercentage: number;
  unit_price?: number;
  tax_percentage?: number;
  fee_percentage?: number;
  image_url?: string;
  production_time?: string;
}

export interface Quotation {
  id: string;
  prospectJobId: string;
  status: string;
  lastUpdated: string;
  items: QuotationItem[];
  clientComments?: string;
}

export interface ProspectJob {
  id: string;
  openingDate: string;
  approvalMonth: string;
  description: string;
  clientName: string;
  clientEmail?: string;
  department?: string;
  jobType: string;
  company: string;
  budgetValue: number;
  status: ProspectJobStatus;
  quantity: number;
  items?: string;
  quotationId?: string;
  quotation?: Quotation;
}
