// GuestHouse API functions

import { api } from '../api';
import { Room, Hotel, Building, Payment, Staff } from '../../types';

// Types matching backend
export interface BackendHotel {
  id: number;
  userId: number;
  appId: number;
  name: string;
  address: string | null;
  adminEmail: string;
  businessModel: 'guesthouse';
  bankName: string | null;
  bankCode: string | null;
  accountNumber: string | null;
  accountHolder: string | null;
  taxCode: string | null;
  phoneNumber: string | null;
  email: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BackendBuilding {
  id: number;
  hotelId: number;
  name: string;
  description: string | null;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface BackendRoom {
  id: number;
  hotelId: number;
  buildingId: number;
  roomNumber: string;
  floor: number;
  roomType: 'Single' | 'Double' | 'Deluxe' | 'Suite' | 'Family';
  price: number;
  hourlyRate: number | null;
  status: 'vacant-clean' | 'occupied' | 'vacant-dirty' | 'due-out' | 'out-of-order';
  createdAt: string;
  updatedAt: string;
  guest: {
    id: number;
    name: string;
    phone: string;
    email: string | null;
    checkInDate: string;
    checkOutDate: string;
    totalAmount: number;
    isHourly: boolean;
    services: unknown[] | null;
    incidentalCharges: unknown[] | null;
    checkedInBy: string | null;
  } | null;
}

export interface BackendPayment {
  id: number;
  hotelId: number;
  roomId: number;
  roomNumber: string;
  guestName: string;
  checkInDate: string;
  checkOutDate: string;
  roomCharge: number;
  isHourly: boolean;
  services: unknown[] | null;
  incidentalCharges: unknown[] | null;
  subtotal: number;
  vat: number;
  total: number;
  paymentMethod: 'cash' | 'bank-transfer' | 'card' | 'momo' | 'vnpay';
  documentType: 'receipt' | 'invoice';
  companyName: string | null;
  companyTaxCode: string | null;
  companyAddress: string | null;
  processedBy: string;
  createdAt: string;
}

export interface BackendStaff {
  id: number;
  hotelId: number;
  email: string;
  name: string;
  role: 'receptionist' | 'housekeeping';
  createdAt: string;
  updatedAt: string;
}

// Convert backend types to frontend types
function convertHotel(backend: BackendHotel): Hotel {
  return {
    id: backend.id.toString(),
    name: backend.name,
    address: backend.address || undefined,
    adminEmail: backend.adminEmail,
    businessModel: backend.businessModel,
    buildings: [], // Will be loaded separately
    staff: [], // Will be loaded separately
    bankAccount: backend.bankName
      ? {
          bankName: backend.bankName,
          bankCode: backend.bankCode || '',
          accountNumber: backend.accountNumber || '',
          accountHolder: backend.accountHolder || '',
        }
      : undefined,
    taxCode: backend.taxCode || undefined,
    phoneNumber: backend.phoneNumber || undefined,
    email: backend.email || undefined,
  };
}

function convertBuilding(backend: BackendBuilding): Building {
  return {
    id: backend.id.toString(),
    name: backend.name,
    description: backend.description || undefined,
    order: backend.displayOrder,
  };
}

function convertRoom(backend: BackendRoom): Room {
  return {
    id: backend.id.toString(),
    number: backend.roomNumber,
    floor: backend.floor,
    buildingId: backend.buildingId.toString(),
    type: backend.roomType,
    price: backend.price,
    hourlyRate: backend.hourlyRate || undefined,
    status: backend.status,
    guest: backend.guest
      ? {
          name: backend.guest.name,
          phone: backend.guest.phone,
          email: backend.guest.email || undefined,
          checkInDate: backend.guest.checkInDate,
          checkOutDate: backend.guest.checkOutDate,
          totalAmount: backend.guest.totalAmount,
          services: backend.guest.services as any,
          incidentalCharges: backend.guest.incidentalCharges as any,
          checkedInBy: backend.guest.checkedInBy || undefined,
          isHourly: backend.guest.isHourly,
        }
      : undefined,
  };
}

function convertPayment(backend: BackendPayment): Payment {
  return {
    id: backend.id.toString(),
    roomNumber: backend.roomNumber,
    guestName: backend.guestName,
    checkInDate: backend.checkInDate,
    checkOutDate: backend.checkOutDate,
    roomCharge: backend.roomCharge,
    services: (backend.services as any) || [],
    incidentalCharges: (backend.incidentalCharges as any) || [],
    subtotal: backend.subtotal,
    vat: backend.vat,
    total: backend.total,
    paymentMethod: backend.paymentMethod,
    documentType: backend.documentType,
    companyName: backend.companyName || undefined,
    companyTaxCode: backend.companyTaxCode || undefined,
    companyAddress: backend.companyAddress || undefined,
    timestamp: backend.createdAt,
    processedBy: backend.processedBy,
  };
}

function convertStaff(backend: BackendStaff): Staff {
  return {
    id: backend.id.toString(),
    email: backend.email,
    name: backend.name,
    role: backend.role,
  };
}

// Hotel API
export const hotelApi = {
  get: async (): Promise<Hotel | null> => {
    const response = await api.get<{ hotel: BackendHotel } | { message: string }>('/guesthouse/hotels');
    // Backend returns { message: 'Hotel not found' } when no hotel exists
    if ('message' in response) {
      return null;
    }
    return convertHotel(response.hotel);
  },

  create: async (data: {
    name: string;
    address?: string;
    adminEmail: string;
    bankName?: string;
    accountNumber?: string;
    accountHolder?: string;
  }): Promise<Hotel> => {
    const response = await api.post<{ hotel: BackendHotel }>('/guesthouse/hotels', data);
    return convertHotel(response.hotel);
  },

  update: async (hotelId: string, data: {
    name?: string;
    address?: string;
    bankName?: string;
    bankCode?: string;
    accountNumber?: string;
    accountHolder?: string;
    taxCode?: string;
    phoneNumber?: string;
    email?: string;
  }): Promise<Hotel> => {
    const response = await api.put<{ hotel: BackendHotel }>(`/guesthouse/hotels/${hotelId}`, data);
    return convertHotel(response.hotel);
  },
};

// Building API
export const buildingApi = {
  getAll: async (hotelId: string): Promise<Building[]> => {
    const response = await api.get<{ buildings: BackendBuilding[] }>(`/guesthouse/buildings?hotelId=${hotelId}`);
    return response.buildings.map(convertBuilding);
  },

  create: async (data: {
    hotelId: string;
    name: string;
    description?: string;
    displayOrder?: number;
  }): Promise<Building> => {
    const response = await api.post<{ building: BackendBuilding }>('/guesthouse/buildings', data);
    return convertBuilding(response.building);
  },

  update: async (buildingId: string, data: {
    name?: string;
    description?: string;
    displayOrder?: number;
  }): Promise<Building> => {
    const response = await api.put<{ building: BackendBuilding }>(`/guesthouse/buildings/${buildingId}`, data);
    return convertBuilding(response.building);
  },

  delete: async (buildingId: string): Promise<void> => {
    await api.delete(`/guesthouse/buildings/${buildingId}`);
  },
};

// Room API
export const roomApi = {
  getAll: async (hotelId: string): Promise<Room[]> => {
    const response = await api.get<{ rooms: BackendRoom[] }>(`/guesthouse/rooms?hotelId=${hotelId}`);
    return response.rooms.map(convertRoom);
  },

  get: async (roomId: string): Promise<Room> => {
    const response = await api.get<{ room: BackendRoom }>(`/guesthouse/rooms/${roomId}`);
    return convertRoom(response.room);
  },

  create: async (data: {
    hotelId: string;
    buildingId: string;
    roomNumber: string;
    floor: number;
    roomType: 'Single' | 'Double' | 'Deluxe' | 'Suite' | 'Family';
    price: number;
    hourlyRate?: number;
    status?: 'vacant-clean' | 'occupied' | 'vacant-dirty' | 'due-out' | 'out-of-order';
  }): Promise<Room> => {
    const response = await api.post<{ room: BackendRoom }>('/guesthouse/rooms', data);
    return convertRoom(response.room);
  },

  update: async (roomId: string, data: {
    roomNumber?: string;
    floor?: number;
    roomType?: 'Single' | 'Double' | 'Deluxe' | 'Suite' | 'Family';
    price?: number;
    hourlyRate?: number | null;
    status?: 'vacant-clean' | 'occupied' | 'vacant-dirty' | 'due-out' | 'out-of-order';
    buildingId?: string;
  }): Promise<Room> => {
    const response = await api.put<{ room: BackendRoom }>(`/guesthouse/rooms/${roomId}`, data);
    return convertRoom(response.room);
  },

  delete: async (roomId: string): Promise<void> => {
    await api.delete(`/guesthouse/rooms/${roomId}`);
  },

  checkIn: async (roomId: string, data: {
    name: string;
    phone: string;
    email?: string;
    checkInDate: string;
    checkOutDate: string;
    totalAmount: number;
    isHourly: boolean;
    services?: unknown[];
    incidentalCharges?: unknown[];
    checkedInBy?: string;
  }): Promise<Room> => {
    const response = await api.post<{ room: BackendRoom }>(`/guesthouse/rooms/${roomId}/check-in`, data);
    return convertRoom(response.room);
  },

  checkOut: async (roomId: string): Promise<Room> => {
    const response = await api.post<{ room: BackendRoom }>(`/guesthouse/rooms/${roomId}/check-out`);
    return convertRoom(response.room);
  },

  markCleaned: async (roomId: string): Promise<Room> => {
    const response = await api.post<{ room: BackendRoom }>(`/guesthouse/rooms/${roomId}/clean`);
    return convertRoom(response.room);
  },
};

// Payment API
export const paymentApi = {
  getAll: async (hotelId: string, limit?: number, offset?: number): Promise<Payment[]> => {
    let url = `/guesthouse/payments?hotelId=${hotelId}`;
    if (limit !== undefined) url += `&limit=${limit}`;
    if (offset !== undefined) url += `&offset=${offset}`;
    const response = await api.get<{ payments: BackendPayment[] }>(url);
    return response.payments.map(convertPayment);
  },

  create: async (data: {
    hotelId: string;
    roomId: string;
    roomNumber: string;
    guestName: string;
    checkInDate: string;
    checkOutDate: string;
    roomCharge: number;
    isHourly: boolean;
    services?: unknown[];
    incidentalCharges?: unknown[];
    subtotal: number;
    vat: number;
    total: number;
    paymentMethod: 'cash' | 'bank-transfer' | 'card' | 'momo' | 'vnpay';
    documentType?: 'receipt' | 'invoice';
    companyName?: string;
    companyTaxCode?: string;
    companyAddress?: string;
    processedBy: string;
  }): Promise<Payment> => {
    const response = await api.post<{ payment: BackendPayment }>('/guesthouse/payments', data);
    return convertPayment(response.payment);
  },

  deleteByPeriod: async (hotelId: string, period: 'today' | 'month' | 'year'): Promise<number> => {
    const response = await api.delete<{ deletedCount: number; message: string }>(
      `/guesthouse/payments?hotelId=${hotelId}&period=${period}`
    );
    return response.deletedCount;
  },
};

// Staff API
export const staffApi = {
  getAll: async (hotelId: string): Promise<Staff[]> => {
    const response = await api.get<{ staff: BackendStaff[] }>(`/guesthouse/staff?hotelId=${hotelId}`);
    return response.staff.map(convertStaff);
  },

  create: async (data: {
    hotelId: string;
    email: string;
    name: string;
    role: 'receptionist' | 'housekeeping';
  }): Promise<Staff> => {
    const response = await api.post<{ staff: BackendStaff }>('/guesthouse/staff', data);
    return convertStaff(response.staff);
  },

  update: async (staffId: string, data: {
    email?: string;
    name?: string;
    role?: 'receptionist' | 'housekeeping';
  }): Promise<Staff> => {
    const response = await api.put<{ staff: BackendStaff }>(`/guesthouse/staff/${staffId}`, data);
    return convertStaff(response.staff);
  },

  delete: async (staffId: string): Promise<void> => {
    await api.delete(`/guesthouse/staff/${staffId}`);
  },
};

// Revenue API
export const revenueApi = {
  getReport: async (hotelId: string) => {
    return api.get(`/guesthouse/revenue?hotelId=${hotelId}`);
  },

  getByDateRange: async (hotelId: string, startDate: string, endDate: string) => {
    return api.get(`/guesthouse/revenue/range?hotelId=${hotelId}&startDate=${startDate}&endDate=${endDate}`);
  },
};

