'use client'

import { InvoiceSettingsDialog } from './InvoiceSettingsDialog';
import { InvoiceHistoryDialog } from './InvoiceHistoryDialog';
import { Home, LogOut, UserPlus, Users, CreditCard, Building2, Settings, Trash2, FileText, History } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useBusinessModel } from '../hooks/useBusinessModel';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from './ui/sheet';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Separator } from './ui/separator';
import { Textarea } from './ui/textarea';
import { useState } from 'react';
import { toast } from 'sonner';
import { BankAccountManagement } from './BankAccountManagement';

interface AppMenuProps {
  open: boolean;
  onClose: () => void;
}

export function AppMenu({ open, onClose }: AppMenuProps) {
  const { user, hotel, logout, addStaff, updateHotelInfo } = useApp();
  const { features, isBoardingHouse, isGuestHouse } = useBusinessModel();
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [showHotelConfig, setShowHotelConfig] = useState(false);
  const [showBankAccount, setShowBankAccount] = useState(false);
  const [showInvoiceSettings, setShowInvoiceSettings] = useState(false);
  const [showInvoiceHistory, setShowInvoiceHistory] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffRole, setStaffRole] = useState<'receptionist' | 'housekeeping'>('receptionist');
  const [hotelName, setHotelName] = useState(hotel?.name || '');
  const [hotelAddress, setHotelAddress] = useState(hotel?.address || '');

  const isAdmin = user?.role === 'admin';

  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    addStaff(staffEmail, staffName, staffRole);
    toast.success(`Đã thêm nhân viên ${staffName}!`);
    setShowAddStaff(false);
    setStaffName('');
    setStaffEmail('');
    setStaffRole('receptionist');
  };

  const handleResetAllData = () => {
    // Clear all localStorage
    localStorage.clear();
    toast.success('Đã xóa toàn bộ dữ liệu!');
    setShowResetConfirm(false);
    // Reload page to reset state
    window.location.reload();
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="left" className="w-80 flex flex-col">
        <SheetHeader>
          <SheetTitle>{hotel?.name}</SheetTitle>
          <SheetDescription>Menu chính</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto mt-6 space-y-2 pb-4">
          {/* Always visible */}
          <Button variant="ghost" className="w-full justify-start" onClick={onClose}>
            <Home className="w-5 h-5 mr-3" />
            Sơ đồ phòng
          </Button>

          {/* Admin only */}
          {isAdmin && (
            <>
              <Separator className="my-4" />

              <Button 
                variant="ghost" 
                className="w-full justify-start"
                onClick={() => {
                  setShowHotelConfig(true);
                  onClose();
                }}
              >
                <Building2 className="w-5 h-5 mr-3" />
                Cấu hình {isBoardingHouse ? 'Nhà trọ' : isGuestHouse ? 'Nhà nghỉ' : 'Khách sạn'}
              </Button>
              
              <Button 
                variant="ghost" 
                className="w-full justify-start"
                onClick={() => {
                  setShowBankAccount(true);
                  onClose();
                }}
              >
                <CreditCard className="w-5 h-5 mr-3" />
                Tài khoản Ngân hàng
              </Button>


              <Button 
                variant="ghost" 
                className="w-full justify-start text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                onClick={() => {
                  setShowInvoiceSettings(true);
                  onClose();
                }}
              >
                <FileText className="w-5 h-5 mr-3" />
                Thuế & Hóa đơn điện tử
              </Button>

              <Button 
                variant="ghost" 
                className="w-full justify-start"
                onClick={() => {
                  setShowInvoiceHistory(true);
                  onClose();
                }}
              >
                <History className="w-5 h-5 mr-3" />
                Lịch sử hóa đơn
              </Button>

              {/* Staff Management - Only for hotels with staff */}
              {features.staffManagement && (
                <Button 
                  variant="ghost" 
                  className="w-full justify-start"
                  onClick={() => {
                    setShowAddStaff(true);
                    onClose();
                  }}
                >
                  <UserPlus className="w-5 h-5 mr-3" />
                  Thêm Nhân viên
                </Button>
              )}

              {features.staffManagement && hotel && hotel.staff.length > 0 && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-4 h-4 text-gray-600" />
                    <span className="text-sm text-gray-900">Danh sách nhân viên</span>
                  </div>
                  <div className="space-y-2">
                    {hotel.staff.map((s) => (
                      <div key={s.id} className="text-xs">
                        <p className="text-gray-900">{s.name}</p>
                        <p className="text-gray-500">
                          {s.email} • {s.role === 'receptionist' ? 'Lễ tân' : 'Buồng phòng'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          <Separator className="my-4" />

          <Button
            variant="ghost"
            className="w-full justify-start text-orange-600 hover:text-orange-700 hover:bg-orange-50"
            onClick={() => {
              setShowResetConfirm(true);
              onClose();
            }}
          >
            <Trash2 className="w-5 h-5 mr-3" />
            Reset dữ liệu
          </Button>

          <Button
            variant="ghost"
            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => {
              logout();
              onClose();
            }}
          >
            <LogOut className="w-5 h-5 mr-3" />
            Đăng xuất
          </Button>
        </div>

      </SheetContent>
      
      {/* All Dialogs outside Sheet to avoid conflicts */}
      <Dialog open={showHotelConfig} onOpenChange={setShowHotelConfig}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cấu hình Khách sạn</DialogTitle>
            <DialogDescription>Cập nhật tên và địa chỉ khách sạn</DialogDescription>
          </DialogHeader>
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              updateHotelInfo(hotelName, hotelAddress);
              toast.success('Cập nhật thông tin khách sạn thành công!');
              setShowHotelConfig(false);
            }} 
            className="space-y-4"
          >
            <div>
              <Label htmlFor="hotel-name">Tên khách sạn</Label>
              <Input
                id="hotel-name"
                value={hotelName}
                onChange={(e) => setHotelName(e.target.value)}
                placeholder="Grand Hotel & Spa"
                required
              />
            </div>
            <div>
              <Label htmlFor="hotel-address">Địa chỉ</Label>
              <Textarea
                id="hotel-address"
                value={hotelAddress}
                onChange={(e) => setHotelAddress(e.target.value)}
                placeholder="123 Đường ABC, Quận XYZ, TP. Hồ Chí Minh"
                rows={3}
              />
            </div>
            <Button type="submit" className="w-full">
              Lưu thay đổi
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddStaff} onOpenChange={setShowAddStaff}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm Nhân viên</DialogTitle>
            <DialogDescription>Tạo tài khoản nhân viên mới cho khách sạn</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddStaff} className="space-y-4">
            <div>
              <Label htmlFor="staff-name">Tên nhân viên</Label>
              <Input
                id="staff-name"
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                placeholder="Nguyễn Văn B"
                required
              />
            </div>
            <div>
              <Label htmlFor="staff-email">Email nhân viên</Label>
              <Input
                id="staff-email"
                type="email"
                value={staffEmail}
                onChange={(e) => setStaffEmail(e.target.value)}
                placeholder="nhanvien@email.com"
                required
              />
            </div>
            <div>
              <Label htmlFor="staff-role">Vai trò</Label>
              <Select value={staffRole} onValueChange={(v: 'receptionist' | 'housekeeping') => setStaffRole(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="receptionist">Lễ tân</SelectItem>
                  <SelectItem value="housekeeping">Buồng phòng</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full">
              Thêm nhân viên
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bank Account Management Dialog */}
      <BankAccountManagement open={showBankAccount} onClose={() => setShowBankAccount(false)} />
      

      {/* Reset Confirmation Dialog */}
      <Dialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl text-orange-600">⚠️ Xác nhận Reset dữ liệu</DialogTitle>
            <DialogDescription className="text-base">
              Hành động này sẽ xóa <strong>TẤT CẢ</strong> dữ liệu bao gồm:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm text-gray-700">
            <p>• Thông tin tài khoản và khách sạn</p>
            <p>• Tất cả phòng và khách đã check-in</p>
            <p>• Lịch sử thanh toán và báo cáo</p>
            <p>• Cấu hình ngân hàng và tòa nhà</p>
          </div>
          <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
            <p className="text-sm text-orange-800">
              <strong>Lưu ý:</strong> Dữ liệu sẽ được reset về trạng thái ban đầu. Bạn sẽ cần đăng ký lại tài khoản.
            </p>
          </div>
          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              onClick={() => setShowResetConfirm(false)}
              className="flex-1"
            >
              Hủy
            </Button>
            <Button 
              onClick={handleResetAllData}
              className="flex-1 bg-orange-600 hover:bg-orange-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Xác nhận Reset
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invoice Settings Dialog */}
      <InvoiceSettingsDialog open={showInvoiceSettings} onClose={() => setShowInvoiceSettings(false)} />

      {/* Invoice History Dialog */}
      <InvoiceHistoryDialog open={showInvoiceHistory} onOpenChange={(open) => setShowInvoiceHistory(open)} />
    </Sheet>
  );
}