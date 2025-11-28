'use client'

import { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Building, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '../contexts/LanguageContext';
import { useSubscription } from '../hooks/useSubscription';

interface AddBuildingDialogProps {
  open: boolean;
  onClose: () => void;
}

export function AddBuildingDialog({ open, onClose }: AddBuildingDialogProps) {
  const { hotel, addBuilding } = useApp();
  const { t } = useLanguage();
  const { maxBuildings } = useSubscription({ appSlug: 'guesthouse' });
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check building limit (maxBuildings is never null now, defaults to 1 for free plan)
    if (maxBuildings !== -1) {
      const currentBuildingCount = hotel?.buildings.length || 0;
      if (currentBuildingCount >= maxBuildings) {
        toast.error(`Building limit reached. Your plan allows up to ${maxBuildings} building(s). Please upgrade to add more buildings.`);
        return;
      }
    }

    if (!name.trim()) {
      toast.error(t('add.errorBuildingNameBoarding'));
      return;
    }

    const newBuilding = {
      id: `building-${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      order: (hotel?.buildings.length || 0) + 1,
    };

    try {
      await addBuilding(newBuilding);
      toast.success(`${t('add.buildingAddedBoarding')} "${name}"`);
      
      // Reset form
      setName('');
      setDescription('');
      onClose();
    } catch (error) {
      // Error already handled in AppContext
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Building className="w-6 h-6 text-blue-600" />
            {t('add.buildingTitleBoarding')}
          </DialogTitle>
          <DialogDescription>
            {t('add.buildingDescriptionBoarding')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="building-name" className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              {t('add.buildingNameBoarding')} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="building-name"
              placeholder={t('add.buildingNameBoardingPlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-lg"
              autoFocus
            />
            <p className="text-xs text-gray-500">
              {t('add.buildingNameBoardingHint')}
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="building-description">{t('add.buildingDescriptionLabel')}</Label>
            <Input
              id="building-description"
              placeholder={t('add.buildingDescriptionPlaceholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <p className="text-xs text-gray-500">
              {t('add.buildingDescriptionHint')}
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
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              <Building className="w-4 h-4 mr-2" />
              {t('add.addBuildingBoarding')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
