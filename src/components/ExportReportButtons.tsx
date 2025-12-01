'use client'

import { FileSpreadsheet, FileText } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { useLanguage } from '../contexts/LanguageContext';
import { removeVietnameseAccents, formatCurrency, formatDate } from '../utils/textUtils';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useSubscription } from '../hooks/useSubscription';
import { PremiumDialog } from './PremiumDialog';
import { useState } from 'react';

interface ExportData {
  date?: string;
  month?: string;
  monthName?: string;
  roomNumber?: string;
  guestName?: string;
  amount?: number;
  rent?: number;
  electricity?: number;
  water?: number;
  internet?: number;
  other?: number;
  total?: number;
  paidRooms?: number;
  type?: string;
  paymentMethod?: string;
  utilities?: {
    electricity?: number;
    water?: number;
    internet?: number;
    other?: number;
  };
}

interface ExportReportButtonsProps {
  data: ExportData[];
  reportType: 'guesthouse' | 'boarding-house';
  period: string; // "Hom nay", "Thang 11/2024", "Nam 2024", etc
  summary?: {
    total: number;
    [key: string]: any;
  };
  viewMode?: 'month' | 'year';
}

export function ExportReportButtons({ data, reportType, period, summary, viewMode = 'month' }: ExportReportButtonsProps) {
  const { t } = useLanguage();
  const { canExportReports } = useSubscription({ appSlug: 'guesthouse' });
  const [showPremiumDialog, setShowPremiumDialog] = useState(false);
  
  // Compact currency format for PDF (removes trailing zeros)
  const formatCurrencyCompact = (amount: number): string => {
    if (amount === 0) return '0';
    // For large numbers, use K/M suffix to save space
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 100000) {
      return `${(amount / 1000).toFixed(0)}K`;
    }
    return formatCurrency(amount);
  };

  const exportToExcel = () => {
    // Check export permission (following CV_Online pattern)
    if (!canExportReports) {
      setShowPremiumDialog(true);
      toast.error(t('export.premiumRequired') || 'Export to Excel requires Premium subscription');
      return;
    }

    try {
      if (data.length === 0) {
        toast.error(t('export.noData'));
        return;
      }

      const hotelName = removeVietnameseAccents('Khach San Demo');
      const reportTitle = removeVietnameseAccents(`Bao Cao Doanh Thu - ${period}`);
      
      let worksheetData: any[] = [];
      
      if (reportType === 'guesthouse') {
        // Guest House format
        worksheetData = [
          [hotelName],
          [reportTitle],
          [''],
          ['STT', 'Ngay Gio', 'Phong', 'Khach Hang', 'Loai', 'So Tien (VND)']
        ];

        data.forEach((item, index) => {
          worksheetData.push([
            index + 1,
            item.date ? formatDate(item.date) : '',
            item.roomNumber,
            removeVietnameseAccents(item.guestName || ''),
            item.type || '',
            item.amount
          ]);
        });

        // Add summary
        worksheetData.push(['']);
        worksheetData.push(['TONG CONG', '', '', '', '', summary?.total || 0]);
        
      } else {
        // Boarding House format
        if (viewMode === 'year') {
          // Yearly format - monthly breakdown
          worksheetData = [
            [hotelName],
            [reportTitle],
            [''],
            ['STT', 'Thang', 'Tien Phong', 'Tien Dien', 'Tien Nuoc', 'Internet', 'Khac', 'Tong Cong', 'So Phong']
          ];

          data.forEach((item, index) => {
            worksheetData.push([
              index + 1,
              removeVietnameseAccents(item.monthName || ''),
              item.rent || 0,
              item.electricity || 0,
              item.water || 0,
              item.internet || 0,
              item.other || 0,
              item.total || 0,
              item.paidRooms || 0
            ]);
          });

          // Add summary
          if (summary) {
            worksheetData.push(['']);
            worksheetData.push(['TONG NAM', '', summary.totalRent || 0, summary.totalElectricity || 0, 
                               summary.totalWater || 0, summary.totalInternet || 0, summary.totalOther || 0, 
                               summary.total || 0, '']);
          }
        } else {
          // Monthly format - room details
          worksheetData = [
            [hotelName],
            [reportTitle],
            [''],
            ['STT', 'Phong', 'Khach Thue', 'Tien Phong', 'Tien Dien', 'Tien Nuoc', 'Internet', 'Khac', 'Tong Cong']
          ];

          data.forEach((item, index) => {
            worksheetData.push([
              index + 1,
              item.roomNumber,
              removeVietnameseAccents(item.guestName || ''),
              item.amount || 0,
              item.utilities?.electricity || 0,
              item.utilities?.water || 0,
              item.utilities?.internet || 0,
              item.utilities?.other || 0,
              ((item.amount || 0) + (item.utilities?.electricity || 0) + (item.utilities?.water || 0) + 
               (item.utilities?.internet || 0) + (item.utilities?.other || 0))
            ]);
          });

          // Add summary
          if (summary) {
            worksheetData.push(['']);
            worksheetData.push(['TONG CONG', '', '', summary.totalRent || 0, summary.totalElectricity || 0, 
                               summary.totalWater || 0, summary.totalInternet || 0, summary.totalOther || 0, 
                               summary.total || 0]);
          }
        }
      }

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(worksheetData);

      // Set column widths
      let colWidths;
      if (reportType === 'guesthouse') {
        colWidths = [{ wch: 5 }, { wch: 18 }, { wch: 10 }, { wch: 25 }, { wch: 12 }, { wch: 15 }];
      } else if (viewMode === 'year') {
        colWidths = [{ wch: 5 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 10 }];
      } else {
        colWidths = [{ wch: 5 }, { wch: 10 }, { wch: 25 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 15 }];
      }
      
      ws['!cols'] = colWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Bao Cao');

      // Generate filename
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `BaoCao_DoanhThu_${removeVietnameseAccents(period)}_${timestamp}.xlsx`;

      // Download file
      XLSX.writeFile(wb, filename);

      toast.success(t('export.excelSuccess'), {
        description: `File: ${filename}`
      });
    } catch (error) {
      console.error('Excel export error:', error);
      toast.error(t('export.excelError'));
    }
  };

  const exportToPDF = () => {
    // Check export permission (following CV_Online pattern)
    if (!canExportReports) {
      setShowPremiumDialog(true);
      toast.error(t('export.premiumRequired') || 'Export to PDF requires Premium subscription');
      return;
    }

    try {
      if (data.length === 0) {
        toast.error(t('export.noData'));
        return;
      }

      const doc = new jsPDF();
      
      // Use a font that supports Vietnamese (without accents for safety)
      doc.setFont('helvetica');
      
      const hotelName = removeVietnameseAccents('Khach San Demo');
      const reportTitle = removeVietnameseAccents(`Bao Cao Doanh Thu - ${period}`);
      
      // Title
      doc.setFontSize(18);
      doc.text(hotelName, 105, 15, { align: 'center' });
      
      doc.setFontSize(14);
      doc.text(reportTitle, 105, 25, { align: 'center' });
      
      doc.setFontSize(10);
      doc.text(`Ngay xuat: ${new Date().toLocaleDateString('vi-VN')}`, 105, 32, { align: 'center' });
      
      // Add note for compact format (boarding house only)
      if (reportType === 'boarding-house') {
        doc.setFontSize(7);
        doc.setFont('helvetica', 'italic');
        doc.text('(K = Ngan dong, M = Trieu dong)', 105, 37, { align: 'center' });
        doc.setFont('helvetica', 'normal');
      }

      let tableData: any[] = [];
      let columns: any[] = [];

      if (reportType === 'guesthouse') {
        columns = [
          { header: 'STT', dataKey: 'stt' },
          { header: 'Ngay Gio', dataKey: 'date' },
          { header: 'Phong', dataKey: 'room' },
          { header: 'Khach Hang', dataKey: 'guest' },
          { header: 'Loai', dataKey: 'type' },
          { header: 'So Tien (VND)', dataKey: 'amount' }
        ];

        tableData = data.map((item, index) => ({
          stt: index + 1,
          date: item.date ? formatDate(item.date, true) : '',
          room: item.roomNumber,
          guest: removeVietnameseAccents(item.guestName || ''),
          type: item.type || '',
          amount: formatCurrency(item.amount || 0)
        }));
      } else {
        if (viewMode === 'year') {
          // Yearly format - monthly breakdown
          columns = [
            { header: 'STT', dataKey: 'stt' },
            { header: 'Thang', dataKey: 'month' },
            { header: 'Phong', dataKey: 'rent' },
            { header: 'Dien', dataKey: 'elec' },
            { header: 'Nuoc', dataKey: 'water' },
            { header: 'Net', dataKey: 'internet' },
            { header: 'Khac', dataKey: 'other' },
            { header: 'Tong', dataKey: 'total' },
            { header: 'SL', dataKey: 'rooms' }
          ];

          tableData = data.map((item, index) => ({
            stt: index + 1,
            month: removeVietnameseAccents(item.monthName || ''),
            rent: formatCurrencyCompact(item.rent || 0),
            elec: formatCurrencyCompact(item.electricity || 0),
            water: formatCurrencyCompact(item.water || 0),
            internet: formatCurrencyCompact(item.internet || 0),
            other: formatCurrencyCompact(item.other || 0),
            total: formatCurrencyCompact(item.total || 0),
            rooms: item.paidRooms || 0
          }));
        } else {
          // Monthly format - room details
          columns = [
            { header: 'STT', dataKey: 'stt' },
            { header: 'Phong', dataKey: 'room' },
            { header: 'Ten', dataKey: 'guest' },
            { header: 'Phong', dataKey: 'rent' },
            { header: 'Dien', dataKey: 'elec' },
            { header: 'Nuoc', dataKey: 'water' },
            { header: 'Net', dataKey: 'internet' },
            { header: 'Khac', dataKey: 'other' },
            { header: 'Tong', dataKey: 'total' }
          ];

          tableData = data.map((item, index) => {
            const elec = item.utilities?.electricity || 0;
            const water = item.utilities?.water || 0;
            const internet = item.utilities?.internet || 0;
            const other = item.utilities?.other || 0;
            const total = (item.amount || 0) + elec + water + internet + other;

            return {
              stt: index + 1,
              room: item.roomNumber,
              guest: removeVietnameseAccents(item.guestName || ''),
              rent: formatCurrencyCompact(item.amount || 0),
              elec: formatCurrencyCompact(elec),
              water: formatCurrencyCompact(water),
              internet: formatCurrencyCompact(internet),
              other: formatCurrencyCompact(other),
              total: formatCurrencyCompact(total)
            };
          });
        }
      }

      // Generate table
      autoTable(doc, {
        startY: reportType === 'boarding-house' ? 42 : 40,
        head: [columns.map(col => col.header)],
        body: tableData.map(row => columns.map(col => row[col.dataKey])),
        theme: 'grid',
        headStyles: { 
          fillColor: [59, 130, 246],
          fontSize: reportType === 'guesthouse' ? 8 : 7,
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle'
        },
        bodyStyles: { 
          fontSize: reportType === 'guesthouse' ? 7 : 6,
          overflow: 'linebreak',
          cellPadding: 1
        },
        columnStyles: reportType === 'guesthouse' 
          ? {
              0: { cellWidth: 10, halign: 'center' },  // STT
              1: { cellWidth: 32 },  // Ngay Gio
              2: { cellWidth: 15, halign: 'center' },  // Phong
              3: { cellWidth: 45 },  // Khach Hang
              4: { cellWidth: 18, halign: 'center' },  // Loai
              5: { cellWidth: 28, halign: 'right' }  // So Tien
            }
          : viewMode === 'year'
            ? {
                0: { cellWidth: 8, halign: 'center' },   // STT
                1: { cellWidth: 22 },  // Thang
                2: { cellWidth: 18, halign: 'right' },  // Phong
                3: { cellWidth: 16, halign: 'right' },  // Dien
                4: { cellWidth: 16, halign: 'right' },  // Nuoc
                5: { cellWidth: 14, halign: 'right' },  // Net
                6: { cellWidth: 14, halign: 'right' },  // Khac
                7: { cellWidth: 20, halign: 'right' },  // Tong
                8: { cellWidth: 10, halign: 'center' }  // SL
              }
            : {
                0: { cellWidth: 8, halign: 'center' },   // STT
                1: { cellWidth: 14, halign: 'center' },  // Phong
                2: { cellWidth: 38 },  // Ten
                3: { cellWidth: 18, halign: 'right' },  // Phong
                4: { cellWidth: 16, halign: 'right' },  // Dien
                5: { cellWidth: 16, halign: 'right' },  // Nuoc
                6: { cellWidth: 14, halign: 'right' },  // Net
                7: { cellWidth: 14, halign: 'right' },  // Khac
                8: { cellWidth: 20, halign: 'right' }   // Tong
              },
        margin: { left: 10, right: 10 },
        tableWidth: 'wrap'
      });

      // Add summary
      let finalY = (doc as any).lastAutoTable.finalY + 10;
      
      // Check if we need a new page for summary
      const pageHeight = doc.internal.pageSize.height;
      if (finalY > pageHeight - 60) {
        doc.addPage();
        finalY = 20;
      }
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      
      if (summary) {
        if (reportType === 'guesthouse') {
          doc.text(`TONG CONG: ${formatCurrency(summary.total)} VND`, 14, finalY);
        } else {
          const summaryTitle = viewMode === 'year' ? 'TONG NAM:' : 'TONG CONG:';
          doc.text(summaryTitle, 14, finalY);
          doc.setFontSize(8);
          doc.text(`- Tien phong: ${formatCurrency(summary.totalRent || 0)} VND`, 14, finalY + 6);
          doc.text(`- Tien dien: ${formatCurrency(summary.totalElectricity || 0)} VND`, 14, finalY + 12);
          doc.text(`- Tien nuoc: ${formatCurrency(summary.totalWater || 0)} VND`, 14, finalY + 18);
          doc.text(`- Internet: ${formatCurrency(summary.totalInternet || 0)} VND`, 14, finalY + 24);
          if (summary.totalOther > 0) {
            doc.text(`- Khac: ${formatCurrency(summary.totalOther || 0)} VND`, 14, finalY + 30);
          }
          doc.setFontSize(10);
          doc.text(`=> Tong: ${formatCurrency(summary.total)} VND`, 14, finalY + (summary.totalOther > 0 ? 38 : 32));
        }
      }

      // Generate filename
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `BaoCao_DoanhThu_${removeVietnameseAccents(period)}_${timestamp}.pdf`;

      // Save PDF
      doc.save(filename);

      toast.success(t('export.pdfSuccess'), {
        description: `File: ${filename}`
      });
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error(t('export.pdfError'));
    }
  };

  return (
    <>
      <div className="flex gap-2">
        <Button
          onClick={exportToExcel}
          variant="outline"
          disabled={!canExportReports}
          className={`flex-1 bg-green-50 hover:bg-green-100 border-green-300 text-green-700 ${!canExportReports ? 'opacity-50 cursor-not-allowed' : ''}`}
          title={!canExportReports ? (t('export.premiumRequired') || 'Premium required') : ''}
        >
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          {t('export.excel')}
        </Button>
        <Button
          onClick={exportToPDF}
          variant="outline"
          disabled={!canExportReports}
          className={`flex-1 bg-red-50 hover:bg-red-100 border-red-300 text-red-700 ${!canExportReports ? 'opacity-50 cursor-not-allowed' : ''}`}
          title={!canExportReports ? (t('export.premiumRequired') || 'Premium required') : ''}
        >
          <FileText className="w-4 h-4 mr-2" />
          {t('export.pdf')}
        </Button>
      </div>
      <PremiumDialog 
        open={showPremiumDialog} 
        onOpenChange={setShowPremiumDialog}
        onUpgradeSuccess={() => setShowPremiumDialog(false)}
      />
    </>
  );
}
