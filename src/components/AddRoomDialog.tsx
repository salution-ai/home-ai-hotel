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

interface AddRoomDialogProps {
  open: boolean;
  onClose: () => void;
  defaultBuildingId?: string;
  buildingId?: string; // For direct building specification
}

export function AddRoomDialog({ open, onClose, defaultBuildingId, buildingId }: AddRoomDialogProps) {
  const { hotel, addRoom, businessModel, rooms } = useApp();
  const [roomNumber, setRoomNumber] = useState('');
  const [selectedBuildingId, setSelectedBuildingId] = useState(buildingId || defaultBuildingId || '');
  const [selectedFloor, setSelectedFloor] = useState('1');
  const [roomType, setRoomType] = useState<RoomType>('Single');
  const [price, setPrice] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const isGuesthouse = businessModel === 'guesthouse';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!roomNumber.trim()) {
      toast.error('Vui lòng nhập số phòng');
      return;
    }

    if (!selectedBuildingId) {
      toast.error('Vui lòng chọn khu trọ');
      return;
    }

    if (!selectedFloor || availableFloors.length === 0 || !availableFloors.includes(parseInt(selectedFloor))) {
      toast.error('Vui lòng chọn tầng hợp lệ. Nếu chưa có tầng, vui lòng tạo tầng mới trước.');
      return;
    }

    if (!price || parseFloat(price) <= 0) {
      toast.error('Vui lòng nhập giá phòng hợp lệ');
      return;
    }

    if (isGuesthouse && (!hourlyRate || parseFloat(hourlyRate) <= 0)) {
      toast.error('Vui lòng nhập giá theo giờ hợp lệ');
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

    addRoom(newRoom);
    toast.success(`Đã thêm phòng ${roomNumber} (Tầng ${selectedFloor})`);
    
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
            {isGuesthouse ? 'Thêm Phòng Mới' : 'Thêm Phòng Trọ Mới'}
          </DialogTitle>
          <DialogDescription>
            Tạo phòng mới để {isGuesthouse ? 'phục vụ khách' : 'cho thuê'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Building Selection */}
          {!defaultBuildingId && !buildingId && (
            <div className="space-y-2">
              <Label htmlFor="building-select" className="flex items-center gap-2">
                <Home className="w-4 h-4" />
                {isGuesthouse ? 'Tòa nhà' : 'Khu Trọ'} <span className="text-red-500">*</span>
              </Label>
              <Select value={selectedBuildingId} onValueChange={setSelectedBuildingId}>
                <SelectTrigger>
                  <SelectValue placeholder={isGuesthouse ? "Chọn tòa nhà..." : "Chọn khu trọ..."} />
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
              Số Phòng <span className="text-red-500">*</span>
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
              Số phòng duy nhất, dễ nhớ
            </p>
          </div>

          {/* Floor Selection */}
          <div className="space-y-2">
            <Label htmlFor="floor-select" className="flex items-center gap-2">
              <Layers className="w-4 h-4" />
              Tầng <span className="text-red-500">*</span>
            </Label>
            {availableFloors.length > 0 ? (
              <>
                <Select value={selectedFloor} onValueChange={setSelectedFloor}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn tầng..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableFloors.map(floor => (
                      <SelectItem key={floor} value={floor.toString()}>
                        Tầng {floor}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Chọn tầng hiện có. Để tạo tầng mới, sử dụng chức năng "Thêm Tầng"
                </p>
              </>
            ) : (
              <>
                <Select disabled>
                  <SelectTrigger>
                    <SelectValue placeholder="Chưa có tầng nào" />
                  </SelectTrigger>
                </Select>
                <p className="text-xs text-amber-600">
                  ⚠️ Chưa có tầng nào trong tòa nhà này. Vui lòng tạo tầng mới trước.
                </p>
              </>
            )}
          </div>

          {/* Room Type */}
          <div className="space-y-2">
            <Label htmlFor="room-type" className="flex items-center gap-2">
              <Bed className="w-4 h-4" />
              Loại Phòng <span className="text-red-500">*</span>
            </Label>
            <Select value={roomType} onValueChange={(value) => setRoomType(value as RoomType)}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn loại phòng..." />
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
              Chọn loại phòng phù hợp
            </p>
          </div>

          {/* Hourly Rate - Only for Guesthouse */}
          {isGuesthouse && (
            <div className="space-y-2">
              <Label htmlFor="hourly-rate" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Giá Theo Giờ <span className="text-red-500">*</span>
              </Label>
              <MoneyInput
                id="hourly-rate"
                value={hourlyRate}
                onChange={setHourlyRate}
                placeholder="80000"
                className="text-lg"
                suffix="/giờ"
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
              {isGuesthouse ? 'Giá Theo Ngày' : 'Giá Thuê / Tháng'} <span className="text-red-500">*</span>
            </Label>
            <MoneyInput
              id="room-price"
              value={price}
              onChange={setPrice}
              placeholder={isGuesthouse ? "300000" : "2000000"}
              className="text-lg"
              suffix={isGuesthouse ? '/ngày' : ''}
              required
            />
            {price && parseFloat(price) > 0 && (
              <p className="text-xs text-gray-600">
                ≈ ₫{parseFloat(price).toLocaleString()} / {isGuesthouse ? 'ngày' : 'tháng'}
              </p>
            )}
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              💡 <strong>Lưu ý:</strong> {isGuesthouse 
                ? 'Giá theo giờ và theo ngày sẽ được sử dụng khi check-in khách.' 
                : 'Sau khi tạo phòng, bạn có thể thêm người thuê và cài đặt giá điện/nước bằng cách click vào phòng.'}
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
              Hủy
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <DoorOpen className="w-4 h-4 mr-2" />
              Tạo Phòng
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}