'use client'

import { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { Room } from '../types';
import { Layers, Plus, Building2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';

interface AddFloorDialogProps {
  open: boolean;
  onClose: () => void;
  buildingId?: string;
}

export function AddFloorDialog({ open, onClose, buildingId = '' }: AddFloorDialogProps) {
  const { addRoom, rooms, hotel } = useApp();
  const [selectedBuildingId, setSelectedBuildingId] = useState(buildingId || '');
  const [floorNumber, setFloorNumber] = useState<number>(1);
  const [floorName, setFloorName] = useState<string>('');
  const [numberOfRooms, setNumberOfRooms] = useState<number>(10);

  // Set default building when dialog opens
  useEffect(() => {
    if (open && hotel?.buildings && hotel.buildings.length > 0 && !selectedBuildingId) {
      setSelectedBuildingId(buildingId || hotel.buildings[0].id);
    }
  }, [open, hotel?.buildings, buildingId, selectedBuildingId]);

  // Calculate next available floor number for selected building
  useEffect(() => {
    if (open && selectedBuildingId) {
      const buildingFloors = rooms
        .filter(r => (r.buildingId || 'default') === selectedBuildingId)
        .map(r => r.floor);
      const maxFloor = buildingFloors.length > 0 ? Math.max(...buildingFloors) : 0;
      const nextFloor = maxFloor + 1;
      setFloorNumber(nextFloor);
      setFloorName(`Tầng ${nextFloor}`);
      setNumberOfRooms(10);
    }
  }, [open, rooms, selectedBuildingId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedBuildingId) {
      toast.error('Vui lòng chọn tòa nhà');
      return;
    }

    if (!floorNumber || floorNumber < 0) {
      toast.error('Vui lòng nhập số tầng hợp lệ');
      return;
    }

    if (numberOfRooms < 1 || numberOfRooms > 50) {
      toast.error('Số phòng phải từ 1 đến 50');
      return;
    }

    // Check if floor already exists in the selected building
    const floorExists = rooms.some(r => 
      r.floor === floorNumber && 
      (r.buildingId || 'default') === selectedBuildingId
    );
    if (floorExists) {
      toast.error(`Tầng ${floorNumber} đã tồn tại. Vui lòng chọn số tầng khác.`);
      return;
    }

    // Generate rooms for this floor
    const newRooms: Room[] = [];
    for (let i = 1; i <= numberOfRooms; i++) {
      const roomNumber = `${floorNumber}${i.toString().padStart(2, '0')}`; // e.g., 201, 202, 203...
      
      const newRoom: Room = {
        id: `room-${Date.now()}-${i}`,
        number: roomNumber,
        floor: floorNumber,
        buildingId: selectedBuildingId === 'default' ? undefined : selectedBuildingId,
        type: 'Single',
        price: 300000, // Default price
        hourlyRate: 50000, // Default hourly rate
        status: 'vacant-clean',
      };

      newRooms.push(newRoom);
    }

    // Add all rooms to the context at once
    newRooms.forEach(room => addRoom(room));

    toast.success(`✅ Đã tạo tầng ${floorNumber} với ${numberOfRooms} phòng`, {
      description: `Phòng ${newRooms[0].number} - ${newRooms[newRooms.length - 1].number}`
    });

    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="w-6 h-6 text-blue-600" />
            Thêm Tầng Mới
          </DialogTitle>
          <DialogDescription>
            Tạo tầng mới với nhiều phòng trong một thao tác
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Building Selection */}
          {!buildingId && (
            <div className="space-y-2">
              <Label htmlFor="building-select" className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Tòa nhà <span className="text-red-500">*</span>
              </Label>
              <Select value={selectedBuildingId} onValueChange={setSelectedBuildingId}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn tòa nhà..." />
                </SelectTrigger>
                <SelectContent>
                  {hotel?.buildings?.map(building => (
                    <SelectItem key={building.id} value={building.id}>
                      {building.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Floor Number */}
          <div className="space-y-2">
            <Label htmlFor="floorNumber" className="text-base">
              Số Tầng <span className="text-red-500">*</span>
            </Label>
            <Input
              id="floorNumber"
              type="number"
              min="0"
              value={floorNumber}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                setFloorNumber(value);
                setFloorName(`Tầng ${value}`);
              }}
              className="text-lg"
              required
            />
            <p className="text-sm text-gray-500">
              Ví dụ: 1, 2, 3... (Tầng tiếp theo: {Math.max(...rooms.map(r => r.floor), 0) + 1})
            </p>
          </div>

          {/* Floor Name (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="floorName" className="text-base">
              Tên Tầng (Tùy chọn)
            </Label>
            <Input
              id="floorName"
              type="text"
              value={floorName}
              onChange={(e) => setFloorName(e.target.value)}
              placeholder="Tầng 2, Tầng trệt..."
              className="text-lg"
            />
            <p className="text-sm text-gray-500">
              Tên hiển thị cho tầng này (chưa sử dụng trong bản này)
            </p>
          </div>

          {/* Number of Rooms */}
          <div className="space-y-2">
            <Label htmlFor="numberOfRooms" className="text-base">
              Số Phòng Tạo Tự Động <span className="text-red-500">*</span>
            </Label>
            <Input
              id="numberOfRooms"
              type="number"
              min="1"
              max="50"
              value={numberOfRooms}
              onChange={(e) => setNumberOfRooms(parseInt(e.target.value))}
              className="text-lg"
              required
            />
            <p className="text-sm text-gray-500">
              Hệ thống sẽ tạo {numberOfRooms} phòng với số: {floorNumber}01 - {floorNumber}{numberOfRooms.toString().padStart(2, '0')}
            </p>
          </div>

          {/* Preview */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-blue-900 mb-2">🔍 Xem trước:</p>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>Tầng:</strong> {floorNumber} ({floorName})</li>
              <li>• <strong>Số phòng:</strong> {numberOfRooms} phòng</li>
              <li>• <strong>Phòng:</strong> {floorNumber}01, {floorNumber}02, ... {floorNumber}{numberOfRooms.toString().padStart(2, '0')}</li>
              <li>• <strong>Giá mặc định:</strong> 300,000₫/ngày, 50,000₫/giờ</li>
            </ul>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 text-lg py-6"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              className="flex-1 text-lg py-6 bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-5 h-5 mr-2" />
              Tạo Tầng
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
