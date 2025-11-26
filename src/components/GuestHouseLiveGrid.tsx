'use client'

import { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { Room } from '../types';
import { Menu, Clock, DollarSign, Plus, DoorOpen, Trash2, Layers, Building2, ChevronDown, ChevronUp, HelpCircle, X } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { AppMenu } from './AppMenu';
import { GuestHouseRoomDialog } from './GuestHouseRoomDialog';
import { GuestHouseRevenueDialog } from './GuestHouseRevenueDialog';
import { AddRoomDialog } from './AddRoomDialog';
import { AddFloorDialog } from './AddFloorDialog';
import { AddBuildingDialog } from './AddBuildingDialog';
import { HelpDialog } from './HelpDialog';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from './ui/alert-dialog';
import { toast } from 'sonner';

export function GuestHouseLiveGrid() {
  const { user, hotel, rooms, deleteRoom, deleteFloor, deleteBuilding } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [addRoomOpen, setAddRoomOpen] = useState(false);
  const [addFloorOpen, setAddFloorOpen] = useState(false);
  const [addBuildingOpen, setAddBuildingOpen] = useState(false);
  const [fabMenuOpen, setFabMenuOpen] = useState(false);
  const [revenueDialogOpen, setRevenueDialogOpen] = useState(false);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'room' | 'floor' | 'building', id: string, name: string, buildingId?: string, floor?: number } | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [collapsedBuildings, setCollapsedBuildings] = useState<Set<string>>(new Set());
  const [collapsedFloors, setCollapsedFloors] = useState<Set<string>>(new Set());
  const [roomFilter, setRoomFilter] = useState<'all' | 'occupied' | 'vacant'>('all');
  const fabMenuRef = useRef<HTMLDivElement>(null);

  // Handle click outside FAB menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fabMenuOpen && fabMenuRef.current && !fabMenuRef.current.contains(event.target as Node)) {
        setFabMenuOpen(false);
      }
    };

    if (fabMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [fabMenuOpen]);

  // Stats
  const totalRooms = rooms.length;
  const occupiedRooms = rooms.filter(r => r.guest).length; // Đơn giản: có guest = đang thuê
  const vacantRooms = totalRooms - occupiedRooms;
  
  // Calculate today's revenue
  const todayRevenue = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    let total = 0;
    rooms.forEach(room => {
      if (room.guest && room.guest.checkInDate.startsWith(today)) {
        total += room.guest.totalAmount;
      }
    });
    return total;
  }, [rooms]);

  // Calculate hourly vs daily occupancy
  const hourlyRooms = rooms.filter(r => r.guest?.isHourly).length;
  const dailyRooms = occupiedRooms - hourlyRooms;

  const getRoomStatusColor = (room: Room) => {
    if (room.guest) {
      return room.guest.isHourly 
        ? 'bg-blue-500 border-blue-700 hover:bg-blue-600' 
        : 'bg-green-500 border-green-700 hover:bg-green-600';
    }
    if (room.status === 'vacant-dirty') {
      return 'bg-yellow-400 border-yellow-600 hover:bg-yellow-500';
    }
    return 'bg-gray-300 border-gray-500 hover:bg-gray-400';
  };

  const getRoomStatusText = (room: Room) => {
    if (room.guest) {
      return { 
        text: room.guest.isHourly ? 'Giờ' : 'Ngày', 
        color: room.guest.isHourly ? 'text-blue-600' : 'text-green-600' 
      };
    }
    if (room.status === 'vacant-dirty') {
      return { text: 'Dọn', color: 'text-yellow-600' };
    }
    return { text: 'Trống', color: 'text-gray-600' };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount);
  };

  const handleLongPressStart = (room: Room) => {
    const timer = setTimeout(() => {
      if (room.guest) {
        toast.error('Không thể xóa phòng đang có khách');
      } else {
        setDeleteConfirm({ 
          type: 'room',
          id: room.id, 
          name: `Phòng ${room.number}` 
        });
      }
    }, 800); // 800ms long press
    setLongPressTimer(timer);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  // Group rooms by building and floor
  const roomsByBuilding = useMemo(() => {
    const grouped: { [buildingId: string]: { [floor: number]: Room[] } } = {};
    
    rooms.forEach(room => {
      const buildingId = room.buildingId || 'default';
      if (!grouped[buildingId]) {
        grouped[buildingId] = {};
      }
      if (!grouped[buildingId][room.floor]) {
        grouped[buildingId][room.floor] = [];
      }
      grouped[buildingId][room.floor].push(room);
    });
    
    // Sort rooms by number within each floor
    Object.keys(grouped).forEach(buildingId => {
      Object.keys(grouped[buildingId]).forEach(floor => {
        grouped[buildingId][Number(floor)].sort((a, b) => 
          a.number.localeCompare(b.number, undefined, { numeric: true })
        );
      });
    });
    
    return grouped;
  }, [rooms]);

  // Fallback: Group by floor only
  const roomsByFloor = useMemo(() => {
    const grouped: { [key: number]: Room[] } = {};
    rooms.forEach(room => {
      if (!grouped[room.floor]) {
        grouped[room.floor] = [];
      }
      grouped[room.floor].push(room);
    });
    
    // Sort rooms by number within each floor
    Object.keys(grouped).forEach(floor => {
      grouped[Number(floor)].sort((a, b) => 
        a.number.localeCompare(b.number, undefined, { numeric: true })
      );
    });
    
    return grouped;
  }, [rooms]);

  const toggleBuilding = (buildingId: string) => {
    const newCollapsed = new Set(collapsedBuildings);
    if (newCollapsed.has(buildingId)) {
      newCollapsed.delete(buildingId);
    } else {
      newCollapsed.add(buildingId);
    }
    setCollapsedBuildings(newCollapsed);
  };

  const toggleFloor = (floorKey: string) => {
    const newCollapsed = new Set(collapsedFloors);
    if (newCollapsed.has(floorKey)) {
      newCollapsed.delete(floorKey);
    } else {
      newCollapsed.add(floorKey);
    }
    setCollapsedFloors(newCollapsed);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Top Row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMenuOpen(true)}
                className="text-white hover:bg-white/20"
              >
                <Menu className="w-8 h-8" />
              </Button>
              <div>
                <p className="text-base font-semibold text-white/90">Quản lý</p>
                <p className="text-2xl text-white font-bold">{user?.name}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={() => setHelpDialogOpen(true)}
                className="text-white hover:bg-white/20 !w-[54px] !h-[54px] p-0"
                title="Hướng dẫn sử dụng"
              >
                <HelpCircle className="!w-[40px] !h-[40px]" />
              </Button>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-4 gap-3">
            <Card 
              className={`bg-white/95 backdrop-blur border-0 p-4 cursor-pointer hover:shadow-xl transition-all active:scale-95 ${roomFilter === 'all' ? 'ring-2 ring-blue-500' : ''}`}
              onClick={() => setRoomFilter('all')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg text-gray-600">Tổng phòng</p>
                  <p className="text-4xl font-bold text-blue-600">{totalRooms}</p>
                  {roomFilter === 'all' && <p className="text-xs text-blue-600 mt-1">✓ Đang hiển thị tất cả</p>}
                </div>
                <DoorOpen className="w-12 h-12 text-blue-400" />
              </div>
            </Card>

            <Card 
              className={`bg-white/95 backdrop-blur border-0 p-4 cursor-pointer hover:shadow-xl transition-all active:scale-95 ${roomFilter === 'occupied' ? 'ring-2 ring-green-500' : ''}`}
              onClick={() => setRoomFilter('occupied')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg text-gray-600">Đang thuê</p>
                  <p className="text-4xl font-bold text-green-600">{occupiedRooms}</p>
                  <p className="text-sm text-gray-500">Giờ: {hourlyRooms} | Ngày: {dailyRooms}</p>
                  {roomFilter === 'occupied' && <p className="text-xs text-green-600 mt-1">✓ Đang lọc phòng có khách</p>}
                </div>
              </div>
            </Card>

            <Card 
              className={`bg-white/95 backdrop-blur border-0 p-4 cursor-pointer hover:shadow-xl transition-all active:scale-95 ${roomFilter === 'vacant' ? 'ring-2 ring-gray-500' : ''}`}
              onClick={() => setRoomFilter('vacant')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg text-gray-600">Còn trống</p>
                  <p className="text-4xl font-bold text-gray-600">{vacantRooms}</p>
                  {roomFilter === 'vacant' && <p className="text-xs text-gray-600 mt-1">✓ Đang lọc phòng trống</p>}
                </div>
              </div>
            </Card>

            <Card 
              className="bg-white/95 backdrop-blur border-0 p-4 cursor-pointer hover:shadow-lg transition-shadow active:scale-95"
              onClick={() => setRevenueDialogOpen(true)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg text-gray-600">Doanh thu hôm nay</p>
                  <p className="text-3xl font-bold text-blue-600">{formatCurrency(todayRevenue)}₫</p>
                  <p className="text-xs text-gray-500 mt-1">👆 Nhấn để xem chi tiết</p>
                </div>
                <DollarSign className="w-12 h-12 text-green-400" />
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Room Grid */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="space-y-6">
          {(() => {
            // Get all buildings that have rooms, including ones not in hotel.buildings
            const buildingsWithRooms = new Set(Object.keys(roomsByBuilding));
            const allBuildings = [
              ...(hotel?.buildings || []),
              // Add buildings from rooms that aren't in hotel.buildings
              ...Array.from(buildingsWithRooms)
                .filter(buildingId => !hotel?.buildings?.some(b => b.id === buildingId))
                .map((buildingId, index) => ({
                  id: buildingId,
                  name: buildingId === 'default' ? 'Mặc định' : 
                        buildingId === 'building-1' ? 'Tòa chính' : 
                        buildingId === 'building-2' ? 'Tòa B' : 
                        buildingId.replace('building-', 'Tòa '),
                  description: '',
                  order: (hotel?.buildings?.length || 0) + index + 1
                }))
            ];
            
            return allBuildings.length > 0 ? (
              allBuildings.sort((a, b) => {
                // Sort by order if available, otherwise by id
                if (a.order !== undefined && b.order !== undefined) {
                  return a.order - b.order;
                }
                return a.id.localeCompare(b.id);
              }).map(building => {
                const buildingRoomsData = roomsByBuilding[building.id] || {};
                // Show all buildings from hotel.buildings, even if they have no rooms yet
                const hasRooms = buildingRoomsData && Object.keys(buildingRoomsData).length > 0;
                const isInHotelBuildings = hotel?.buildings?.some(b => b.id === building.id);
                
                // Only filter out auto-created buildings that have no rooms
                if (!hasRooms && !isInHotelBuildings) return null;

              const buildingFloors = hasRooms 
                ? Object.keys(buildingRoomsData).map(Number).sort((a, b) => b - a)
                : [];
              const totalBuildingRooms = hasRooms
                ? buildingFloors.reduce((sum, floor) => sum + buildingRoomsData[floor].length, 0)
                : 0;
              const isCollapsed = collapsedBuildings.has(building.id);

              return (
                <div key={building.id} className="space-y-4">
                  {/* Building Header */}
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-3 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div 
                        className="flex items-center gap-3 cursor-pointer flex-1"
                        onClick={() => toggleBuilding(building.id)}
                      >
                        <Building2 className="w-5 h-5 text-white" />
                        <h2 className="text-white font-medium">{building.name}</h2>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                          {totalBuildingRooms} phòng
                        </Badge>
                        
                        {/* Delete Building Button */}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            const hasRooms = rooms.some(r => r.buildingId === building.id);
                            if (hasRooms) {
                              toast.error('Không thể xóa tòa nhà đang có phòng. Vui lòng xóa hoặc chuyển phòng sang tòa khác trước.');
                              return;
                            }
                            setDeleteConfirm({ 
                              type: 'building', 
                              id: building.id,
                              name: building.name,
                              buildingId: building.id
                            });
                          }}
                          className="text-white hover:text-red-200 hover:bg-white/20 h-8 w-8 p-0"
                          title="Xóa tòa nhà"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        
                        <div 
                          className="cursor-pointer"
                          onClick={() => toggleBuilding(building.id)}
                        >
                          {isCollapsed ? (
                            <ChevronDown className="w-5 h-5 text-white" />
                          ) : (
                            <ChevronUp className="w-5 h-5 text-white" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Building Floors */}
                  {!isCollapsed && (
                    <div className="space-y-4">
                      {hasRooms ? (
                        buildingFloors.map(floor => {
                        const floorRooms = buildingRoomsData[floor];
                        if (!floorRooms || floorRooms.length === 0) return null;

                        const floorKey = `${building.id}-${floor}`;
                        const isFloorCollapsed = collapsedFloors.has(floorKey);
                        const occupiedCount = floorRooms.filter(r => r.guest).length;
                        const vacantCount = floorRooms.length - occupiedCount;

                        return (
                          <div key={floor} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                            {/* Floor Header */}
                            <div 
                              className="mb-3 flex flex-wrap items-center justify-between gap-2"
                            >
                              <div 
                                className="flex items-center gap-2 flex-1 cursor-pointer"
                                onClick={() => toggleFloor(floorKey)}
                              >
                                <Layers className="w-4 h-4 text-gray-600" />
                                <h3 className="text-gray-900 font-medium">Tầng {floor}</h3>
                                <Badge variant="outline" className="text-xs">
                                  {floorRooms.length} phòng
                                </Badge>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                {occupiedCount > 0 && (
                                  <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">
                                    {occupiedCount} có khách
                                  </Badge>
                                )}
                                {vacantCount > 0 && (
                                  <Badge className="bg-gray-100 text-gray-700 border-gray-200 text-xs">
                                    {vacantCount} trống
                                  </Badge>
                                )}
                                
                                {/* Delete Floor Button */}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const hasOccupiedRooms = floorRooms.some(r => r.guest);
                                    if (hasOccupiedRooms) {
                                      toast.error('Không thể xóa tầng đang có khách. Vui lòng trả phòng trước.');
                                      return;
                                    }
                                    setDeleteConfirm({ 
                                      type: 'floor', 
                                      id: floorKey,
                                      name: `Tầng ${floor}`,
                                      buildingId: building.id,
                                      floor: floor
                                    });
                                  }}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                                  title="Xóa tầng"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                                
                                <div 
                                  className="cursor-pointer p-1"
                                  onClick={() => toggleFloor(floorKey)}
                                >
                                  {isFloorCollapsed ? (
                                    <ChevronDown className="w-4 h-4 text-gray-600" />
                                  ) : (
                                    <ChevronUp className="w-4 h-4 text-gray-600" />
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {/* Room Cards Grid */}
                            {!isFloorCollapsed && (
                              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                                {floorRooms
                                  .filter(room => {
                                    if (roomFilter === 'occupied') return room.guest;
                                    if (roomFilter === 'vacant') return !room.guest;
                                    return true;
                                  })
                                  .map(room => {
                                  const statusInfo = getRoomStatusText(room);
                                  
                                  return (
                                    <Card
                                      key={room.id}
                                      onClick={() => setSelectedRoom(room)}
                                      onTouchStart={() => handleLongPressStart(room)}
                                      onTouchEnd={handleLongPressEnd}
                                      onMouseDown={() => handleLongPressStart(room)}
                                      onMouseUp={handleLongPressEnd}
                                      onMouseLeave={handleLongPressEnd}
                                      className={`${getRoomStatusColor(room)} p-4 cursor-pointer transition-all border-2 hover:shadow-xl active:scale-95 relative`}
                                    >
                                      {/* Delete Room Button */}
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (room.guest) {
                                            toast.error('Không thể xóa phòng đang có khách. Vui lòng trả phòng trước.');
                                            return;
                                          }
                                          setDeleteConfirm({ 
                                            type: 'room', 
                                            id: room.id, 
                                            name: `Phòng ${room.number}` 
                                          });
                                        }}
                                        className="absolute top-1 right-1 h-6 w-6 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50 z-10"
                                        title="Xóa phòng"
                                      >
                                        <X className="w-3 h-3" />
                                      </Button>
                                      <div className="text-center space-y-2">
                                        <p className="text-2xl font-bold text-white">{room.number} - {room.type}</p>
                                        <Badge variant="outline" className={`${statusInfo.color} bg-white font-bold text-base px-3 py-1`}>
                                          {statusInfo.text}
                                        </Badge>
                                        
                                        {room.guest && (
                                          <div className="text-sm">
                                            <p className="font-semibold text-white truncate">{room.guest.name}</p>
                                            <p className="text-xs text-white/90">
                                              {room.guest.isHourly 
                                                ? `${formatCurrency(room.hourlyRate || 0)}₫/giờ`
                                                : `${formatCurrency(room.price)}₫/ngày`
                                              }
                                            </p>
                                          </div>
                                        )}
                                        
                                        {!room.guest && (
                                          <div className="text-sm space-y-1">
                                            <p className="text-xs text-gray-800">
                                              Giờ: {formatCurrency(room.hourlyRate || 0)}₫
                                            </p>
                                            <p className="text-xs text-gray-800">
                                              Ngày: {formatCurrency(room.price)}₫
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    </Card>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })
                      ) : (
                        <div className="bg-gray-50 rounded-lg p-8 text-center border border-gray-200">
                          <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                          <p className="text-gray-500 font-medium">Chưa có phòng nào</p>
                          <p className="text-sm text-gray-400 mt-1">Thêm tầng và phòng để bắt đầu</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            }).filter(Boolean)
            ) : (
            // Fallback: Simple floor grouping
            Object.keys(roomsByFloor).map(Number).sort((a, b) => b - a).map(floor => {
              const floorRooms = roomsByFloor[floor];
              if (!floorRooms || floorRooms.length === 0) return null;

              const floorKey = `default-${floor}`;
              const isFloorCollapsed = collapsedFloors.has(floorKey);
              const occupiedCount = floorRooms.filter(r => r.guest).length;
              const vacantCount = floorRooms.length - occupiedCount;

              return (
                <div key={floor} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  {/* Floor Header */}
                  <div 
                    className="mb-3 flex flex-wrap items-center justify-between gap-2"
                  >
                    <div 
                      className="flex items-center gap-2 flex-1 cursor-pointer"
                      onClick={() => toggleFloor(floorKey)}
                    >
                      <Layers className="w-4 h-4 text-gray-600" />
                      <h3 className="text-gray-900 font-medium">Tầng {floor}</h3>
                      <Badge variant="outline" className="text-xs">
                        {floorRooms.length} phòng
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {occupiedCount > 0 && (
                        <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">
                          {occupiedCount} có khách
                        </Badge>
                      )}
                      {vacantCount > 0 && (
                        <Badge className="bg-gray-100 text-gray-700 border-gray-200 text-xs">
                          {vacantCount} trống
                        </Badge>
                      )}
                      
                      {/* Delete Floor Button */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          const hasOccupiedRooms = floorRooms.some(r => r.guest);
                          if (hasOccupiedRooms) {
                            toast.error('Không thể xóa tầng đang có khách. Vui lòng trả phòng trước.');
                            return;
                          }
                          setDeleteConfirm({ 
                            type: 'floor', 
                            id: floorKey,
                            name: `Tầng ${floor}`,
                            buildingId: undefined,
                            floor: floor
                          });
                        }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                        title="Xóa tầng"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      
                      <div 
                        className="cursor-pointer p-1"
                        onClick={() => toggleFloor(floorKey)}
                      >
                        {isFloorCollapsed ? (
                          <ChevronDown className="w-4 h-4 text-gray-600" />
                        ) : (
                          <ChevronUp className="w-4 h-4 text-gray-600" />
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Room Cards Grid */}
                  {!isFloorCollapsed && (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                      {floorRooms
                        .filter(room => {
                          if (roomFilter === 'occupied') return room.guest;
                          if (roomFilter === 'vacant') return !room.guest;
                          return true;
                        })
                        .map(room => {
                        const statusInfo = getRoomStatusText(room);
                        
                        return (
                          <Card
                            key={room.id}
                            onClick={() => setSelectedRoom(room)}
                            onTouchStart={() => handleLongPressStart(room)}
                            onTouchEnd={handleLongPressEnd}
                            onMouseDown={() => handleLongPressStart(room)}
                            onMouseUp={handleLongPressEnd}
                            onMouseLeave={handleLongPressEnd}
                            className={`${getRoomStatusColor(room)} p-4 cursor-pointer transition-all border-2 hover:shadow-xl active:scale-95 relative`}
                          >
                            {/* Delete Room Button */}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (room.guest) {
                                  toast.error('Không thể xóa phòng đang có khách. Vui lòng trả phòng trước.');
                                  return;
                                }
                                setDeleteConfirm({ 
                                  type: 'room', 
                                  id: room.id, 
                                  name: `Phòng ${room.number}` 
                                });
                              }}
                              className="absolute top-1 right-1 h-6 w-6 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50 z-10"
                              title="Xóa phòng"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                            <div className="text-center space-y-2">
                              <p className="text-2xl font-bold text-white">{room.number} - {room.type}</p>
                              <Badge variant="outline" className={`${statusInfo.color} bg-white font-bold text-base px-3 py-1`}>
                                {statusInfo.text}
                              </Badge>
                              
                              {room.guest && (
                                <div className="text-sm">
                                  <p className="font-semibold text-white truncate">{room.guest.name}</p>
                                  <p className="text-xs text-white/90">
                                    {room.guest.isHourly 
                                      ? `${formatCurrency(room.hourlyRate || 0)}₫/giờ`
                                      : `${formatCurrency(room.price)}₫/ngày`
                                    }
                                  </p>
                                </div>
                              )}
                              
                              {!room.guest && (
                                <div className="text-sm space-y-1">
                                  <p className="text-xs text-gray-800">
                                    Giờ: {formatCurrency(room.hourlyRate || 0)}₫
                                  </p>
                                  <p className="text-xs text-gray-800">
                                    Ngày: {formatCurrency(room.price)}₫
                                  </p>
                                </div>
                              )}
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
            );
          })()}
        </div>

        {/* Hint for delete */}
        {rooms.length > 0 && (
          <p className="text-center text-sm text-gray-500 mt-4">
            💡 Nhấn nút X trên phòng/tầng để xóa
          </p>
        )}
      </div>

      {/* FAB - Floating Action Button */}
      <div 
        ref={fabMenuRef}
        className="fixed bottom-4 left-4 z-40"
      >
        {/* FAB Menu */}
        {fabMenuOpen && (
          <div className="mb-3 bg-white rounded-lg shadow-2xl border-2 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
            <button
              onClick={() => {
                setAddBuildingOpen(true);
                setFabMenuOpen(false);
              }}
              className="flex items-center gap-3 px-4 py-3 hover:bg-purple-50 transition-colors w-full text-left border-b"
            >
              <Building2 className="w-5 h-5 text-purple-600" />
              <span className="font-medium text-gray-900">Thêm tòa mới</span>
            </button>
            <button
              onClick={() => {
                setAddFloorOpen(true);
                setFabMenuOpen(false);
              }}
              className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition-colors w-full text-left border-b"
            >
              <Layers className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-gray-900">Thêm Tầng Mới</span>
            </button>
            <button
              onClick={() => {
                setAddRoomOpen(true);
                setFabMenuOpen(false);
              }}
              className="flex items-center gap-3 px-4 py-3 hover:bg-green-50 transition-colors w-full text-left"
            >
              <DoorOpen className="w-5 h-5 text-green-600" />
              <span className="font-medium text-gray-900">Thêm Phòng</span>
            </button>
          </div>
        )}
        
        {/* FAB Button */}
        <Button
          size="lg"
          onClick={() => setFabMenuOpen(!fabMenuOpen)}
          className="w-16 h-16 rounded-full shadow-2xl bg-blue-600 hover:bg-blue-700 border-4 border-blue-700 hover:scale-110 transition-transform"
          title="Thêm Tầng/Phòng"
        >
          <Plus className={`w-8 h-8 transition-transform ${fabMenuOpen ? 'rotate-45' : ''}`} />
        </Button>
      </div>

      {/* Legend */}
      <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 border-2 z-30">
        <p className="text-base font-bold mb-3 text-gray-800">Chú thích</p>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-500 border-2 border-blue-700 rounded"></div>
            <span className="text-sm text-gray-700">Thuê giờ</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-green-500 border-2 border-green-700 rounded"></div>
            <span className="text-sm text-gray-700">Thuê ngày</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-yellow-400 border-2 border-yellow-600 rounded"></div>
            <span className="text-sm text-gray-700">Cần dọn</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gray-300 border-2 border-gray-500 rounded"></div>
            <span className="text-sm text-gray-700">Phòng trống</span>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <AppMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      
      {selectedRoom && (
        <GuestHouseRoomDialog
          room={selectedRoom}
          open={!!selectedRoom}
          onClose={() => setSelectedRoom(null)}
        />
      )}

      <AddRoomDialog
        open={addRoomOpen}
        onClose={() => setAddRoomOpen(false)}
      />

      <AddFloorDialog
        open={addFloorOpen}
        onClose={() => setAddFloorOpen(false)}
      />


      <AddBuildingDialog
        open={addBuildingOpen}
        onClose={() => setAddBuildingOpen(false)}
      />

      <GuestHouseRevenueDialog
        open={revenueDialogOpen}
        onClose={() => setRevenueDialogOpen(false)}
      />

      <HelpDialog
        open={helpDialogOpen}
        onClose={() => setHelpDialogOpen(false)}
        businessModel="guesthouse"
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-6 h-6 text-red-600" />
              Xác Nhận Xóa
            </AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn xóa <strong>{deleteConfirm?.name}</strong>?
              {deleteConfirm?.type === 'floor' && (
                <span className="block mt-2 text-red-600">
                  ⚠️ Tất cả phòng trong tầng này sẽ bị xóa vĩnh viễn!
                </span>
              )}
              {deleteConfirm?.type === 'room' && (
                <span className="block mt-2 text-gray-600">
                  Phòng sẽ bị xóa vĩnh viễn khỏi hệ thống.
                </span>
              )}
              {deleteConfirm?.type === 'building' && (
                <span className="block mt-2 text-red-600">
                  ⚠️ Tòa nhà sẽ bị xóa vĩnh viễn khỏi hệ thống. Hành động này không thể hoàn tác!
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleteConfirm) return;
                
                if (deleteConfirm.type === 'floor') {
                  if (deleteConfirm.floor !== undefined) {
                    deleteFloor(deleteConfirm.floor, deleteConfirm.buildingId);
                    toast.success(`Đã xóa ${deleteConfirm.name}`);
                  }
                } else if (deleteConfirm.type === 'building') {
                  deleteBuilding(deleteConfirm.id);
                  toast.success(`Đã xóa ${deleteConfirm.name}`);
                } else {
                  deleteRoom(deleteConfirm.id);
                  toast.success(`Đã xóa ${deleteConfirm.name}`);
                }
                setDeleteConfirm(null);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}