'use client'

import { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { RoomType } from '../types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Home, DoorOpen, DollarSign, Clock, Layers, Bed } from 'lucide-react';
import { toast } from 'sonner';
import { useBusinessModel } from '../hooks/useBusinessModel';
import { MoneyInput } from './MoneyInput';
import { useLanguage } from '../contexts/LanguageContext';
import { useSubscription } from '../hooks/useSubscription';

interface AddRoomDialogProps {
  open: boolean;
  onClose: () => void;
  defaultBuildingId?: string;
  buildingId?: string; // For direct building specification
}

export function AddRoomDialog({ open, onClose, defaultBuildingId, buildingId }: AddRoomDialogProps) {
  const { hotel, addRoom, businessModel, rooms } = useApp();
  const { t } = useLanguage();
  const { maxRooms, loading: subscriptionLoading } = useSubscription({ appSlug: 'guesthouse' });
  const [roomNumber, setRoomNumber] = useState('');
  const [selectedBuildingId, setSelectedBuildingId] = useState(buildingId || defaultBuildingId || '');
  const [selectedFloor, setSelectedFloor] = useState('1');
  const [roomType, setRoomType] = useState<RoomType>('Single');
  const [price, setPrice] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const isGuesthouse = businessModel === 'guesthouse';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check room limit (maxRooms is never null now, defaults to 10 for free plan)
    if (maxRooms !== -1) {
      const currentRoomCount = rooms.length;
      if (currentRoomCount >= maxRooms) {
        toast.error(`Room limit reached. Your plan allows up to ${maxRooms} rooms. Please upgrade to add more rooms.`);
        return;
      }
    }

    if (!roomNumber.trim()) {
      toast.error(t('add.errorRoomNumber'));
      return;
    }

    if (!selectedBuildingId) {
      toast.error(t('add.errorBuilding'));
      return;
    }

    if (!selectedFloor || availableFloors.length === 0 || !availableFloors.includes(parseInt(selectedFloor))) {
      toast.error(t('add.errorFloor'));
      return;
    }

    if (!price || parseFloat(price) <= 0) {
      toast.error(t('add.errorPrice'));
      return;
    }

    if (isGuesthouse && (!hourlyRate || parseFloat(hourlyRate) <= 0)) {
      toast.error(t('add.errorHourlyRate'));
      return;
    }

    const newRoom = {
      id: `room-${Date.now()}`,
      number: roomNumber.trim(),
      floor: parseInt(selectedFloor),
      buildingId: selectedBuildingId,
      type: roomType,
      price: parseFloat(price),
      hourlyRate: isGuesthouse ? parseFloat(hourlyRate) : undefined,
      status: 'vacant-clean' as const,
    };

    try {
      await addRoom(newRoom);
      toast.success(`${t('add.roomAdded')} ${roomNumber} (${t('floor.floor')} ${selectedFloor})`);
      
      // Reset form
      setRoomNumber('');
      setSelectedFloor('1');
      setRoomType('Single');
      setPrice('');
      setHourlyRate('');
      if (!defaultBuildingId && !buildingId) {
        setSelectedBuildingId('');
      }
      onClose();
    } catch (error) {
      // Error already handled in AppContext
    }
  };

  const handleClose = () => {
    setRoomNumber('');
    setSelectedFloor('1');
    setRoomType('Single');
    setPrice('');
    setHourlyRate('');
    if (!defaultBuildingId && !buildingId) {
      setSelectedBuildingId('');
    }
    onClose();
  };

  // Auto-select building if only one exists or if default is provided
  useEffect(() => {
    if (buildingId) {
      setSelectedBuildingId(buildingId);
    } else if (defaultBuildingId) {
      setSelectedBuildingId(defaultBuildingId);
    } else if (hotel?.buildings.length === 1) {
      setSelectedBuildingId(hotel.buildings[0].id);
    }
  }, [buildingId, defaultBuildingId, hotel?.buildings]);

  // Auto-fill room number based on highest existing room number in selected building
  useEffect(() => {
    if (open && selectedBuildingId && selectedFloor && !roomNumber) {
      // Get all rooms in the selected building
      const buildingRooms = rooms.filter(
        room => (room.buildingId || 'default') === (selectedBuildingId === 'default' ? 'default' : selectedBuildingId)
      );

      if (buildingRooms.length > 0) {
        // Extract numeric values from room numbers
        const numericValues = buildingRooms
          .map(room => {
            // Try to extract numeric part from room number (e.g., "210" from "210", "101" from "101")
            const match = room.number.match(/\d+/);
            return match ? parseInt(match[0], 10) : null;
          })
          .filter((val): val is number => val !== null);

        if (numericValues.length > 0) {
          const maxNumber = Math.max(...numericValues);
          const nextNumber = (maxNumber + 1).toString();
          setRoomNumber(nextNumber);
        } else {
          // If no numeric room numbers found, use floor number format
          const floorNum = parseInt(selectedFloor, 10);
          setRoomNumber(`${floorNum}01`);
        }
      } else {
        // If no rooms exist in building, use floor number format: floor + "0" + "1"
        const floorNum = parseInt(selectedFloor, 10);
        setRoomNumber(`${floorNum}01`);
      }
    }
  }, [open, selectedBuildingId, selectedFloor, rooms]);

  // Get available floors for the selected building
  const availableFloors = rooms
    .filter(room => room.buildingId === selectedBuildingId)
    .map(room => room.floor)
    .filter((floor, index, self) => self.indexOf(floor) === index)
    .sort((a, b) => b - a); // Sort descending

  // Auto-select first available floor when building changes
  useEffect(() => {
    if (open && selectedBuildingId && availableFloors.length > 0) {
      // If current selected floor is not in available floors, select the first one
      if (!availableFloors.includes(parseInt(selectedFloor))) {
        setSelectedFloor(availableFloors[0].toString());
      }
    } else if (open && selectedBuildingId && availableFloors.length === 0) {
      // If no floors exist, clear the selection
      setSelectedFloor('');
    }
  }, [open, selectedBuildingId, availableFloors]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <DoorOpen className="w-6 h-6 text-green-600" />
            {isGuesthouse ? t('add.roomTitle') : t('add.roomTitleBoarding')}
          </DialogTitle>
          <DialogDescription>
            {isGuesthouse ? t('add.roomDescription') : t('add.roomDescriptionBoarding')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Building Selection */}
          {!defaultBuildingId && !buildingId && (
            <div className="space-y-2">
              <Label htmlFor="building-select" className="flex items-center gap-2">
                <Home className="w-4 h-4" />
                {isGuesthouse ? t('add.building') : t('add.buildingBoarding')} <span className="text-red-500">*</span>
              </Label>
              <Select value={selectedBuildingId} onValueChange={setSelectedBuildingId}>
                <SelectTrigger>
                  <SelectValue placeholder={isGuesthouse ? t('add.selectBuilding') : t('add.selectBuildingBoarding')} />
                </SelectTrigger>
                <SelectContent>
                  {hotel?.buildings.map(building => (
                    <SelectItem key={building.id} value={building.id}>
                      {building.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Room Number */}
          <div className="space-y-2">
            <Label htmlFor="room-number" className="flex items-center gap-2">
              <DoorOpen className="w-4 h-4" />
              {t('add.roomNumber')} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="room-number"
              placeholder="VD: 101, A1, P1..."
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              className="text-lg"
              autoFocus
            />
            <p className="text-xs text-gray-500">
              {t('add.roomNumberHint')}
            </p>
          </div>

          {/* Floor Selection */}
          <div className="space-y-2">
            <Label htmlFor="floor-select" className="flex items-center gap-2">
              <Layers className="w-4 h-4" />
              {t('add.floor')} <span className="text-red-500">*</span>
            </Label>
            {availableFloors.length > 0 ? (
              <>
                <Select value={selectedFloor} onValueChange={setSelectedFloor}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('add.selectFloor')} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableFloors.map(floor => (
                      <SelectItem key={floor} value={floor.toString()}>
                        {t('add.floorNumber')} {floor}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  {t('add.floorHint')}
                </p>
              </>
            ) : (
              <>
                <Select disabled>
                  <SelectTrigger>
                    <SelectValue placeholder={t('add.noFloors')} />
                  </SelectTrigger>
                </Select>
                <p className="text-xs text-amber-600">
                  ⚠️ {t('add.noFloorsWarning')}
                </p>
              </>
            )}
          </div>

          {/* Room Type */}
          <div className="space-y-2">
            <Label htmlFor="room-type" className="flex items-center gap-2">
              <Bed className="w-4 h-4" />
              {t('add.roomType')} <span className="text-red-500">*</span>
            </Label>
            <Select value={roomType} onValueChange={(value) => setRoomType(value as RoomType)}>
              <SelectTrigger>
                <SelectValue placeholder={t('add.selectRoomType')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Single">Single</SelectItem>
                <SelectItem value="Double">Double</SelectItem>
                <SelectItem value="Deluxe">Deluxe</SelectItem>
                <SelectItem value="Suite">Suite</SelectItem>
                <SelectItem value="Family">Family</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              {t('add.roomTypeHint')}
            </p>
          </div>

          {/* Hourly Rate - Only for Guesthouse */}
          {isGuesthouse && (
            <div className="space-y-2">
              <Label htmlFor="hourly-rate" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {t('add.hourlyPrice')} <span className="text-red-500">*</span>
              </Label>
              <MoneyInput
                id="hourly-rate"
                value={hourlyRate}
                onChange={setHourlyRate}
                placeholder="80000"
                className="text-lg"
                suffix={`/${t('room.hourly').toLowerCase()}`}
                required
              />
              {hourlyRate && parseFloat(hourlyRate) > 0 && (
                <p className="text-xs text-gray-600">
                  ≈ ₫{parseFloat(hourlyRate).toLocaleString()} / giờ
                </p>
              )}
            </div>
          )}

          {/* Daily Price */}
          <div className="space-y-2">
            <Label htmlFor="room-price" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              {isGuesthouse ? t('add.dailyPriceGuesthouse') : t('add.monthlyPriceBoarding')} <span className="text-red-500">*</span>
            </Label>
            <MoneyInput
              id="room-price"
              value={price}
              onChange={setPrice}
              placeholder={isGuesthouse ? "300000" : "2000000"}
              className="text-lg"
              suffix={isGuesthouse ? `/${t('room.daily').toLowerCase()}` : ''}
              required
            />
            {price && parseFloat(price) > 0 && (
              <p className="text-xs text-gray-600">
                ≈ ₫{parseFloat(price).toLocaleString()} / {isGuesthouse ? t('room.daily').toLowerCase() : 'month'}
              </p>
            )}
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              💡 <strong>{t('bank.note')}</strong> {isGuesthouse 
                ? t('add.priceHintGuesthouse')
                : t('add.priceHintBoarding')}
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
            >
              {t('delete.cancel')}
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <DoorOpen className="w-4 h-4 mr-2" />
              {t('add.submitButton')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}