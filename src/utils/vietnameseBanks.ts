/**
 * Vietnamese bank information for VietQR integration
 * Source: https://qrcode.io.vn/banklist
 */
export interface VietnameseBank {
  code: string;        // Bank code for VietQR (e.g., "BIDV", "VCB")
  shortName: string;   // Short name for display (e.g., "BIDV", "Vietcombank")
  fullName: string;    // Full bank name
  bin: string;         // Bank Identification Number
}

/**
 * Complete list of 63 Vietnamese banks supported by VietQR
 */
export const VIETNAMESE_BANKS: VietnameseBank[] = [
  { code: 'ICB', shortName: 'VietinBank', fullName: 'Ngân hàng TMCP Công thương Việt Nam', bin: '970415' },
  { code: 'VCB', shortName: 'Vietcombank', fullName: 'Ngân hàng TMCP Ngoại Thương Việt Nam', bin: '970436' },
  { code: 'BIDV', shortName: 'BIDV', fullName: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam', bin: '970418' },
  { code: 'VBA', shortName: 'Agribank', fullName: 'Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam', bin: '970405' },
  { code: 'OCB', shortName: 'OCB', fullName: 'Ngân hàng TMCP Phương Đông', bin: '970448' },
  { code: 'MB', shortName: 'MBBank', fullName: 'Ngân hàng TMCP Quân đội', bin: '970422' },
  { code: 'TCB', shortName: 'Techcombank', fullName: 'Ngân hàng TMCP Kỹ thương Việt Nam', bin: '970407' },
  { code: 'ACB', shortName: 'ACB', fullName: 'Ngân hàng TMCP Á Châu', bin: '970416' },
  { code: 'VPB', shortName: 'VPBank', fullName: 'Ngân hàng TMCP Việt Nam Thịnh Vượng', bin: '970432' },
  { code: 'TPB', shortName: 'TPBank', fullName: 'Ngân hàng TMCP Tiên Phong', bin: '970423' },
  { code: 'STB', shortName: 'Sacombank', fullName: 'Ngân hàng TMCP Sài Gòn Thương Tín', bin: '970403' },
  { code: 'HDB', shortName: 'HDBank', fullName: 'Ngân hàng TMCP Phát triển Thành phố Hồ Chí Minh', bin: '970437' },
  { code: 'VCCB', shortName: 'VietCapitalBank', fullName: 'Ngân hàng TMCP Bản Việt', bin: '970454' },
  { code: 'SCB', shortName: 'SCB', fullName: 'Ngân hàng TMCP Sài Gòn', bin: '970429' },
  { code: 'VIB', shortName: 'VIB', fullName: 'Ngân hàng TMCP Quốc tế Việt Nam', bin: '970441' },
  { code: 'SHB', shortName: 'SHB', fullName: 'Ngân hàng TMCP Sài Gòn - Hà Nội', bin: '970443' },
  { code: 'EIB', shortName: 'Eximbank', fullName: 'Ngân hàng TMCP Xuất Nhập khẩu Việt Nam', bin: '970431' },
  { code: 'MSB', shortName: 'MSB', fullName: 'Ngân hàng TMCP Hàng Hải', bin: '970426' },
  { code: 'CAKE', shortName: 'CAKE', fullName: 'TMCP Việt Nam Thịnh Vượng - Ngân hàng số CAKE by VPBank', bin: '546034' },
  { code: 'Ubank', shortName: 'Ubank', fullName: 'TMCP Việt Nam Thịnh Vượng - Ngân hàng số Ubank by VPBank', bin: '546035' },
  { code: 'TIMO', shortName: 'Timo', fullName: 'Ngân hàng số Timo by Ban Viet Bank', bin: '963388' },
  { code: 'VTLMONEY', shortName: 'ViettelMoney', fullName: 'Tổng Công ty Dịch vụ số Viettel', bin: '971005' },
  { code: 'VNPTMONEY', shortName: 'VNPTMoney', fullName: 'VNPT Money', bin: '971011' },
  { code: 'SGICB', shortName: 'SaigonBank', fullName: 'Ngân hàng TMCP Sài Gòn Công Thương', bin: '970400' },
  { code: 'BAB', shortName: 'BacABank', fullName: 'Ngân hàng TMCP Bắc Á', bin: '970409' },
  { code: 'PVCB', shortName: 'PVcomBank', fullName: 'Ngân hàng TMCP Đại Chúng Việt Nam', bin: '970412' },
  { code: 'Oceanbank', shortName: 'Oceanbank', fullName: 'Ngân hàng Thương mại TNHH MTV Đại Dương', bin: '970414' },
  { code: 'NCB', shortName: 'NCB', fullName: 'Ngân hàng TMCP Quốc Dân', bin: '970419' },
  { code: 'SHBVN', shortName: 'ShinhanBank', fullName: 'Ngân hàng TNHH MTV Shinhan Việt Nam', bin: '970424' },
  { code: 'ABB', shortName: 'ABBANK', fullName: 'Ngân hàng TMCP An Bình', bin: '970425' },
  { code: 'VAB', shortName: 'VietABank', fullName: 'Ngân hàng TMCP Việt Á', bin: '970427' },
  { code: 'NAB', shortName: 'NamABank', fullName: 'Ngân hàng TMCP Nam Á', bin: '970428' },
  { code: 'PGB', shortName: 'PGBank', fullName: 'Ngân hàng TMCP Xăng dầu Petrolimex', bin: '970430' },
  { code: 'VIETBANK', shortName: 'VietBank', fullName: 'Ngân hàng TMCP Việt Nam Thương Tín', bin: '970433' },
  { code: 'BVB', shortName: 'BaoVietBank', fullName: 'Ngân hàng TMCP Bảo Việt', bin: '970438' },
  { code: 'SEAB', shortName: 'SeABank', fullName: 'Ngân hàng TMCP Đông Nam Á', bin: '970440' },
  { code: 'COOPBANK', shortName: 'COOPBANK', fullName: 'Ngân hàng Hợp tác xã Việt Nam', bin: '970446' },
  { code: 'LPB', shortName: 'LienVietPostBank', fullName: 'Ngân hàng TMCP Bưu Điện Liên Việt', bin: '970449' },
  { code: 'KLB', shortName: 'KienLongBank', fullName: 'Ngân hàng TMCP Kiên Long', bin: '970452' },
  { code: 'KBank', shortName: 'KBank', fullName: 'Ngân hàng Đại chúng TNHH Kasikornbank', bin: '668888' },
  { code: 'UOB', shortName: 'UnitedOverseas', fullName: 'Ngân hàng United Overseas - Chi nhánh TP. Hồ Chí Minh', bin: '970458' },
  { code: 'SCVN', shortName: 'StandardChartered', fullName: 'Ngân hàng TNHH MTV Standard Chartered Bank Việt Nam', bin: '970410' },
  { code: 'PBVN', shortName: 'PublicBank', fullName: 'Ngân hàng TNHH MTV Public Việt Nam', bin: '970439' },
  { code: 'NHB HN', shortName: 'Nonghyup', fullName: 'Ngân hàng Nonghyup - Chi nhánh Hà Nội', bin: '801011' },
  { code: 'IVB', shortName: 'IndovinaBank', fullName: 'Ngân hàng TNHH Indovina', bin: '970434' },
  { code: 'IBK - HCM', shortName: 'IBKHCM', fullName: 'Ngân hàng Công nghiệp Hàn Quốc - Chi nhánh TP. Hồ Chí Minh', bin: '970456' },
  { code: 'IBK - HN', shortName: 'IBKHN', fullName: 'Ngân hàng Công nghiệp Hàn Quốc - Chi nhánh Hà Nội', bin: '970455' },
  { code: 'VRB', shortName: 'VRB', fullName: 'Ngân hàng Liên doanh Việt - Nga', bin: '970421' },
  { code: 'WVN', shortName: 'Woori', fullName: 'Ngân hàng TNHH MTV Woori Việt Nam', bin: '970457' },
  { code: 'KBHN', shortName: 'KookminHN', fullName: 'Ngân hàng Kookmin - Chi nhánh Hà Nội', bin: '970462' },
  { code: 'KBHCM', shortName: 'KookminHCM', fullName: 'Ngân hàng Kookmin - Chi nhánh Thành phố Hồ Chí Minh', bin: '970463' },
  { code: 'HSBC', shortName: 'HSBC', fullName: 'Ngân hàng TNHH MTV HSBC (Việt Nam)', bin: '458761' },
  { code: 'HLBVN', shortName: 'HongLeong', fullName: 'Ngân hàng TNHH MTV Hong Leong Việt Nam', bin: '970442' },
  { code: 'GPB', shortName: 'GPBank', fullName: 'Ngân hàng Thương mại TNHH MTV Dầu Khí Toàn Cầu', bin: '970408' },
  { code: 'DOB', shortName: 'DongABank', fullName: 'Ngân hàng TMCP Đông Á', bin: '970406' },
  { code: 'DBS', shortName: 'DBSBank', fullName: 'DBS Bank Ltd - Chi nhánh Thành phố Hồ Chí Minh', bin: '796500' },
  { code: 'CIMB', shortName: 'CIMB', fullName: 'Ngân hàng TNHH MTV CIMB Việt Nam', bin: '422589' },
  { code: 'CBB', shortName: 'CBBank', fullName: 'Ngân hàng Thương mại TNHH MTV Xây dựng Việt Nam', bin: '970444' },
  { code: 'CITIBANK', shortName: 'Citibank', fullName: 'Ngân hàng Citibank, N.A. - Chi nhánh Hà Nội', bin: '533948' },
  { code: 'KEBHANAHCM', shortName: 'KEBHanaHCM', fullName: 'Ngân hàng KEB Hana – Chi nhánh Thành phố Hồ Chí Minh', bin: '970466' },
  { code: 'KEBHANAHN', shortName: 'KEBHANAHN', fullName: 'Ngân hàng KEB Hana – Chi nhánh Hà Nội', bin: '970467' },
  { code: 'MAFC', shortName: 'MAFC', fullName: 'Công ty Tài chính TNHH MTV Mirae Asset (Việt Nam)', bin: '977777' },
  { code: 'VBSP', shortName: 'VBSP', fullName: 'Ngân hàng Chính sách Xã hội', bin: '999888' },
];

/**
 * Get bank by code
 */
export function getBankByCode(code: string): VietnameseBank | undefined {
  return VIETNAMESE_BANKS.find(bank => bank.code === code);
}

/**
 * Get bank by short name (case insensitive)
 */
export function getBankByShortName(shortName: string): VietnameseBank | undefined {
  return VIETNAMESE_BANKS.find(
    bank => bank.shortName.toLowerCase() === shortName.toLowerCase()
  );
}

/**
 * Generate VietQR image URL (always uses compact template)
 * @param bankCode - Bank code (e.g., 'BIDV')
 * @param accountNumber - Bank account number
 * @returns VietQR image URL or null if invalid
 */
export function generateVietQRUrl(
  bankCode: string,
  accountNumber: string
): string | null {
  if (!bankCode || !accountNumber) return null;
  
  const cleanAccountNumber = accountNumber.trim().replace(/\s+/g, '');
  if (!cleanAccountNumber) return null;
  
  // Always use compact template as per user requirement
  return `https://img.vietqr.io/image/${bankCode}-${cleanAccountNumber}-compact.png`;
}

