'use client'

import { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { Room } from '../types';
import { Menu, Clock, DollarSign, Plus, DoorOpen, Trash2, Layers, Building2, ChevronDown, ChevronUp, HelpCircle, X, Globe, Edit2 } from 'lucide-react';
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
import { useLanguage } from '../contexts/LanguageContext';
import { languages } from '../locales';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';

export function GuestHouseLiveGrid() {
  const { user, hotel, rooms, deleteRoom, deleteFloor, deleteBuilding, updateBuilding } = useApp();
  const { language, setLanguage, t } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [addRoomOpen, setAddRoomOpen] = useState(false);
  const [addFloorOpen, setAddFloorOpen] = useState(false);
  const [addBuildingOpen, setAddBuildingOpen] = useState(false);
  const [fabMenuOpen, setFabMenuOpen] = useState(false);
  const [revenueDialogOpen, setRevenueDialogOpen] = useState(false);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'room' | 'floor' | 'building', id: string, name: string, buildingId?: string, floor?: number } | null>(null);
  const [renameBuilding, setRenameBuilding] = useState<{ id: string, name: string } | null>(null);
  const [newBuildingName, setNewBuildingName] = useState('');
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
        text: room.guest.isHourly ? t('room.hourly') : t('room.daily'), 
        color: room.guest.isHourly ? 'text-blue-600' : 'text-green-600' 
      };
    }
    if (room.status === 'vacant-dirty') {
      return { text: t('room.clean'), color: 'text-yellow-600' };
    }
    return { text: t('room.vacant'), color: 'text-gray-600' };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleLongPressStart = (room: Room) => {
    const timer = setTimeout(() => {
      if (room.guest) {
        toast.error(t('error.cannotDeleteOccupiedRoom'));
      } else {
        setDeleteConfirm({ 
          type: 'room',
          id: room.id, 
          name: `${t('common.room')} ${room.number}` 
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

  const handleRenameBuilding = async (buildingId: string, newName: string) => {
    if (!newName.trim()) {
      toast.error(t('building.nameRequired') || 'Building name is required');
      return;
    }

    try {
      await updateBuilding(buildingId, { name: newName.trim() });
      toast.success(t('building.renameSuccess') || `Building renamed to "${newName.trim()}"`);
      setRenameBuilding(null);
      setNewBuildingName('');
    } catch (error) {
      // Error already handled in AppContext
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
      <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-blue-500 to-purple-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
          {/* Top Row */}
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMenuOpen(true)}
                className="text-white hover:bg-white/20 flex-shrink-0"
              >
                <Menu className="w-6 h-6 sm:w-8 sm:h-8" />
              </Button>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-base font-semibold text-white/90 truncate">{t('dashboard.manage')}</p>
                <p className="text-lg sm:text-2xl text-white font-bold truncate">{user?.name}</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="text-white hover:bg-white/20 !w-[44px] !h-[44px] sm:!w-[54px] sm:!h-[54px] p-0"
                    title={t('header.language')}
                  >
                    <Globe className="!w-[32px] !h-[32px] sm:!w-[40px] sm:!h-[40px]" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {Object.values(languages).map((lang) => (
                    <DropdownMenuItem
                      key={lang.code}
                      onClick={() => setLanguage(lang.code)}
                      className={language === lang.code ? 'bg-accent' : ''}
                    >
                      <span className="mr-2">{lang.flag}</span>
                      {lang.name}
                      {language === lang.code && <span className="ml-auto">✓</span>}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="ghost"
                onClick={() => setHelpDialogOpen(true)}
                className="text-white hover:bg-white/20 !w-[44px] !h-[44px] sm:!w-[54px] sm:!h-[54px] p-0"
                title={t('dashboard.helpTitle')}
              >
                <HelpCircle className="!w-[32px] !h-[32px] sm:!w-[40px] sm:!h-[40px]" />
              </Button>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <Card 
              className={`bg-white/95 backdrop-blur border-0 p-2.5 sm:p-4 cursor-pointer hover:shadow-xl transition-all active:scale-95 ${roomFilter === 'all' ? 'ring-2 ring-blue-500' : ''}`}
              onClick={() => setRoomFilter('all')}
            >
              <div className="flex items-center justify-between h-full">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-lg text-gray-600 truncate">{t('dashboard.totalRooms')}</p>
                  <p className="text-2xl sm:text-4xl font-bold text-blue-600">{totalRooms}</p>
                  <div className="min-h-[1.25rem] sm:min-h-[1.5rem]">
                    {roomFilter === 'all' && <p className="text-[10px] sm:text-xs text-blue-600 mt-0.5 sm:mt-1 truncate">✓ {t('dashboard.showingAll')}</p>}
                  </div>
                </div>
                <DoorOpen className="w-8 h-8 sm:w-12 sm:h-12 text-blue-400 flex-shrink-0 ml-1" />
              </div>
            </Card>

            <Card 
              className={`bg-white/95 backdrop-blur border-0 p-2.5 sm:p-4 cursor-pointer hover:shadow-xl transition-all active:scale-95 ${roomFilter === 'occupied' ? 'ring-2 ring-green-500' : ''}`}
              onClick={() => setRoomFilter('occupied')}
            >
              <div className="flex items-center justify-between h-full">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-lg text-gray-600 truncate">{t('dashboard.occupied')}</p>
                  <p className="text-2xl sm:text-4xl font-bold text-green-600">{occupiedRooms}</p>
                  <div className="min-h-[1.25rem] sm:min-h-[1.5rem]">
                    {roomFilter === 'occupied' ? (
                      <p className="text-[10px] sm:text-xs text-green-600 mt-0.5 sm:mt-1 truncate">✓ {t('dashboard.filteringOccupied')}</p>
                    ) : (
                      <p className="text-[10px] sm:text-sm text-gray-500 truncate">{t('dashboard.hours')}: {hourlyRooms} | {t('dashboard.days')}: {dailyRooms}</p>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            <Card 
              className={`bg-white/95 backdrop-blur border-0 p-2.5 sm:p-4 cursor-pointer hover:shadow-xl transition-all active:scale-95 ${roomFilter === 'vacant' ? 'ring-2 ring-gray-500' : ''}`}
              onClick={() => setRoomFilter('vacant')}
            >
              <div className="flex items-center justify-between h-full">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-lg text-gray-600 truncate">{t('dashboard.vacant')}</p>
                  <p className="text-2xl sm:text-4xl font-bold text-gray-600">{vacantRooms}</p>
                  <div className="min-h-[1.25rem] sm:min-h-[1.5rem]">
                    {roomFilter === 'vacant' && <p className="text-[10px] sm:text-xs text-gray-600 mt-0.5 sm:mt-1 truncate">✓ {t('dashboard.filteringVacant')}</p>}
                  </div>
                </div>
              </div>
            </Card>

            <Card 
              className="bg-white/95 backdrop-blur border-0 p-2.5 sm:p-4 cursor-pointer hover:shadow-lg transition-shadow active:scale-95"
              onClick={() => setRevenueDialogOpen(true)}
            >
              <div className="flex items-center justify-between h-full">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-lg text-gray-600 truncate">{t('revenue.title')}</p>
                  <div className="min-h-[1.25rem] sm:min-h-[1.5rem]">
                    <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1 truncate">👆 {t('dashboard.clickToViewDetails')}</p>
                  </div>
                </div>
                <DollarSign className="w-8 h-8 sm:w-12 sm:h-12 text-green-400 flex-shrink-0 ml-1" />
              </div>
            </Card>
          </div>

          {/* Legend */}
          <div className="mt-3 sm:mt-4 bg-white/95 backdrop-blur rounded-lg p-2.5 sm:p-4 border-0 shadow-lg">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="w-4 h-4 sm:w-6 sm:h-6 bg-blue-500 border-2 border-blue-700 rounded flex-shrink-0"></div>
                <span className="text-[10px] sm:text-sm text-gray-700 truncate">{t('legend.hourlyRent')}</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="w-4 h-4 sm:w-6 sm:h-6 bg-green-500 border-2 border-green-700 rounded flex-shrink-0"></div>
                <span className="text-[10px] sm:text-sm text-gray-700 truncate">{t('legend.dailyRent')}</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="w-4 h-4 sm:w-6 sm:h-6 bg-yellow-400 border-2 border-yellow-600 rounded flex-shrink-0"></div>
                <span className="text-[10px] sm:text-sm text-gray-700 truncate">{t('legend.needsCleaning')}</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="w-4 h-4 sm:w-6 sm:h-6 bg-gray-300 border-2 border-gray-500 rounded flex-shrink-0"></div>
                <span className="text-[10px] sm:text-sm text-gray-700 truncate">{t('legend.vacantRoom')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Room Grid */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 pt-96 sm:pt-80 md:pt-96 lg:pt-[22rem]">
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
                  name: buildingId === 'default' ? t('building.default') : 
                        buildingId === 'building-1' ? t('building.main') : 
                        buildingId === 'building-2' ? `${t('building.building')} B` : 
                        buildingId.replace('building-', `${t('building.building')} `),
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
                    className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-2.5 sm:p-3 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div 
                        className="flex items-center gap-2 sm:gap-3 cursor-pointer flex-1 min-w-0"
                        onClick={() => toggleBuilding(building.id)}
                      >
                        <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-white flex-shrink-0" />
                        <h2 className="text-white font-medium text-sm sm:text-base truncate">{building.name}</h2>
                        {/* Rename Building Button */}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenameBuilding({ id: building.id, name: building.name });
                            setNewBuildingName(building.name);
                          }}
                          className="text-white hover:text-blue-200 hover:bg-white/20 h-6 w-6 sm:h-7 sm:w-7 p-0 ml-1"
                          title={t('building.renameTitle') || 'Rename building'}
                        >
                          <Edit2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
                        <Badge variant="secondary" className="bg-white/20 text-white border-white/30 text-xs px-1.5 sm:px-2 py-0.5 sm:py-1">
                          {totalBuildingRooms} {t('building.rooms')}
                        </Badge>
                        
                        {/* Delete Building Button */}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            const hasRooms = rooms.some(r => r.buildingId === building.id);
                            if (hasRooms) {
                              toast.error(t('error.cannotDeleteBuildingWithRooms'));
                              return;
                            }
                            setDeleteConfirm({ 
                              type: 'building', 
                              id: building.id,
                              name: building.name,
                              buildingId: building.id
                            });
                          }}
                          className="text-white hover:text-red-200 hover:bg-white/20 h-7 w-7 sm:h-8 sm:w-8 p-0"
                          title={t('building.deleteTitle')}
                        >
                          <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </Button>
                        
                        <div 
                          className="cursor-pointer"
                          onClick={() => toggleBuilding(building.id)}
                        >
                          {isCollapsed ? (
                            <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                          ) : (
                            <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
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
                          <div key={floor} className="bg-gray-50 rounded-lg p-2.5 sm:p-4 border border-gray-200">
                            {/* Floor Header */}
                            <div 
                              className="mb-2 sm:mb-3 flex flex-wrap items-center justify-between gap-1.5 sm:gap-2"
                            >
                              <div 
                                className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0 cursor-pointer"
                                onClick={() => toggleFloor(floorKey)}
                              >
                                <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-600 flex-shrink-0" />
                                <h3 className="text-gray-900 font-medium text-sm sm:text-base truncate">{t('floor.floor')} {floor}</h3>
                                <Badge variant="outline" className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 flex-shrink-0">
                                  {floorRooms.length} {t('building.rooms')}
                                </Badge>
                              </div>
                              
                              <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                                {occupiedCount > 0 && (
                                  <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5">
                                    {occupiedCount} {t('floor.occupiedCount')}
                                  </Badge>
                                )}
                                {vacantCount > 0 && (
                                  <Badge className="bg-gray-100 text-gray-700 border-gray-200 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5">
                                    {vacantCount} {t('floor.vacantCount')}
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
                                      toast.error(t('error.cannotDeleteFloorWithGuests'));
                                      return;
                                    }
                                    setDeleteConfirm({ 
                                      type: 'floor', 
                                      id: floorKey,
                                      name: `${t('floor.floor')} ${floor}`,
                                      buildingId: building.id,
                                      floor: floor
                                    });
                                  }}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 w-7 sm:h-8 sm:w-8 p-0"
                                  title={t('floor.deleteTitle')}
                                >
                                  <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                </Button>
                                
                                <div 
                                  className="cursor-pointer p-0.5 sm:p-1"
                                  onClick={() => toggleFloor(floorKey)}
                                >
                                  {isFloorCollapsed ? (
                                    <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-600" />
                                  ) : (
                                    <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-600" />
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {/* Room Cards Grid */}
                            {!isFloorCollapsed && (
                              <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2 sm:gap-3">
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
                                      className={`${getRoomStatusColor(room)} p-2 sm:p-4 cursor-pointer transition-all border-2 hover:shadow-xl active:scale-95 relative`}
                                    >
                                      {/* Delete Room Button */}
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (room.guest) {
                                            toast.error(t('error.cannotDeleteOccupiedRoom'));
                                            return;
                                          }
                                          setDeleteConfirm({ 
                                            type: 'room', 
                                            id: room.id, 
                                            name: `${t('common.room')} ${room.number}` 
                                          });
                                        }}
                                        className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 h-5 w-5 sm:h-6 sm:w-6 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50 z-10"
                                        title={t('room.deleteTitle')}
                                      >
                                        <X className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                      </Button>
                                      <div className="text-center space-y-1 sm:space-y-2">
                                        <div>
                                          <p className="text-base sm:text-2xl font-bold text-white">{room.number}</p>
                                          <p className="text-xs sm:text-sm text-white/90 truncate">{room.type}</p>
                                        </div>
                                        <Badge variant="outline" className={`${statusInfo.color} bg-white font-bold text-xs sm:text-base px-2 sm:px-3 py-0.5 sm:py-1`}>
                                          {statusInfo.text}
                                        </Badge>
                                        
                                        {room.guest && (
                                          <div className="text-xs sm:text-sm">
                                            <p className="font-semibold text-white truncate">{room.guest.name}</p>
                                            <p className="text-[10px] sm:text-xs text-white/90">
                                              {t('room.checkout')}: {formatDate(room.guest.checkOutDate)}
                                            </p>
                                          </div>
                                        )}
                                        
                                        {!room.guest && (
                                          <div className="text-[10px] sm:text-sm space-y-0.5 sm:space-y-1">
                                            <p className="text-[10px] sm:text-xs text-gray-800 truncate">
                                              {t('room.hourlyRate')}: {formatCurrency(room.hourlyRate || 0)}₫
                                            </p>
                                            <p className="text-[10px] sm:text-xs text-gray-800 truncate">
                                              {t('room.dailyRate')}: {formatCurrency(room.price)}₫
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
                          <p className="text-gray-500 font-medium">{t('empty.noRooms')}</p>
                          <p className="text-sm text-gray-400 mt-1">{t('empty.addFloorAndRooms')}</p>
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
                <div key={floor} className="bg-gray-50 rounded-lg p-2.5 sm:p-4 border border-gray-200">
                  {/* Floor Header */}
                  <div 
                    className="mb-2 sm:mb-3 flex flex-wrap items-center justify-between gap-1.5 sm:gap-2"
                  >
                    <div 
                      className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0 cursor-pointer"
                      onClick={() => toggleFloor(floorKey)}
                    >
                      <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-600 flex-shrink-0" />
                      <h3 className="text-gray-900 font-medium text-sm sm:text-base truncate">{t('floor.floor')} {floor}</h3>
                      <Badge variant="outline" className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 flex-shrink-0">
                        {floorRooms.length} {t('building.rooms')}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                      {occupiedCount > 0 && (
                        <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5">
                          {occupiedCount} {t('floor.occupiedCount')}
                        </Badge>
                      )}
                      {vacantCount > 0 && (
                        <Badge className="bg-gray-100 text-gray-700 border-gray-200 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5">
                          {vacantCount} {t('floor.vacantCount')}
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
                            toast.error(t('error.cannotDeleteFloorWithGuests'));
                            return;
                          }
                          setDeleteConfirm({ 
                            type: 'floor', 
                            id: floorKey,
                            name: `${t('floor.floor')} ${floor}`,
                            buildingId: undefined,
                            floor: floor
                          });
                        }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 w-7 sm:h-8 sm:w-8 p-0"
                        title={t('floor.deleteTitle')}
                      >
                        <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </Button>
                      
                      <div 
                        className="cursor-pointer p-0.5 sm:p-1"
                        onClick={() => toggleFloor(floorKey)}
                      >
                        {isFloorCollapsed ? (
                          <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-600" />
                        ) : (
                          <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-600" />
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Room Cards Grid */}
                  {!isFloorCollapsed && (
                    <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2 sm:gap-3">
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
                            className={`${getRoomStatusColor(room)} p-2 sm:p-4 cursor-pointer transition-all border-2 hover:shadow-xl active:scale-95 relative`}
                          >
                            {/* Delete Room Button */}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (room.guest) {
                                  toast.error(t('error.cannotDeleteOccupiedRoom'));
                                  return;
                                }
                                setDeleteConfirm({ 
                                  type: 'room', 
                                  id: room.id, 
                                  name: `${t('common.room')} ${room.number}` 
                                });
                              }}
                              className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 h-5 w-5 sm:h-6 sm:w-6 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50 z-10"
                              title={t('room.deleteTitle')}
                            >
                              <X className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                            </Button>
                            <div className="text-center space-y-1 sm:space-y-2">
                              <div>
                                <p className="text-base sm:text-2xl font-bold text-white">{room.number}</p>
                                <p className="text-xs sm:text-sm text-white/90 truncate">{room.type}</p>
                              </div>
                              <Badge variant="outline" className={`${statusInfo.color} bg-white font-bold text-xs sm:text-base px-2 sm:px-3 py-0.5 sm:py-1`}>
                                {statusInfo.text}
                              </Badge>
                              
                              {room.guest && (
                                <div className="text-xs sm:text-sm">
                                  <p className="font-semibold text-white truncate">{room.guest.name}</p>
                                  <p className="text-[10px] sm:text-xs text-white/90">
                                    {t('room.checkout')}: {formatDate(room.guest.checkOutDate)}
                                  </p>
                                </div>
                              )}
                              
                              {!room.guest && (
                                <div className="text-[10px] sm:text-sm space-y-0.5 sm:space-y-1">
                                  <p className="text-[10px] sm:text-xs text-gray-800 truncate">
                                    Giờ: {formatCurrency(room.hourlyRate || 0)}₫
                                  </p>
                                  <p className="text-[10px] sm:text-xs text-gray-800 truncate">
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
          <p className="text-center text-xs sm:text-sm text-gray-500 mt-3 sm:mt-4 px-2">
            💡 {t('hint.deleteHint')}
          </p>
        )}
      </div>

      {/* FAB - Floating Action Button */}
      <div 
        ref={fabMenuRef}
        className="fixed bottom-3 sm:bottom-4 left-3 sm:left-4 z-40"
      >
        {/* FAB Menu */}
        {fabMenuOpen && (
          <div className="mb-2 sm:mb-3 bg-white rounded-lg shadow-2xl border-2 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
            <button
              onClick={() => {
                setAddBuildingOpen(true);
                setFabMenuOpen(false);
              }}
              className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 hover:bg-purple-50 transition-colors w-full text-left border-b"
            >
              <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 flex-shrink-0" />
              <span className="font-medium text-gray-900 text-sm sm:text-base">{t('fab.addBuilding')}</span>
            </button>
            <button
              onClick={() => {
                setAddFloorOpen(true);
                setFabMenuOpen(false);
              }}
              className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 hover:bg-blue-50 transition-colors w-full text-left border-b"
            >
              <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
              <span className="font-medium text-gray-900 text-sm sm:text-base">{t('fab.addFloor')}</span>
            </button>
            <button
              onClick={() => {
                setAddRoomOpen(true);
                setFabMenuOpen(false);
              }}
              className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 hover:bg-green-50 transition-colors w-full text-left"
            >
              <DoorOpen className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
              <span className="font-medium text-gray-900 text-sm sm:text-base">{t('fab.addRoom')}</span>
            </button>
          </div>
        )}
        
        {/* FAB Button */}
        <Button
          size="lg"
          onClick={() => setFabMenuOpen(!fabMenuOpen)}
          className="w-14 h-14 sm:w-16 sm:h-16 rounded-full shadow-2xl bg-blue-600 hover:bg-blue-700 border-4 border-blue-700 hover:scale-110 transition-transform"
          title={t('fab.addFloorOrRoom')}
        >
          <Plus className={`w-7 h-7 sm:w-8 sm:h-8 transition-transform ${fabMenuOpen ? 'rotate-45' : ''}`} />
        </Button>
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

      {/* Rename Building Dialog */}
      <Dialog open={!!renameBuilding} onOpenChange={() => {
        setRenameBuilding(null);
        setNewBuildingName('');
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-blue-600" />
              {t('building.renameTitle') || 'Rename Building'}
            </DialogTitle>
            <DialogDescription>
              {t('building.renameDescription') || 'Enter a new name for this building'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="building-rename">{t('building.name') || 'Building Name'}</Label>
              <Input
                id="building-rename"
                value={newBuildingName}
                onChange={(e) => setNewBuildingName(e.target.value)}
                placeholder={t('building.namePlaceholder') || 'Enter building name'}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (renameBuilding && newBuildingName.trim()) {
                      handleRenameBuilding(renameBuilding.id, newBuildingName.trim());
                    }
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRenameBuilding(null);
                setNewBuildingName('');
              }}
            >
              {t('delete.cancel') || 'Cancel'}
            </Button>
            <Button
              onClick={() => {
                if (renameBuilding && newBuildingName.trim()) {
                  handleRenameBuilding(renameBuilding.id, newBuildingName.trim());
                }
              }}
              disabled={!newBuildingName.trim()}
            >
              {t('building.rename') || 'Rename'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-6 h-6 text-red-600" />
              {t('delete.confirm')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('delete.confirmMessage')} <strong>{deleteConfirm?.name}</strong>?
              {deleteConfirm?.type === 'floor' && (
                <span className="block mt-2 text-red-600">
                  ⚠️ {t('delete.floorWarning')}
                </span>
              )}
              {deleteConfirm?.type === 'room' && (
                <span className="block mt-2 text-gray-600">
                  {t('delete.roomMessage')}
                </span>
              )}
              {deleteConfirm?.type === 'building' && (
                <span className="block mt-2 text-red-600">
                  ⚠️ {t('delete.buildingWarning')}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('delete.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleteConfirm) return;
                
                try {
                  if (deleteConfirm.type === 'floor') {
                    if (deleteConfirm.floor !== undefined) {
                      await deleteFloor(deleteConfirm.floor, deleteConfirm.buildingId);
                      toast.success(`${t('delete.success')} ${deleteConfirm.name}`);
                    }
                  } else if (deleteConfirm.type === 'building') {
                    await deleteBuilding(deleteConfirm.id);
                    toast.success(`${t('delete.success')} ${deleteConfirm.name}`);
                  } else {
                    await deleteRoom(deleteConfirm.id);
                    toast.success(`${t('delete.success')} ${deleteConfirm.name}`);
                  }
                  setDeleteConfirm(null);
                } catch (error) {
                  // Error already handled in AppContext
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              {t('delete.confirmButton')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}