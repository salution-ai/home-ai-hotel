'use client'

import { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { Room, PaymentMethod, IncidentalCharge, RoomType, RoomStatus } from '../types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Separator } from './ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  User, 
  Phone, 
  Calendar, 
  DollarSign, 
  Clock,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Edit2,
  Save,
  X,
  Layers,
  Building2,
  Bed,
  DoorOpen
} from 'lucide-react';
import { toast } from 'sonner';
import { GuestHousePaymentDialog } from './GuestHousePaymentDialog';
import { useLanguage } from '../contexts/LanguageContext';

interface GuestHouseRoomDialogProps {
  room: Room;
  open: boolean;
  onClose: () => void;
  onDelete?: () => void;
}

export function GuestHouseRoomDialog({ room, open, onClose, onDelete }: GuestHouseRoomDialogProps) {
  const { updateRoom, user, deleteRoom, hotel } = useApp();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'info' | 'checkin'>('info');
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  
  // Room editing state (for empty rooms)
  const [isEditing, setIsEditing] = useState(false);
  const [editedRoomType, setEditedRoomType] = useState<Room['type']>(room.type);
  const [editedPrice, setEditedPrice] = useState(room.price.toString());
  const [editedHourlyRate, setEditedHourlyRate] = useState((room.hourlyRate || 0).toString());
  const [editedStatus, setEditedStatus] = useState<Room['status']>(room.status);
  
  // Check-in form
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [rentalType, setRentalType] = useState<'hourly' | 'daily'>('daily');
  const [hours, setHours] = useState('3');
  const [checkInDate, setCheckInDate] = useState(new Date().toISOString().slice(0, 16));
  const [checkOutDate, setCheckOutDate] = useState('');

  useEffect(() => {
    if (open) {
      if (room.guest) {
        setActiveTab('info');
        // Auto-fill guest info when already checked in
        setGuestName(room.guest.name || '');
        setGuestPhone(room.guest.phone || '');
      } else {
        setActiveTab('info');
        // Reset form for new check-in
        setGuestName('');
        setGuestPhone('');
      }
      
      // Reset editing state and sync with room data
      setIsEditing(false);
      setEditedRoomType(room.type);
      setEditedPrice(room.price.toString());
      setEditedHourlyRate((room.hourlyRate || 0).toString());
      setEditedStatus(room.status);
      
      // Auto-calculate checkout based on rental type
      if (!room.guest) {
        updateCheckOutDate();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, open]);
  
  useEffect(() => {
    if (open && !room.guest) {
      updateCheckOutDate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rentalType, hours, checkInDate]);

  const updateCheckOutDate = () => {
    const checkIn = new Date(checkInDate);
    let checkOut = new Date(checkIn);
    
    if (rentalType === 'hourly') {
      checkOut.setHours(checkOut.getHours() + parseInt(hours || '3'));
    } else {
      checkOut.setDate(checkOut.getDate() + 1);
    }
    
    setCheckOutDate(checkOut.toISOString().slice(0, 16));
  };

  const calculateTotal = () => {
    if (rentalType === 'hourly') {
      return (room.hourlyRate || 0) * parseInt(hours || '0');
    } else {
      const checkIn = new Date(checkInDate);
      const checkOut = new Date(checkOutDate);
      const days = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
      return room.price * Math.max(1, days);
    }
  };

  const getTotalWithIncidentals = () => {
    if (!room.guest) return 0;
    // Simplified: Only room charge, no incidental charges
    return room.guest.totalAmount;
  };

  const handleCheckIn = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!guestName.trim()) {
      toast.error(t('room.errorGuestName'));
      return;
    }
    
    const total = calculateTotal();
    
    // Complete check-in immediately without payment
    const updatedRoom: Room = {
      ...room,
      status: 'occupied',
      guest: {
        name: guestName,
        phone: guestPhone,
        checkInDate: checkInDate,
        checkOutDate: checkOutDate,
        totalAmount: total,
        isHourly: rentalType === 'hourly',
        checkedInBy: user?.name
      }
    };
    
    updateRoom(room.id, {
      status: 'occupied',
      guest: {
        name: guestName,
        phone: guestPhone,
        checkInDate: checkInDate,
        checkOutDate: checkOutDate,
        totalAmount: total,
        isHourly: rentalType === 'hourly',
        checkedInBy: user?.name
      }
    });
    toast.success(rentalType === 'hourly'
      ? `✅ ${t('room.checkinSuccessHourly')} ${room.number} (${hours} ${t('room.hours')})` 
      : `✅ ${t('room.checkinSuccessHourly')} ${room.number} (${t('room.checkinSuccessDaily')})`
    );
    
    // Reset form
    setGuestName('');
    setGuestPhone('');
    onClose();
  };

  const handleStartCheckOut = () => {
    setShowPaymentDialog(true);
  };

  const completeCheckOut = (paymentMethod: PaymentMethod) => {
    if (!room.guest) return;
    
    updateRoom(room.id, {
      status: 'vacant-dirty',
      guest: undefined
    });
    toast.success(`✅ ${t('room.checkoutSuccess')} ${room.number} ${t('action.payment')}`);
    setShowPaymentDialog(false);
    onClose();
  };

  const handleMarkClean = () => {
    updateRoom(room.id, {
      status: 'vacant-clean'
    });
    toast.success(`${t('common.room')} ${room.number} ${t('room.markedClean')}`);
    onClose();
  };

  const handleDeleteRoom = () => {
    if (room.guest) {
      toast.error(t('room.errorDeleteOccupied'));
      return;
    }
    
    if (window.confirm(`${t('room.confirmDelete')} ${room.number}?`)) {
      deleteRoom(room.id);
      toast.success(`${t('room.deleteSuccess')} ${room.number}`);
      onClose();
      if (onDelete) onDelete();
    }
  };

  const handleSaveRoomInfo = () => {
    const price = parseFloat(editedPrice);
    const hourlyRate = parseFloat(editedHourlyRate);

    if (isNaN(price) || price <= 0) {
      toast.error(t('room.errorPriceDaily'));
      return;
    }

    if (isNaN(hourlyRate) || hourlyRate < 0) {
      toast.error(t('room.errorPriceHourly'));
      return;
    }

    updateRoom(room.id, {
      type: editedRoomType,
      price: price,
      hourlyRate: hourlyRate > 0 ? hourlyRate : undefined,
      status: editedStatus,
    });
    setIsEditing(false);
    toast.success(`${t('room.updateSuccess')} ${room.number}`);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    // Reset to original values
    setEditedRoomType(room.type);
    setEditedPrice(room.price.toString());
    setEditedHourlyRate((room.hourlyRate || 0).toString());
    setEditedStatus(room.status);
  };

  const getRoomStatusColor = () => {
    if (room.guest) return 'bg-green-100 border-green-300';
    if (room.status === 'vacant-dirty') return 'bg-yellow-100 border-yellow-300';
    return 'bg-gray-100 border-gray-300';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      <Dialog open={open && !showPaymentDialog} onOpenChange={onClose}>
        <DialogContent className="max-w-md max-h-[95vh] overflow-y-auto p-3 sm:p-4 mx-2 sm:mx-4">
          <DialogHeader className="pb-1 space-y-0">
            <DialogTitle className="text-lg font-bold">Phòng {room.number} - {room.type}</DialogTitle>
            <DialogDescription className="text-[10px]">
              {t('room.manageRoom')}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid w-full grid-cols-2 h-8">
              <TabsTrigger value="info" className="text-xs">
                {t('room.info')}
              </TabsTrigger>
              <TabsTrigger value="checkin" disabled={!!room.guest} className="text-xs">
                {t('room.checkin')}
              </TabsTrigger>
            </TabsList>

            {/* Info Tab */}
            <TabsContent value="info" className="space-y-2 mt-2">
              {room.guest ? (
                <>
                  {/* Guest Info */}
                  <Card className={`${getRoomStatusColor()} p-2 border`}>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="w-3 h-3 text-gray-600" />
                        <div className="flex-1">
                          <p className="text-[10px] text-gray-600">{t('room.guest')}</p>
                          <p className="text-sm font-bold text-gray-800">{room.guest.name}</p>
                        </div>
                      </div>

                      {room.guest.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-3 h-3 text-gray-600" />
                          <div className="flex-1">
                            <p className="text-[10px] text-gray-600">{t('room.phone')}</p>
                            <p className="text-xs font-semibold">{room.guest.phone}</p>
                          </div>
                        </div>
                      )}

                      <Separator className="my-1" />

                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3 text-gray-600" />
                        <div className="flex-1">
                          <p className="text-[10px] text-gray-600">Check-in</p>
                          <p className="text-[11px] font-semibold">{formatDate(room.guest.checkInDate)}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3 text-gray-600" />
                        <div className="flex-1">
                          <p className="text-[10px] text-gray-600">{t('room.checkoutExpected')}</p>
                          <p className="text-[11px] font-semibold">{formatDate(room.guest.checkOutDate)}</p>
                        </div>
                      </div>

                      <Separator className="my-1" />

                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] text-gray-600">{t('room.rentalType')}</p>
                          <Badge variant="outline" className="text-[10px] mt-0.5 h-6 px-2 py-1">
                            {room.guest.isHourly ? t('room.hourly') : t('room.daily')}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-gray-600">{t('room.totalAmount')}</p>
                          <p className="text-base font-bold text-green-600">
                            {formatCurrency(room.guest.totalAmount)}₫
                          </p>
                        </div>
                      </div>

                      {room.guest.checkedInBy && (
                        <p className="text-[10px] text-gray-500 italic">
                          {t('room.checkedInBy')}: {room.guest.checkedInBy}
                        </p>
                      )}
                    </div>
                  </Card>

                  {/* Check-out Button */}
                  <Button 
                    onClick={handleStartCheckOut}
                    className="w-full bg-red-600 hover:bg-red-700 text-xs h-9"
                  >
                    <LogOut className="w-3 h-3 mr-1.5" />
                    {t('room.checkout')}
                  </Button>
                </>
              ) : (
                <>
                  {/* Empty Room Info - Editable */}
                  <Card className={`${getRoomStatusColor()} p-3 border`}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-gray-800">{t('room.roomInfo')}</h3>
                      {!isEditing ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setIsEditing(true)}
                          className="h-6 px-2 text-xs"
                        >
                          <Edit2 className="w-3 h-3 mr-1" />
                          {t('room.edit')}
                        </Button>
                      ) : (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleSaveRoomInfo}
                            className="h-6 px-2 text-xs text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            <Save className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleCancelEdit}
                            className="h-6 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      {/* Room Number - Read Only */}
                      <div className="flex items-center gap-2">
                        <DoorOpen className="w-4 h-4 text-gray-500" />
                        <div className="flex-1">
                          <Label className="text-[10px] text-gray-600">{t('room.roomNumber')}</Label>
                          <p className="text-sm font-bold text-gray-800">{room.number}</p>
                        </div>
                      </div>

                      <Separator />

                      {/* Room Type */}
                      {isEditing ? (
                        <div className="space-y-1">
                          <Label className="text-[10px] text-gray-600 flex items-center gap-1">
                            <Bed className="w-3 h-3" />
                            {t('room.roomType')}
                          </Label>
                          <Select value={editedRoomType} onValueChange={(value) => setEditedRoomType(value as RoomType)}>
                            <SelectTrigger className="text-xs h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Single">Single</SelectItem>
                              <SelectItem value="Double">Double</SelectItem>
                              <SelectItem value="Deluxe">Deluxe</SelectItem>
                              <SelectItem value="Suite">Suite</SelectItem>
                              <SelectItem value="Family">Family</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Bed className="w-4 h-4 text-gray-500" />
                          <div className="flex-1">
                            <Label className="text-[10px] text-gray-600">{t('room.roomType')}</Label>
                            <p className="text-sm font-semibold text-gray-800">{room.type}</p>
                          </div>
                        </div>
                      )}

                      {/* Floor - Read Only */}
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-gray-500" />
                        <div className="flex-1">
                          <Label className="text-[10px] text-gray-600">{t('room.floor')}</Label>
                          <p className="text-sm font-semibold text-gray-800">{t('room.floor')} {room.floor}</p>
                        </div>
                      </div>

                      {/* Building - Read Only */}
                      {hotel?.buildings && (
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-gray-500" />
                          <div className="flex-1">
                            <Label className="text-[10px] text-gray-600">{t('room.building')}</Label>
                            <p className="text-sm font-semibold text-gray-800">
                              {hotel.buildings.find(b => b.id === room.buildingId)?.name || 'N/A'}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Status */}
                      {isEditing ? (
                        <div className="space-y-1">
                          <Label className="text-[10px] text-gray-600">{t('room.status')}</Label>
                          <Select value={editedStatus} onValueChange={(value) => setEditedStatus(value as RoomStatus)}>
                            <SelectTrigger className="text-xs h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="vacant-clean">{t('room.statusVacantClean')}</SelectItem>
                              <SelectItem value="vacant-dirty">{t('room.statusVacantDirty')}</SelectItem>
                              <SelectItem value="out-of-order">{t('room.statusOutOfOrder')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <Label className="text-[10px] text-gray-600">{t('room.status')}</Label>
                            <Badge variant="outline" className="text-[10px] mt-0.5">
                              {room.status === 'vacant-clean' ? t('room.statusVacantClean') : 
                               room.status === 'vacant-dirty' ? t('room.statusVacantDirty') : 
                               room.status === 'out-of-order' ? t('room.statusOutOfOrder') : room.status}
                            </Badge>
                          </div>
                        </div>
                      )}

                      <Separator />

                      {/* Hourly Rate */}
                      {isEditing ? (
                        <div className="space-y-1">
                          <Label className="text-[10px] text-gray-600 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {t('room.hourlyPricePerHour')}
                          </Label>
                          <Input
                            type="number"
                            value={editedHourlyRate}
                            onChange={(e) => setEditedHourlyRate(e.target.value)}
                            className="text-xs h-8"
                            min="0"
                            placeholder="0"
                          />
                        </div>
                      ) : (
                      <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-700 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {t('room.hourlyPrice')}
                          </span>
                        <span className="text-sm font-bold text-blue-600">
                          {formatCurrency(room.hourlyRate || 0)}₫/{t('room.hours').slice(0, -1)}
                        </span>
                      </div>
                      )}

                      {/* Daily Price */}
                      {isEditing ? (
                        <div className="space-y-1">
                          <Label className="text-[10px] text-gray-600 flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            {t('room.dailyPricePerDay')}
                          </Label>
                          <Input
                            type="number"
                            value={editedPrice}
                            onChange={(e) => setEditedPrice(e.target.value)}
                            className="text-xs h-8"
                            min="0"
                            placeholder="0"
                          />
                        </div>
                      ) : (
                      <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-700 flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            {t('room.dailyPrice')}
                          </span>
                        <span className="text-sm font-bold text-green-600">
                          {formatCurrency(room.price)}₫/{t('room.daily').toLowerCase()}
                        </span>
                      </div>
                      )}
                    </div>
                  </Card>

                  {room.status === 'vacant-dirty' && (
                    <Button 
                      onClick={handleMarkClean}
                      className="w-full bg-green-600 hover:bg-green-700 text-xs h-9"
                    >
                      <CheckCircle2 className="w-3 h-3 mr-1.5" />
                      {t('room.markClean')}
                    </Button>
                  )}

                  <div className="flex gap-2">
                    <Button 
                      onClick={() => setActiveTab('checkin')}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-xs h-9"
                    >
                      {t('room.checkinNow')}
                    </Button>
                    
                    <Button 
                      onClick={handleDeleteRoom}
                      variant="outline"
                      className="text-xs h-9 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </>
              )}
            </TabsContent>

            {/* Check-in Tab */}
            <TabsContent value="checkin" className="space-y-2 mt-2">
              <form onSubmit={handleCheckIn} className="space-y-2">
                {/* Rental Type */}
                <Card className="p-2">
                  <Label className="text-xs font-semibold mb-1.5 block">{t('room.rentalTypeLabel')}</Label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <Button
                      type="button"
                      variant={rentalType === 'hourly' ? 'default' : 'outline'}
                      className="h-9 text-xs"
                      onClick={() => setRentalType('hourly')}
                    >
                      <Clock className="w-3 h-3 mr-1" />
                      {t('room.hourly')}
                    </Button>
                    <Button
                      type="button"
                      variant={rentalType === 'daily' ? 'default' : 'outline'}
                      className="h-9 text-xs"
                      onClick={() => setRentalType('daily')}
                    >
                      <Calendar className="w-3 h-3 mr-1" />
                      {t('room.daily')}
                    </Button>
                  </div>
                </Card>

                {/* Guest Info */}
                <Card className="p-2 space-y-2">
                  <div>
                    <Label htmlFor="guestName" className="text-xs font-semibold mb-0.5 block">
                      {t('room.guestName')} *
                    </Label>
                    <Input
                      id="guestName"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder={t('room.guestNamePlaceholder')}
                      className="text-xs h-8"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="guestPhone" className="text-xs font-semibold mb-0.5 block">
                      {t('room.phoneLabel')}
                    </Label>
                    <Input
                      id="guestPhone"
                      type="tel"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      placeholder="0912345678"
                      className="text-xs h-8"
                    />
                  </div>
                </Card>

                {/* Hours/Days Selection */}
                {rentalType === 'hourly' ? (
                  <Card className="p-2">
                    <Label htmlFor="hours" className="text-xs font-semibold mb-0.5 block">
                      {t('room.hoursRental')}
                    </Label>
                    <Select value={hours} onValueChange={setHours}>
                      <SelectTrigger className="text-xs h-8 mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[...Array(24)].map((_, i) => (
                          <SelectItem key={i + 1} value={(i + 1).toString()} className="text-xs">
                            {i + 1} {t('room.hours')} - {formatCurrency((room.hourlyRate || 0) * (i + 1))}₫
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Card>
                ) : (
                  <Card className="p-2 space-y-2">
                    <div>
                      <Label htmlFor="checkInDate" className="text-xs font-semibold mb-0.5 block">
                        {t('room.checkinDate')}
                      </Label>
                      <Input
                        id="checkInDate"
                        type="datetime-local"
                        value={checkInDate}
                        onChange={(e) => setCheckInDate(e.target.value)}
                        className="text-xs h-8"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="checkOutDate" className="text-xs font-semibold mb-0.5 block">
                        {t('room.checkoutDateExpected')}
                      </Label>
                      <Input
                        id="checkOutDate"
                        type="datetime-local"
                        value={checkOutDate}
                        onChange={(e) => setCheckOutDate(e.target.value)}
                        className="text-xs h-8"
                        required
                      />
                    </div>
                  </Card>
                )}

                <div className="bg-blue-50 p-2 rounded">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-700">
                      {rentalType === 'hourly' ? `${hours} ${t('room.hours')}` : t('room.daily')}
                    </span>
                    <span className="text-xs font-semibold">
                      {formatCurrency(calculateTotal())}₫
                    </span>
                  </div>
                  <Separator className="my-1" />
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-800">{t('room.total')}</span>
                    <span className="text-base font-bold text-blue-600">
                      {formatCurrency(calculateTotal())}₫
                    </span>
                  </div>
                </div>

                <div className="flex gap-1.5 pt-1">
                  <Button type="button" variant="outline" onClick={onClose} className="flex-1 text-xs h-9">
                    {t('delete.cancel')}
                  </Button>
                  <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700 text-xs h-9">
                    <CheckCircle2 className="w-3 h-3 mr-1.5" />
                    {t('room.confirmCheckin')}
                  </Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog - For checkout */}
      {room.guest && (
        <GuestHousePaymentDialog
          room={room}
          amount={getTotalWithIncidentals()}
          open={showPaymentDialog}
          onClose={() => setShowPaymentDialog(false)}
          onComplete={completeCheckOut}
        />
      )}
    </>
  );
}