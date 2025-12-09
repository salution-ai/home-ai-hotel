export type RoomStatus = 'vacant-clean' | 'occupied' | 'vacant-dirty' | 'due-out' | 'out-of-order';

export type RoomType = 'Single' | 'Double' | 'Deluxe' | 'Suite' | 'Family';

export type UserRole = 'admin' | 'receptionist' | 'housekeeping';

export type BusinessModel = 'hotel' | 'guesthouse' | 'boarding-house';

export type PaymentMethod = 'cash' | 'bank-transfer' | 'card' | 'momo' | 'vnpay';

export type DocumentType = 'receipt' | 'invoice';

export interface Service {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface IncidentalCharge {
  id: string;
  description: string;
  amount: number;
  quantity: number;
  timestamp: string;
  addedBy: string;
}

export interface Payment {
  id: string;
  roomId?: string; // Link to room for building lookup
  roomNumber: string;
  guestName: string;
  checkInDate: string;
  checkOutDate: string;
  roomCharge: number;
  isHourly: boolean;
  services: Service[];
  incidentalCharges: IncidentalCharge[];
  subtotal: number;
  vat: number;
  total: number;
  paymentMethod: PaymentMethod;
  documentType: DocumentType;
  companyName?: string;
  companyTaxCode?: string;
  companyAddress?: string;
  timestamp: string;
  processedBy: string;
}

export interface Building {
  id: string;
  name: string;
  description?: string;
  order: number;
}

export interface UtilityReading {
  electricity?: {
    oldReading: number;
    newReading: number;
    pricePerUnit: number; // Price per kWh
  };
  water?: {
    oldReading: number;
    newReading: number;
    pricePerUnit: number; // Price per m³
  };
  internet?: number; // Fixed monthly fee
  other?: Array<{
    name: string;
    amount: number;
  }>;
}

export interface MonthlyRental {
  month: string; // Format: YYYY-MM
  rentAmount: number;
  utilities?: UtilityReading;
  paid: boolean;
  paidDate?: string;
  paidAmount?: number;
  paymentMethod?: PaymentMethod;
}

export interface Room {
  id: string;
  number: string;
  floor: number;
  buildingId: string;
  type: RoomType;
  price: number;
  hourlyRate?: number; // Giá theo giờ (cho nhà nghỉ)
  status: RoomStatus;
  guest?: {
    name: string;
    phone?: string;
    email?: string;
    checkInDate: string;
    checkOutDate: string;
    totalAmount: number;
    services?: Service[];
    incidentalCharges?: IncidentalCharge[];
    checkedInBy?: string; // Email or name of receptionist who checked in
    isHourly?: boolean; // Thuê theo giờ hay theo ngày
  };
  booking?: {
    guestName: string;
    phone: string;
    email?: string;
    bookingDate: string;
    checkInDate: string;
    checkOutDate: string;
  };
  // Boarding house specific
  tenant?: {
    name: string;
    phone: string;
    idCard?: string; // CMND/CCCD
    moveInDate: string;
    deposit: number; // Tiền cọc
    monthlyRent: number; // Tiền thuê/tháng
    electricityPrice?: number; // Giá điện/kWh
    waterPrice?: number; // Giá nước/m³
    internetFee?: number; // Phí internet cố định
    monthlyHistory: MonthlyRental[]; // Lịch sử thanh toán theo tháng
  };
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  hotelId: string;
  hotelName: string;
}

export interface Staff {
  id: string;
  email: string;
  name: string;
  role: 'receptionist' | 'housekeeping';
}

export interface Hotel {
  id: string;
  name: string;
  address?: string;
  adminEmail: string;
  businessModel: BusinessModel;
  buildings: Building[];
  staff: Staff[];
  bankAccount?: {
    bankName: string;
    bankCode: string;
    accountNumber: string;
    accountHolder: string;
  };
  taxCode?: string;
  phoneNumber?: string;
  email?: string;
}