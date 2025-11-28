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
import { useLanguage } from '../contexts/LanguageContext';
import { useSubscription } from '../hooks/useSubscription';

interface AddFloorDialogProps {
  open: boolean;
  onClose: () => void;
  buildingId?: string;
}

export function AddFloorDialog({ open, onClose, buildingId = '' }: AddFloorDialogProps) {
  const { addRoom, rooms, hotel } = useApp();
  const { t } = useLanguage();
  const { maxRooms } = useSubscription({ appSlug: 'guesthouse' });
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
      setFloorName(`${t('add.floorNumber')} ${nextFloor}`);
      setNumberOfRooms(10);
    }
  }, [open, rooms, selectedBuildingId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedBuildingId) {
      toast.error(t('add.errorSelectBuilding'));
      return;
    }

    if (!floorNumber || floorNumber < 0) {
      toast.error(t('add.errorFloorNumber'));
      return;
    }

    if (numberOfRooms < 1 || numberOfRooms > 50) {
      toast.error(t('add.errorRoomCount'));
      return;
    }

    // Check room limit (maxRooms is never null now, defaults to 10 for free plan)
    if (maxRooms !== -1) {
      const currentRoomCount = rooms.length;
      const roomsAfterAdd = currentRoomCount + numberOfRooms;
      if (roomsAfterAdd > maxRooms) {
        const availableSlots = maxRooms - currentRoomCount;
        if (availableSlots <= 0) {
          toast.error(`Room limit reached. Your plan allows up to ${maxRooms} rooms. Please upgrade to add more rooms.`);
          return;
        }
        toast.error(`You can only add ${availableSlots} more room(s). Your plan allows up to ${maxRooms} rooms. Please upgrade to add more.`);
        return;
      }
    }

    // Check if floor already exists in the selected building
    const floorExists = rooms.some(r => 
      r.floor === floorNumber && 
      (r.buildingId || 'default') === selectedBuildingId
    );
    if (floorExists) {
      toast.error(`${t('add.floorNumber')} ${floorNumber} ${t('add.errorFloorExists')}`);
      return;
    }

    // Generate rooms for this floor
    const newRooms: Room[] = [];
    // Ensure we have a valid buildingId - use first building if 'default' or empty
    let validBuildingId = selectedBuildingId;
    if (!validBuildingId || validBuildingId === 'default') {
      if (!hotel?.buildings || hotel.buildings.length === 0) {
        toast.error(t('add.errorBuilding') || 'No building found. Please create a building first.');
        return;
      }
      validBuildingId = hotel.buildings[0].id;
    }

    for (let i = 1; i <= numberOfRooms; i++) {
      const roomNumber = `${floorNumber}${i.toString().padStart(2, '0')}`; // e.g., 201, 202, 203...
      
      const newRoom: Room = {
        id: `room-${Date.now()}-${i}`,
        number: roomNumber,
        floor: floorNumber,
        buildingId: validBuildingId,
        type: 'Single',
        price: 300000, // Default price
        hourlyRate: 50000, // Default hourly rate
        status: 'vacant-clean',
      };

      newRooms.push(newRoom);
    }

    // Add all rooms to the context - use Promise.all for parallel execution
    try {
      await Promise.all(newRooms.map(room => addRoom(room)));

      toast.success(`✅ ${t('add.floorCreated')} ${floorNumber} ${t('add.withRooms')} ${numberOfRooms} ${t('building.rooms')}`, {
        description: `${t('common.room')} ${newRooms[0].number} - ${newRooms[newRooms.length - 1].number}`
      });

      onClose();
    } catch (error) {
      // Error already handled in AppContext
      // Show additional info if some rooms failed
      toast.error(`Some rooms may not have been created. Please check and try again.`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="w-6 h-6 text-blue-600" />
            {t('add.floorTitle')}
          </DialogTitle>
          <DialogDescription>
            {t('add.floorDescription')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Building Selection */}
          {!buildingId && (
            <div className="space-y-2">
              <Label htmlFor="building-select" className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                {t('add.building')} <span className="text-red-500">*</span>
              </Label>
              <Select value={selectedBuildingId} onValueChange={setSelectedBuildingId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('add.selectBuilding')} />
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
              {t('add.floorNumberLabel')} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="floorNumber"
              type="number"
              min="0"
              value={floorNumber}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                setFloorNumber(value);
                setFloorName(`${t('add.floorNumber')} ${value}`);
              }}
              className="text-lg"
              required
            />
            <p className="text-sm text-gray-500">
              {t('add.floorNumberExample')} ({t('add.nextFloor')}: {Math.max(...rooms.map(r => r.floor), 0) + 1})
            </p>
          </div>

          {/* Floor Name (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="floorName" className="text-base">
              {t('add.floorName')}
            </Label>
            <Input
              id="floorName"
              type="text"
              value={floorName}
              onChange={(e) => setFloorName(e.target.value)}
              placeholder={t('add.floorNamePlaceholder')}
              className="text-lg"
            />
            <p className="text-sm text-gray-500">
              {t('add.floorNameHint')}
            </p>
          </div>

          {/* Number of Rooms */}
          <div className="space-y-2">
            <Label htmlFor="numberOfRooms" className="text-base">
              {t('add.autoCreateRooms')} <span className="text-red-500">*</span>
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
              {t('add.autoCreateRoomsHint')} {numberOfRooms} {t('add.roomsWithNumbers')}: {floorNumber}01 - {floorNumber}{numberOfRooms.toString().padStart(2, '0')}
            </p>
          </div>

          {/* Preview */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-blue-900 mb-2">🔍 {t('add.preview')}:</p>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>{t('add.previewFloor')}:</strong> {floorNumber} ({floorName})</li>
              <li>• <strong>{t('add.previewRooms')}:</strong> {numberOfRooms} {t('building.rooms')}</li>
              <li>• <strong>{t('add.previewRoomNumbers')}:</strong> {floorNumber}01, {floorNumber}02, ... {floorNumber}{numberOfRooms.toString().padStart(2, '0')}</li>
              <li>• <strong>{t('add.previewDefaultPrice')}:</strong> 300,000₫/{t('room.daily').toLowerCase()}, 50,000₫/{t('room.hourly').toLowerCase()}</li>
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
              {t('delete.cancel')}
            </Button>
            <Button
              type="submit"
              className="flex-1 text-lg py-6 bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-5 h-5 mr-2" />
              {t('add.createFloor')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
