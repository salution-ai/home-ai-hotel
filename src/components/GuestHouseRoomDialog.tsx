'use client'

import { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { Room, PaymentMethod, IncidentalCharge, RoomType, RoomStatus, Payment } from '../types';
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
import { MoneyInput } from './MoneyInput';
import { roomApi } from '../utils/api/guesthouse';

interface GuestHouseRoomDialogProps {
  room: Room;
  open: boolean;
  onClose: () => void;
}

export function GuestHouseRoomDialog({ room, open, onClose }: GuestHouseRoomDialogProps) {
  const { updateRoom, user, hotel, checkIn, checkOut, markRoomCleaned, addPayment, rooms } = useApp();
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
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  // State for editing guest checkout date (when room is occupied)
  const [editedGuestCheckOutDate, setEditedGuestCheckOutDate] = useState('');

  // Handle date picker focus/blur with delay to prevent dialog from closing
  const handleDatePickerFocus = () => {
    setIsDatePickerOpen(true);
  };

  const handleDatePickerBlur = () => {
    // Delay blur to allow click events to be processed first
    setTimeout(() => {
      setIsDatePickerOpen(false);
    }, 200);
  };

  // Helper to convert date string to datetime-local format
  const toDateTimeLocal = (dateStr: string) => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Calculate guest total based on edited checkout date
  const calculateGuestTotal = () => {
    if (!room.guest) return 0;

    const checkIn = new Date(room.guest.checkInDate);
    const checkOut = new Date(editedGuestCheckOutDate || room.guest.checkOutDate);

    if (room.guest.isHourly) {
      const hours = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60));
      return (room.hourlyRate || 0) * Math.max(1, hours);
    } else {
      const days = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
      return room.price * Math.max(1, days);
    }
  };

  // Handle guest checkout date change with validation
  const handleGuestCheckOutDateChange = (value: string) => {
    if (!room.guest) return;

    const checkIn = new Date(room.guest.checkInDate);
    const checkOut = new Date(value);
    const originalCheckOut = new Date(room.guest.checkOutDate);

    if (checkOut <= checkIn) {
      toast.error(t('room.errorCheckOutBeforeCheckIn'));
      return;
    }

    if (checkOut > originalCheckOut) {
      toast.error(t('room.errorCheckOutAfterOriginal'));
      return;
    }

    setEditedGuestCheckOutDate(value);
  };

  useEffect(() => {
    if (open) {
      if (room.guest) {
        setActiveTab('info');
        // Auto-fill guest info when already checked in
        setGuestName(room.guest.name || '');
        setGuestPhone(room.guest.phone || '');
        // Initialize edited checkout date
        setEditedGuestCheckOutDate(toDateTimeLocal(room.guest.checkOutDate));
      } else {
        setActiveTab('info');
        // Reset form for new check-in
        setGuestName('');
        setGuestPhone('');
        setCheckInDate(toDateTimeLocal(new Date().toISOString()));
      }

      // Reset editing state and sync with room data
      setIsEditing(false);
      setEditedRoomType(room.type);
      // Ensure we pass clean numeric strings to MoneyInput (remove any formatting)
      setEditedPrice(Math.round(room.price).toString());
      setEditedHourlyRate(Math.round(room.hourlyRate || 0).toString());
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
      // Add hours using milliseconds for accurate calculation
      const hoursToAdd = parseInt(hours || '3');
      checkOut.setTime(checkOut.getTime() + (hoursToAdd * 60 * 60 * 1000));
    } else {
      checkOut.setDate(checkOut.getDate() + 1);
    }

    // Format as local datetime for datetime-local input
    const year = checkOut.getFullYear();
    const month = String(checkOut.getMonth() + 1).padStart(2, '0');
    const day = String(checkOut.getDate()).padStart(2, '0');
    const hoursStr = String(checkOut.getHours()).padStart(2, '0');
    const minutesStr = String(checkOut.getMinutes()).padStart(2, '0');
    setCheckOutDate(`${year}-${month}-${day}T${hoursStr}:${minutesStr}`);
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
    // Use recalculated total based on edited checkout date
    return calculateGuestTotal();
  };

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!guestName.trim()) {
      toast.error(t('room.errorGuestName'));
      return;
    }

    const total = calculateTotal();

    try {
      await checkIn(room.id, {
        name: guestName.trim(),
        phone: guestPhone.trim() || undefined,
        email: '',
        checkInDate: checkInDate,
        checkOutDate: checkOutDate,
        totalAmount: total,
        isHourly: rentalType === 'hourly',
        checkedInBy: user?.name || user?.email,
      });

      toast.success(rentalType === 'hourly'
        ? `✅ ${t('room.checkinSuccessHourly')} ${room.number} (${hours} ${t('room.hours')})`
        : `✅ ${t('room.checkinSuccessHourly')} ${room.number} (${t('room.checkinSuccessDaily')})`
      );

      // Reset form
      setGuestName('');
      setGuestPhone('');
      onClose();
    } catch (error) {
      // Error already handled in AppContext
    }
  };

  const handleStartCheckOut = () => {
    setShowPaymentDialog(true);
  };

  const completeCheckOut = async (paymentMethod: PaymentMethod) => {
    if (!room.guest) return;

    try {
      // Get the latest room data from state to ensure we have the correct room ID
      // The room prop might be stale, so we look it up from the current rooms state
      const currentRoom = rooms.find(r => r.id === room.id);
      if (!currentRoom || !currentRoom.guest) {
        toast.error('Room not found or guest data is missing');
        return;
      }

      // Use edited checkout date and recalculated total
      const finalCheckOutDate = editedGuestCheckOutDate || currentRoom.guest.checkOutDate;
      const finalTotal = calculateGuestTotal();

      // Update guest info in backend if checkout date or total changed
      const hasCheckOutDateChanged = finalCheckOutDate !== currentRoom.guest.checkOutDate;
      const hasTotalChanged = finalTotal !== currentRoom.guest.totalAmount;

      if (hasCheckOutDateChanged || hasTotalChanged) {
        await roomApi.updateGuest(currentRoom.id, {
          checkOutDate: finalCheckOutDate,
          totalAmount: finalTotal,
        });
      }

      // Create payment record before checking out
      const payment: Payment = {
        id: `payment-${Date.now()}`,
        roomId: currentRoom.id,
        roomNumber: currentRoom.number,
        guestName: currentRoom.guest.name,
        checkInDate: currentRoom.guest.checkInDate,
        checkOutDate: finalCheckOutDate,
        roomCharge: finalTotal,
        isHourly: currentRoom.guest.isHourly ?? false,
        services: currentRoom.guest.services || [],
        incidentalCharges: currentRoom.guest.incidentalCharges || [],
        subtotal: finalTotal,
        vat: 0,
        total: finalTotal,
        paymentMethod: paymentMethod,
        documentType: 'receipt',
        timestamp: new Date().toISOString(),
        processedBy: user?.name || user?.email || 'Unknown',
      };

      // Add payment first (this creates the revenue record)
      // Use the current room ID to ensure it matches the backend
      await addPayment(payment, currentRoom.id);

      // Then check out (which removes the guest)
      await checkOut(currentRoom.id);

      toast.success(`✅ ${t('room.checkoutSuccess')} ${currentRoom.number} ${t('action.payment')}`);
      setShowPaymentDialog(false);
      onClose();
    } catch (error) {
      // Error already handled in AppContext
    }
  };

  const handleMarkClean = async () => {
    try {
      await markRoomCleaned(room.id);
      toast.success(`${t('common.room')} ${room.number} ${t('room.markedClean')}`);
      onClose();
    } catch (error) {
      // Error already handled in AppContext
    }
  };


  const handleSaveRoomInfo = async () => {
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

    try {
      await updateRoom(room.id, {
        type: editedRoomType,
        price: price,
        hourlyRate: hourlyRate > 0 ? hourlyRate : undefined,
        status: editedStatus,
      });
      setIsEditing(false);
      toast.success(`${t('room.updateSuccess')} ${room.number}`);
    } catch (error) {
      // Error already handled in AppContext
    }
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

  const handleDialogOpenChange = (newOpen: boolean) => {
    // Don't close dialog if date picker is open
    if (!newOpen && isDatePickerOpen) {
      return;
    }
    onClose();
  };

  return (
    <>
      <Dialog open={open && !showPaymentDialog} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-w-md max-h-[95vh] overflow-y-auto p-3 sm:p-4 mx-2 sm:mx-4">
          <DialogHeader className="pb-1 space-y-0">
            <DialogTitle className="text-lg font-bold">Phòng {room.number} - {room.type}</DialogTitle>
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
                          <Input
                            type="datetime-local"
                            value={editedGuestCheckOutDate}
                            onChange={(e) => handleGuestCheckOutDateChange(e.target.value)}
                            onFocus={handleDatePickerFocus}
                            onBlur={handleDatePickerBlur}
                            min={toDateTimeLocal(room.guest.checkInDate)}
                            max={toDateTimeLocal(room.guest.checkOutDate)}
                            className="text-[11px] h-7 w-full"
                          />
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
                            {formatCurrency(calculateGuestTotal())}₫
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
                      {!isEditing && room.status !== 'vacant-dirty' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setIsEditing(true)}
                          className="h-6 px-2 text-xs"
                        >
                          <Edit2 className="w-3 h-3 mr-1" />
                          {t('room.edit')}
                        </Button>
                      )}
                      {isEditing && (
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
                              {/* <SelectItem value="out-of-order" disabled>{t('room.statusOutOfOrder')}</SelectItem> */}
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
                          <MoneyInput
                            id="edit-hourly-rate"
                            value={editedHourlyRate}
                            onChange={setEditedHourlyRate}
                            placeholder="0"
                            className="text-xs h-8"
                            suffix={`/${t('room.hours').toLowerCase()}`}
                          />
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-700 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {t('room.hourlyPrice')}
                          </span>
                          <span className="text-sm font-bold text-blue-600">
                            {formatCurrency(room.hourlyRate || 0)}₫/{t('room.hours').toLowerCase()}
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
                          <MoneyInput
                            id="edit-daily-price"
                            value={editedPrice}
                            onChange={setEditedPrice}
                            placeholder="0"
                            className="text-xs h-8"
                            suffix={`/${t('room.dailyRate').toLowerCase()}`}
                          />
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-700 flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            {t('room.dailyPrice')}
                          </span>
                          <span className="text-sm font-bold text-green-600">
                            {formatCurrency(room.price)}₫/{t('room.dailyRate').toLowerCase()}
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

                  {!isEditing && (
                    <Button
                      onClick={() => setActiveTab('checkin')}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-xs h-9"
                    >
                      {t('room.checkinNow')}
                    </Button>
                  )}
                </>
              )}
            </TabsContent>

            {/* Check-in Tab */}
            <TabsContent value="checkin" className="space-y-2 mt-2">
              <form onSubmit={handleCheckIn} className="space-y-2">
                {/* Rental Type */}
                <Card className="p-2">
                  <Label className="text-xs font-semibold mb-0.5 block">{t('room.rentalTypeLabel')}</Label>
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
                <Card className="p-2">
                  <div className="mb-0">
                    <Label htmlFor="guestName" className="text-xs font-semibold mb-0 block">
                      {t('room.guestName')} *
                    </Label>
                    <Input
                      id="guestName"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder={t('room.guestNamePlaceholder')}
                      className="text-xs h-8 mb-0"
                      required
                    />
                  </div>

                  <div className={rentalType === 'hourly' ? "grid grid-cols-2 gap-2 -mt-2" : "-mt-2"}>
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

                    {rentalType === 'hourly' && (
                      <div>
                        <Label htmlFor="hours" className="text-xs font-semibold mb-0.5 block">
                          {t('room.hoursRental')}
                        </Label>
                        <Input
                          id="hours"
                          type="number"
                          value={hours}
                          onChange={(e) => setHours(e.target.value)}
                          placeholder="3"
                          className="text-xs h-8"
                          min="1"
                          required
                        />
                      </div>
                    )}
                  </div>
                </Card>

                {/* Hours/Days Selection */}
                {rentalType === 'hourly' ? (
                  <Card className="p-2 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="checkInDateHourly" className="text-xs font-semibold mb-0.5 block">
                          {t('room.checkinDate')}
                        </Label>
                        <Input
                          id="checkInDateHourly"
                          type="datetime-local"
                          value={checkInDate}
                          onChange={(e) => setCheckInDate(e.target.value)}
                          onFocus={handleDatePickerFocus}
                          onBlur={handleDatePickerBlur}
                          className="text-xs h-8"
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="checkOutDateHourly" className="text-xs font-semibold mb-0.5 block">
                          {t('room.checkoutDateExpected')}
                        </Label>
                        <Input
                          id="checkOutDateHourly"
                          type="datetime-local"
                          value={checkOutDate}
                          className="text-xs h-8 bg-gray-50"
                          readOnly
                          disabled
                        />
                      </div>
                    </div>
                  </Card>
                ) : (
                  <Card className="p-2 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="checkInDate" className="text-xs font-semibold mb-0.5 block">
                          {t('room.checkinDate')}
                        </Label>
                        <Input
                          id="checkInDate"
                          type="datetime-local"
                          value={checkInDate}
                          onChange={(e) => setCheckInDate(e.target.value)}
                          onFocus={handleDatePickerFocus}
                          onBlur={handleDatePickerBlur}
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
                          onFocus={handleDatePickerFocus}
                          onBlur={handleDatePickerBlur}
                          className="text-xs h-8"
                          required
                        />
                      </div>
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
          checkOutDate={editedGuestCheckOutDate || room.guest.checkOutDate}
          open={showPaymentDialog}
          onClose={() => setShowPaymentDialog(false)}
          onComplete={completeCheckOut}
        />
      )}
    </>
  );
}