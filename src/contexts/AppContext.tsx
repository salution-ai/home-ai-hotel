'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Room, User, Hotel, Payment, Building, BusinessModel } from '../types';
import { initialRooms } from '../data/rooms';
import { samplePayments } from '../data/samplePayments';
import { getFeatures } from '../utils/businessModelFeatures';

interface AppContextType {
  user: User | null;
  hotel: Hotel | null;
  rooms: Room[];
  payments: Payment[];
  businessModel: BusinessModel | null;
  setBusinessModel: (model: BusinessModel | null) => void;
  login: (email: string, name: string) => void;
  logout: () => void;
  updateRoom: (roomId: string, updates: Partial<Room>) => void;
  checkIn: (roomId: string, guestData: any) => void;
  checkOut: (roomId: string) => void;
  markRoomCleaned: (roomId: string) => void;
  addStaff: (email: string, name: string, role: 'receptionist' | 'housekeeping') => void;
  setupHotel: (hotelName: string, adminEmail: string, adminName: string, businessModel: BusinessModel) => void;
  updateHotelInfo: (name: string, address: string) => void;
  updateBankAccount: (bankName: string, accountNumber: string, accountHolder: string) => void;
  addPayment: (payment: Payment) => void;
  addRoom: (room: Room) => void;
  deleteRoom: (roomId: string) => void;
  deleteFloor: (floor: number, buildingId?: string) => void;
  bulkUpdateRoomPrices: (roomIds: string[], price: number) => void;
  addBuilding: (building: Building) => void;
  updateBuilding: (buildingId: string, updates: Partial<Building>) => void;
  deleteBuilding: (buildingId: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children, defaultBusinessModel }: { children: ReactNode; defaultBusinessModel?: BusinessModel }) {
  const [user, setUser] = useState<User | null>(null);
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [rooms, setRooms] = useState<Room[]>(initialRooms);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [businessModel, setBusinessModelState] = useState<BusinessModel | null>(defaultBusinessModel || null);

  useEffect(() => {
    // Load from localStorage
    const savedUser = localStorage.getItem('hotel-app-user');
    const savedHotel = localStorage.getItem('hotel-app-hotel');
    const savedRooms = localStorage.getItem('hotel-app-rooms');
    const savedPayments = localStorage.getItem('hotel-app-payments');
    const savedBusinessModel = localStorage.getItem('hotel-app-business-model');

    if (savedUser) setUser(JSON.parse(savedUser));
    
    // Use defaultBusinessModel if provided, otherwise load from localStorage
    if (defaultBusinessModel) {
      setBusinessModelState(defaultBusinessModel);
    } else if (savedBusinessModel) {
      setBusinessModelState(JSON.parse(savedBusinessModel));
    }
    
    if (savedHotel) {
      const loadedHotel = JSON.parse(savedHotel);
      // Ensure buildings array exists (for backward compatibility)
      if (!loadedHotel.buildings) {
        loadedHotel.buildings = [
          {
            id: 'building-1',
            name: 'Tòa A',
            description: 'Tòa chính',
            order: 1,
          },
        ];
      }
      // Ensure businessModel exists (for backward compatibility)
      if (!loadedHotel.businessModel) {
        loadedHotel.businessModel = defaultBusinessModel || 'hotel'; // Default to hotel
      }
      // If defaultBusinessModel is provided, override the saved businessModel
      if (defaultBusinessModel) {
        loadedHotel.businessModel = defaultBusinessModel;
      }
      setHotel(loadedHotel);
      setBusinessModelState(loadedHotel.businessModel);
    }
    if (savedRooms) {
      const loadedRooms = JSON.parse(savedRooms);
      const validRoomTypes = ['Single', 'Double', 'Deluxe', 'Suite', 'Family'];
      // Ensure all rooms have buildingId and valid room type (for backward compatibility)
      const updatedRooms = loadedRooms.map((room: Room) => {
        const updates: Partial<Room> = {};
        if (!room.buildingId) {
          updates.buildingId = 'building-1';
        }
        // Fix invalid room types
        if (!validRoomTypes.includes(room.type)) {
          console.warn(`Room ${room.number} has invalid type "${room.type}", fixing to "Single"`);
          updates.type = 'Single' as any;
        }
        return Object.keys(updates).length > 0 ? { ...room, ...updates } : room;
      });
      setRooms(updatedRooms);
    }
    
    // Load payments or use sample data for demo
    if (savedPayments) {
      setPayments(JSON.parse(savedPayments));
    } else {
      setPayments(samplePayments);
    }
  }, []);

  useEffect(() => {
    if (user) localStorage.setItem('hotel-app-user', JSON.stringify(user));
    else localStorage.removeItem('hotel-app-user');
  }, [user]);

  useEffect(() => {
    if (hotel) localStorage.setItem('hotel-app-hotel', JSON.stringify(hotel));
    else localStorage.removeItem('hotel-app-hotel');
  }, [hotel]);

  useEffect(() => {
    localStorage.setItem('hotel-app-rooms', JSON.stringify(rooms));
  }, [rooms]);

  useEffect(() => {
    localStorage.setItem('hotel-app-payments', JSON.stringify(payments));
  }, [payments]);

  useEffect(() => {
    if (businessModel) {
      localStorage.setItem('hotel-app-business-model', JSON.stringify(businessModel));
    } else {
      localStorage.removeItem('hotel-app-business-model');
    }
  }, [businessModel]);

  const setBusinessModel = (model: BusinessModel) => {
    setBusinessModelState(model);
  };

  const setupHotel = (hotelName: string, adminEmail: string, adminName: string, model: BusinessModel) => {
    const features = getFeatures(model);
    
    // Setup buildings based on business model
    const buildings = features.multiBuilding
      ? [
          {
            id: 'building-1',
            name: 'Tòa A',
            description: 'Tòa chính',
            order: 1,
          },
          {
            id: 'building-2',
            name: 'Tòa B',
            description: 'Tòa phụ',
            order: 2,
          },
        ]
      : [
          {
            id: 'building-1',
            name: model === 'boarding-house' ? 'Khu A' : 'Tòa chính',
            description: model === 'boarding-house' ? 'Khu phòng trọ chính' : 'Tòa chính',
            order: 1,
          },
        ];

    // Setup staff based on business model
    const staff = features.staffManagement
      ? [
          {
            id: 'staff-1',
            email: 'letan@demo.com',
            name: 'Nguyễn Văn Lễ Tân',
            role: 'receptionist' as const,
          },
          {
            id: 'staff-2',
            email: 'buongphong@demo.com',
            name: 'Trần Thị Buồng Phòng',
            role: 'housekeeping' as const,
          },
        ]
      : [];

    const newHotel: Hotel = {
      id: Date.now().toString(),
      name: hotelName,
      adminEmail,
      businessModel: model,
      buildings,
      staff,
    };
    
    const newUser: User = {
      id: Date.now().toString(),
      email: adminEmail,
      name: adminName,
      role: 'admin',
      hotelId: newHotel.id,
      hotelName: newHotel.name,
    };
    
    setHotel(newHotel);
    setUser(newUser);
    setBusinessModelState(model);
  };

  const login = (email: string, name: string) => {
    if (!hotel) return;

    // Check if admin
    if (email === hotel.adminEmail) {
      setUser({
        id: Date.now().toString(),
        email,
        name,
        role: 'admin',
        hotelId: hotel.id,
        hotelName: hotel.name,
      });
      return;
    }

    // Check if staff
    const staff = hotel.staff.find(s => s.email === email);
    if (staff) {
      setUser({
        id: staff.id,
        email: staff.email,
        name: staff.name,
        role: staff.role,
        hotelId: hotel.id,
        hotelName: hotel.name,
      });
    }
  };

  const logout = () => {
    setUser(null);
  };

  const updateRoom = (roomOrRoomId: string | Room, updates?: Partial<Room>) => {
    // Support both signatures: updateRoom(room) and updateRoom(roomId, updates)
    if (typeof roomOrRoomId === 'string') {
      // Legacy signature: updateRoom(roomId, updates)
      setRooms(prev => prev.map(room => 
        room.id === roomOrRoomId ? { ...room, ...updates } : room
      ));
    } else {
      // New signature: updateRoom(room)
      const updatedRoom = roomOrRoomId;
      setRooms(prev => prev.map(room => 
        room.id === updatedRoom.id ? updatedRoom : room
      ));
    }
  };

  const checkIn = (roomId: string, guestData: any) => {
    updateRoom(roomId, {
      status: 'occupied',
      guest: {
        ...guestData,
        checkedInBy: user?.email || user?.name, // Track who checked in
      },
      booking: undefined,
    });
  };

  const checkOut = (roomId: string) => {
    updateRoom(roomId, {
      status: 'vacant-dirty',
      guest: undefined,
    });
  };

  const markRoomCleaned = (roomId: string) => {
    updateRoom(roomId, {
      status: 'vacant-clean',
    });
  };

  const addStaff = (email: string, name: string, role: 'receptionist' | 'housekeeping') => {
    if (!hotel) return;
    
    const newStaff = {
      id: Date.now().toString(),
      email,
      name,
      role,
    };

    setHotel({
      ...hotel,
      staff: [...hotel.staff, newStaff],
    });
  };

  const addPayment = (payment: Payment) => {
    setPayments([payment, ...payments]);
  };

  const addRoom = (room: Room) => {
    setRooms(prev => [...prev, room]);
  };

  const deleteRoom = (roomId: string) => {
    setRooms(rooms.filter(r => r.id !== roomId));
  };

  const deleteFloor = (floor: number, buildingId?: string) => {
    setRooms(rooms.filter(r => {
      // Keep rooms that are NOT on this floor
      if (r.floor !== floor) return true;
      
      // If buildingId is specified, only delete rooms in that building
      if (buildingId && r.buildingId !== buildingId) return true;
      
      // Don't delete this room (it's on the floor and in the building)
      return false;
    }));
  };

  const bulkUpdateRoomPrices = (roomIds: string[], price: number) => {
    setRooms(prev => prev.map(room => 
      roomIds.includes(room.id) ? { ...room, price } : room
    ));
  };

  const updateHotelInfo = (name: string, address: string) => {
    if (!hotel) return;
    setHotel({
      ...hotel,
      name,
      address,
    });
  };

  const updateBankAccount = (bankName: string, accountNumber: string, accountHolder: string) => {
    if (!hotel) return;
    setHotel({
      ...hotel,
      bankAccount: {
        bankName,
        accountNumber,
        accountHolder,
      },
    });
  };

  const addBuilding = (building: Building) => {
    if (!hotel) return;
    setHotel({
      ...hotel,
      buildings: [...hotel.buildings, building],
    });
  };

  const updateBuilding = (buildingId: string, updates: Partial<Building>) => {
    if (!hotel) return;
    setHotel({
      ...hotel,
      buildings: hotel.buildings.map(b =>
        b.id === buildingId ? { ...b, ...updates } : b
      ),
    });
  };

  const deleteBuilding = (buildingId: string) => {
    if (!hotel) return;
    
    // Check if any rooms are using this building
    const hasRooms = rooms.some(r => r.buildingId === buildingId);
    if (hasRooms) {
      alert('Không thể xóa tòa nhà đang có phòng. Vui lòng xóa hoặc chuyển phòng sang tòa khác trước.');
      return;
    }
    
    setHotel({
      ...hotel,
      buildings: hotel.buildings.filter(b => b.id !== buildingId),
    });
  };

  return (
    <AppContext.Provider
      value={{
        user,
        hotel,
        rooms,
        payments,
        businessModel,
        setBusinessModel,
        login,
        logout,
        updateRoom,
        checkIn,
        checkOut,
        markRoomCleaned,
        addStaff,
        setupHotel,
        updateHotelInfo,
        updateBankAccount,
        addPayment,
        addRoom,
        deleteRoom,
        deleteFloor,
        bulkUpdateRoomPrices,
        addBuilding,
        updateBuilding,
        deleteBuilding,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}