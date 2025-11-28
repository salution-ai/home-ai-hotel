// Authentication state management utilities (similar to CV_Online pattern)

export interface AuthUser {
  id: number;
  fullName: string;
  username: string;
  preferredLanguage: string;
  sex: 'male' | 'female' | 'other' | null;
}

export interface AuthTokens {
  accessToken: string;
  accessTokenExpiresIn: number;
  refreshToken: string;
  refreshTokenExpiresAt: string;
}

const ACCESS_TOKEN_KEY = 'hotel_app_access_token';
const REFRESH_TOKEN_KEY = 'hotel_app_refresh_token';
const USER_KEY = 'hotel_app_user';

export function saveAuthState(user: AuthUser, tokens: AuthTokens): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function loadAuthState(): { user: AuthUser | null; accessToken: string | null; refreshToken: string | null } {
  if (typeof window === 'undefined') {
    return { user: null, accessToken: null, refreshToken: null };
  }

  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  const storedUser = localStorage.getItem(USER_KEY);

  try {
    const user = storedUser ? (JSON.parse(storedUser) as AuthUser) : null;
    return { user, accessToken, refreshToken };
  } catch {
    clearAuthState();
    return { user: null, accessToken: null, refreshToken: null };
  }
}

export function clearAuthState(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function updateTokens(tokens: AuthTokens): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

// Migration helper: migrate old token keys to new ones
export function migrateOldTokens(): void {
  if (typeof window === 'undefined') return;
  
  const oldAccessToken = localStorage.getItem('accessToken');
  const oldRefreshToken = localStorage.getItem('refreshToken');
  
  if (oldAccessToken && !localStorage.getItem(ACCESS_TOKEN_KEY)) {
    localStorage.setItem(ACCESS_TOKEN_KEY, oldAccessToken);
    localStorage.removeItem('accessToken');
  }
  
  if (oldRefreshToken && !localStorage.getItem(REFRESH_TOKEN_KEY)) {
    localStorage.setItem(REFRESH_TOKEN_KEY, oldRefreshToken);
    localStorage.removeItem('refreshToken');
  }
}

