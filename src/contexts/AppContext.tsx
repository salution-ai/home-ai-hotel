'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { Room, User, Hotel, Payment, Building, BusinessModel } from '../types';
import { initialRooms } from '../data/rooms';
import { getFeatures } from '../utils/businessModelFeatures';
import { hotelApi, buildingApi, roomApi, paymentApi, staffApi } from '../utils/api/guesthouse';
import { authApi } from '../utils/api/auth';
import { ApiClientError } from '../utils/api';
import { saveAuthState, loadAuthState, clearAuthState, migrateOldTokens, type AuthUser, type AuthTokens } from '../utils/auth';
import { subscriptionApi, type Subscription } from '../utils/api/subscriptions';
import { toast } from 'sonner';

interface AppContextType {
  user: User | null;
  hotel: Hotel | null;
  rooms: Room[];
  payments: Payment[];
  businessModel: BusinessModel | null;
  loading: boolean;
  subscription: Subscription | null;
  isPremium: boolean;
  setBusinessModel: (model: BusinessModel | null) => void;
  login: (username: string, password: string) => Promise<void>;
  signInWithGoogle: (idToken: string) => Promise<void>;
  signInWithFacebook: (accessToken: string) => Promise<void>;
  signInWithApple: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
  updateRoom: (roomId: string, updates: Partial<Room>) => Promise<void>;
  checkIn: (roomId: string, guestData: any) => Promise<void>;
  checkOut: (roomId: string) => Promise<void>;
  markRoomCleaned: (roomId: string) => Promise<void>;
  addStaff: (email: string, name: string, role: 'receptionist' | 'housekeeping') => Promise<void>;
  setupHotel: (hotelName: string, adminEmail: string, adminName: string, businessModel: BusinessModel) => Promise<void>;
  updateHotelInfo: (name: string, address: string, taxCode?: string, phoneNumber?: string, email?: string) => Promise<void>;
  updateBankAccount: (bankAccount: { bankName: string; bankCode: string; accountNumber: string; accountHolder: string }) => Promise<void>;
  addPayment: (payment: Payment, roomId?: string) => Promise<void>;
  clearPaymentsByPeriod: (period: 'today' | 'month' | 'year' | 'all') => Promise<void>;
  addRoom: (room: Room) => Promise<void>;
  deleteRoom: (roomId: string) => Promise<void>;
  deleteFloor: (floor: number, buildingId?: string) => Promise<void>;
  bulkUpdateRoomPrices: (roomIds: string[], price: number) => Promise<void>;
  addBuilding: (building: Building) => Promise<void>;
  updateBuilding: (buildingId: string, updates: Partial<Building>) => Promise<void>;
  deleteBuilding: (buildingId: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children, defaultBusinessModel }: { children: ReactNode; defaultBusinessModel?: BusinessModel }) {
  const [user, setUser] = useState<User | null>(null);
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [businessModel, setBusinessModelState] = useState<BusinessModel | null>(defaultBusinessModel || null);
  const [loading, setLoading] = useState(true);
  const [isGuestMode, setIsGuestMode] = useState(false);
  
  // Subscription state (following CV_Online pattern)
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  
  // Auth state management (following CV_Online pattern)
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [accessTokenExpiry, setAccessTokenExpiry] = useState<number | null>(null);
  const accessTokenRefreshTimeoutRef = useRef<number | null>(null);
  const refreshTokenRef = useRef<string | null>(null);
  const isInitializedRef = useRef(false);
  const isLoadingHotelRef = useRef(false);
  const isLoggingInRef = useRef(false);

  // Clear access token refresh timeout
  const clearAccessTokenRefreshTimeout = useCallback(() => {
    if (accessTokenRefreshTimeoutRef.current !== null) {
      clearTimeout(accessTokenRefreshTimeoutRef.current);
      accessTokenRefreshTimeoutRef.current = null;
    }
  }, []);

  // Schedule access token refresh (proactive refresh before expiration)
  const scheduleAccessTokenRefresh = useCallback(
    (expiresInSeconds: number, refreshFn: () => Promise<void>): void => {
      if (typeof window === 'undefined') {
        return;
      }
      clearAccessTokenRefreshTimeout();
      // Refresh 60 seconds before expiration, but at least 30 seconds
      const safeOffset = Math.max(expiresInSeconds - 60, 30);
      const timeoutId = window.setTimeout(() => {
        void refreshFn();
      }, safeOffset * 1000);
      accessTokenRefreshTimeoutRef.current = timeoutId;
    },
    [clearAccessTokenRefreshTimeout],
  );

  // Check subscription status (following CV_Online pattern)
  const checkSubscription = useCallback(async (token: string) => {
    try {
      const sub = await subscriptionApi.getByApp('guesthouse');
      if (sub && sub.status === 'active') {
        setSubscription(sub);
        setIsPremium(sub.planSlug === 'premium');
      } else {
        setSubscription(null);
        setIsPremium(false);
      }
    } catch (error) {
      // Subscription check failed, assume free
      setSubscription(null);
      setIsPremium(false);
    }
  }, []);

  // Refresh subscription (for use after upgrade)
  const refreshSubscription = useCallback(async () => {
    if (accessToken) {
      await checkSubscription(accessToken);
    }
  }, [accessToken, checkSubscription]);

  // Refresh auth state (proactive token refresh)
  const refreshAuth = useCallback(async () => {
    const activeRefreshToken = refreshTokenRef.current;
    if (!activeRefreshToken) {
      clearAccessTokenRefreshTimeout();
      setAccessToken(null);
      setAccessTokenExpiry(null);
      refreshTokenRef.current = null;
      setUser(null);
      clearAuthState();
      return;
    }

    try {
      const { user: refreshedUser, tokens } = await authApi.refresh(activeRefreshToken);
      // Preserve hotel info from current user state
      setUser(currentUser => {
        const authenticatedUser: User = {
          id: refreshedUser.id.toString(),
          email: refreshedUser.username,
          name: refreshedUser.fullName,
          role: 'admin',
          hotelId: currentUser?.hotelId || '',
          hotelName: currentUser?.hotelName || '',
        };
        return authenticatedUser;
      });
      setAccessToken(tokens.accessToken);
      refreshTokenRef.current = tokens.refreshToken;
      setAccessTokenExpiry(Date.now() + tokens.accessTokenExpiresIn * 1000);
      saveAuthState(refreshedUser, tokens);
      clearAccessTokenRefreshTimeout();
      scheduleAccessTokenRefresh(tokens.accessTokenExpiresIn, async () => {
        await refreshAuth();
      });
      await checkSubscription(tokens.accessToken);
    } catch (error) {
      clearAccessTokenRefreshTimeout();
      clearAuthState();
      setUser(null);
      setAccessToken(null);
      setAccessTokenExpiry(null);
      refreshTokenRef.current = null;
      setIsGuestMode(true);
    }
  }, [clearAccessTokenRefreshTimeout, scheduleAccessTokenRefresh, checkSubscription]);

  // Apply auth success (used after login/signup)
  const applyAuthSuccess = useCallback(
    (authUser: AuthUser, tokens: AuthTokens) => {
      const authenticatedUser: User = {
        id: authUser.id.toString(),
        email: authUser.username,
        name: authUser.fullName,
        role: 'admin',
        hotelId: '',
        hotelName: '',
      };
      setUser(authenticatedUser);
      setAccessToken(tokens.accessToken);
      refreshTokenRef.current = tokens.refreshToken;
      setAccessTokenExpiry(Date.now() + tokens.accessTokenExpiresIn * 1000);
      clearAccessTokenRefreshTimeout();
      scheduleAccessTokenRefresh(tokens.accessTokenExpiresIn, async () => {
        await refreshAuth();
      });
      saveAuthState(authUser, tokens);
      setIsGuestMode(false);
    },
    [clearAccessTokenRefreshTimeout, scheduleAccessTokenRefresh, refreshAuth, checkSubscription],
  );

  // Load hotel and related data
  const loadHotelData = useCallback(async (userToUse?: User) => {
    const currentUser = userToUse || user;
    if (!currentUser) return;

    // Prevent concurrent calls that could create duplicate hotels
    if (isLoadingHotelRef.current) {
      console.log('loadHotelData: Already loading, skipping duplicate call');
      return;
    }

    // Set flag immediately to prevent race conditions
    isLoadingHotelRef.current = true;

    try {
      let hotelData = await hotelApi.get();
      
      // If no hotel exists, create one automatically with name "My Hotel"
      if (!hotelData) {
        try {
          hotelData = await hotelApi.create({
            name: 'My Hotel',
            adminEmail: currentUser.email,
          });

          // Create default building
          const building = await buildingApi.create({
            hotelId: hotelData.id,
            name: 'Tòa chính',
            description: 'Tòa chính',
            displayOrder: 1,
          });

          hotelData.buildings = [building];
          hotelData.staff = [];
        } catch (error) {
          console.error('Failed to auto-create hotel:', error);
          setLoading(false);
          return;
        }
      }

      // Load buildings
      const buildings = await buildingApi.getAll(hotelData.id);
      hotelData.buildings = buildings;

      // Load staff
      const staff = await staffApi.getAll(hotelData.id);
      hotelData.staff = staff;

      setHotel(hotelData);

      // Load rooms
      const roomsData = await roomApi.getAll(hotelData.id);
      setRooms(roomsData);

      // Load all payments (paginated to handle more than 100)
      const paymentsData = await paymentApi.getAllPaginated(hotelData.id);
      setPayments(paymentsData);

      // Update user with hotel info
      setUser(prev => prev ? {
        ...prev,
        hotelId: hotelData.id,
        hotelName: hotelData.name,
      } : null);
      
      // Ensure we're in API mode after successful load
      setIsGuestMode(false);
    } catch (error) {
      console.error('Failed to load hotel data:', error);
      
      // Handle rate limiting - show warning but don't clear data
      if (error instanceof ApiClientError && error.statusCode === 429) {
        const { handleRateLimitError } = await import('../utils/rateLimitHandler');
        handleRateLimitError(error);
        // Don't clear data, just show warning and stop loading
        setLoading(false);
        isLoadingHotelRef.current = false;
        return;
      }
      
      if (error instanceof ApiClientError && error.statusCode === 401) {
        // Unauthorized - clear auth tokens and reset state
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setUser(null);
        setHotel(null);
        setRooms([]);
        setPayments([]);
        setIsGuestMode(true);
      }
    } finally {
      setLoading(false);
      isLoadingHotelRef.current = false;
    }
  }, [user]);

  // Initialize: check auth and load data (following CV_Online pattern)
  useEffect(() => {
    // Prevent multiple initializations
    if (isInitializedRef.current) {
      return;
    }
    isInitializedRef.current = true;
    
    let active = true;

    const initialiseAuth = async () => {
      // Migrate old tokens to new format
      migrateOldTokens();
      
      const stored = loadAuthState();
      if (!stored.accessToken || !stored.refreshToken) {
        // Check for legacy localStorage mode
        const savedHotel = localStorage.getItem('hotel-app-hotel');
        const savedUser = localStorage.getItem('hotel-app-user');
        
        if (!active) return;
        
        if (savedHotel && savedUser) {
          // Legacy localStorage mode
          setIsGuestMode(true);
          if (savedUser) setUser(JSON.parse(savedUser));
          if (savedHotel) {
            const loadedHotel = JSON.parse(savedHotel);
            if (!loadedHotel.buildings) {
              loadedHotel.buildings = [{ id: 'building-1', name: 'Tòa chính', order: 1 }];
            }
            setHotel(loadedHotel);
          }
          const savedRooms = localStorage.getItem('hotel-app-rooms');
          if (savedRooms) {
            setRooms(JSON.parse(savedRooms));
          } else {
            setRooms(initialRooms);
          }
        } else {
          // No auth token and no saved data - guest mode with demo data
          setIsGuestMode(true);
          setRooms(initialRooms);
        }
        setLoading(false);
        return;
      }

      // Set refs without triggering state updates initially
      refreshTokenRef.current = stored.refreshToken;

      try {
        // Validate token by calling profile endpoint
        const profile = await authApi.profile(stored.accessToken);
        if (!active) {
          return;
        }
        const authenticatedUser: User = {
          id: profile.user.id.toString(),
          email: profile.user.username,
          name: profile.user.fullName,
          role: 'admin',
          hotelId: '',
          hotelName: '',
        };
        
        // Batch state updates to prevent multiple re-renders
        setUser(authenticatedUser);
        setAccessToken(stored.accessToken);
        setAccessTokenExpiry(Date.now() + 14 * 60 * 1000); // Assume 14 min expiry
        setIsGuestMode(false);
        
        clearAccessTokenRefreshTimeout();
        scheduleAccessTokenRefresh(14 * 60, async () => {
          await refreshAuth();
        });
        
        // Check subscription status (following CV_Online pattern)
        await checkSubscription(stored.accessToken);
        
        // Clear any localStorage demo data to prevent conflicts
        localStorage.removeItem('hotel-app-hotel');
        localStorage.removeItem('hotel-app-user');
        localStorage.removeItem('hotel-app-rooms');
        
        // Load hotel data - auto-create if doesn't exist
        let hotelData = await hotelApi.get();
        
        if (!hotelData) {
          // Auto-create hotel with name "My Hotel"
          try {
            hotelData = await hotelApi.create({
              name: 'My Hotel',
              adminEmail: authenticatedUser.email,
            });

            // Create default building
            const building = await buildingApi.create({
              hotelId: hotelData.id,
              name: 'Tòa chính',
              description: 'Tòa chính',
              displayOrder: 1,
            });

            hotelData.buildings = [building];
            hotelData.staff = [];
          } catch (error) {
            console.error('Failed to auto-create hotel:', error);
            if (active) {
              setLoading(false);
            }
            return;
          }
        }
        
        // Load all hotel data
        const [buildings, staff, roomsData, paymentsData] = await Promise.all([
          buildingApi.getAll(hotelData.id),
          staffApi.getAll(hotelData.id),
          roomApi.getAll(hotelData.id),
          paymentApi.getAllPaginated(hotelData.id),
        ]);
        
        hotelData.buildings = buildings;
        hotelData.staff = staff;
        setHotel(hotelData);
        setRooms(roomsData);
        setPayments(paymentsData);
        
        setUser(prev => prev ? {
          ...prev,
          hotelId: hotelData.id,
          hotelName: hotelData.name,
        } : null);
        
      } catch {
        // Profile check failed, try to refresh
        if (!stored.refreshToken) {
          if (active) {
            clearAuthState();
            setUser(null);
            setAccessToken(null);
            setAccessTokenExpiry(null);
            refreshTokenRef.current = null;
            clearAccessTokenRefreshTimeout();
            setIsGuestMode(true);
            setRooms(initialRooms);
          }
        } else {
          try {
            const refreshed = await authApi.refresh(stored.refreshToken);
            if (!active) {
              return;
            }
            saveAuthState(refreshed.user, refreshed.tokens);
            const authenticatedUser: User = {
              id: refreshed.user.id.toString(),
              email: refreshed.user.username,
              name: refreshed.user.fullName,
              role: 'admin',
              hotelId: '',
              hotelName: '',
            };
            setUser(authenticatedUser);
            setAccessToken(refreshed.tokens.accessToken);
            refreshTokenRef.current = refreshed.tokens.refreshToken;
            setAccessTokenExpiry(Date.now() + refreshed.tokens.accessTokenExpiresIn * 1000);
            clearAccessTokenRefreshTimeout();
            scheduleAccessTokenRefresh(refreshed.tokens.accessTokenExpiresIn, async () => {
              await refreshAuth();
            });
            
            // Check subscription status (following CV_Online pattern)
            await checkSubscription(refreshed.tokens.accessToken);
            
            // Ensure we're in API mode and load data
            setIsGuestMode(false);
            await loadHotelData(authenticatedUser);
          } catch {
            if (active) {
              clearAuthState();
              setUser(null);
              setAccessToken(null);
              setAccessTokenExpiry(null);
              refreshTokenRef.current = null;
              clearAccessTokenRefreshTimeout();
              setIsGuestMode(true);
              setRooms(initialRooms);
            }
          }
        }
      }
      
      if (active) {
        setLoading(false);
      }
    };

    void initialiseAuth();

    return () => {
      active = false;
      clearAccessTokenRefreshTimeout();
    };
    // Only run once on mount - callbacks are stable via useCallback
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load data when user changes (e.g., after login)
  // This ensures data loads after login even if login function's loadHotelData call has timing issues
  useEffect(() => {
    // Skip if we're in the middle of a login flow (login function will handle it)
    // or if hotel data is already being loaded
    if (user && !isGuestMode && !hotel && !loading && !isLoggingInRef.current && !isLoadingHotelRef.current) {
      // User is set but hotel data hasn't loaded yet - load it
      loadHotelData(user);
    }
    // Stable dependencies: always 2 elements to prevent array size changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id ?? '', isGuestMode]);

  const setBusinessModel = (model: BusinessModel | null) => {
    setBusinessModelState(model);
  };

  // Helper function to handle API errors, including rate limiting
  const handleApiError = useCallback(async (error: unknown, defaultMessage?: string) => {
    if (error instanceof ApiClientError) {
      if (error.statusCode === 429) {
        const { handleRateLimitError } = await import('../utils/rateLimitHandler');
        handleRateLimitError(error);
        return true; // Error was handled
      } else {
        toast.error(error.message || defaultMessage || 'An error occurred');
        return true; // Error was handled
      }
    }
    return false; // Not an ApiClientError
  }, []);

  const refreshData = useCallback(async () => {
    if (!hotel || isGuestMode) return;
    try {
      const [hotelData, roomsData, paymentsData, buildings, staff] = await Promise.all([
        hotelApi.get(),
        roomApi.getAll(hotel.id),
        paymentApi.getAllPaginated(hotel.id),
        buildingApi.getAll(hotel.id),
        staffApi.getAll(hotel.id),
      ]);

      if (hotelData) {
        hotelData.buildings = buildings;
        hotelData.staff = staff;
        setHotel(hotelData);
      }
      setRooms(roomsData);
      setPayments(paymentsData);
    } catch (error) {
      console.error('Failed to refresh data:', error);
      await handleApiError(error, 'Failed to refresh data');
    }
  }, [hotel, isGuestMode]);

  const setupHotel = async (hotelName: string, adminEmail: string, adminName: string, model: BusinessModel) => {
    if (isGuestMode) {
      // Legacy localStorage mode
    const features = getFeatures(model);
    const buildings = features.multiBuilding
      ? [
            { id: 'building-1', name: 'Tòa A', description: 'Tòa chính', order: 1 },
            { id: 'building-2', name: 'Tòa B', description: 'Tòa phụ', order: 2 },
          ]
        : [{ id: 'building-1', name: 'Tòa chính', description: 'Tòa chính', order: 1 }];

    const newHotel: Hotel = {
      id: Date.now().toString(),
      name: hotelName,
      adminEmail,
      businessModel: model,
      buildings,
        staff: [],
    };
    
    const newUser: User = {
      id: Date.now().toString(),
      email: adminEmail,
      name: adminName,
      role: 'admin',
      hotelId: newHotel.id,
      hotelName: newHotel.name,
    };
    
    setHotel(newHotel);
    setUser(newUser);
    setBusinessModelState(model);
      return;
    }

    // API mode - create hotel
    try {
      const hotelData = await hotelApi.create({
        name: hotelName,
        adminEmail,
      });

      // Create default building
      const building = await buildingApi.create({
        hotelId: hotelData.id,
        name: 'Tòa chính',
        description: 'Tòa chính',
        displayOrder: 1,
      });

      hotelData.buildings = [building];
      hotelData.staff = [];

      setHotel(hotelData);
      setBusinessModelState(model);
      
      // Hotel and building are already set, just initialize empty arrays
      setRooms([]);
      setPayments([]);
      
      // No need to refresh - we already have all the data
    } catch (error) {
      const handled = await handleApiError(error, 'Failed to create hotel');
      if (!handled && !(error instanceof ApiClientError)) {
        toast.error('Failed to create hotel');
      }
      if (!handled) {
        throw error;
      }
    }
  };

  const login = async (username: string, password: string) => {
    if (isGuestMode && hotel) {
      // Legacy mode
      if (username === hotel.adminEmail) {
        setUser({
          id: Date.now().toString(),
          email: username,
          name: 'Admin',
          role: 'admin',
          hotelId: hotel.id,
          hotelName: hotel.name,
        });
        return;
      }
      const staff = hotel.staff.find(s => s.email === username);
      if (staff) {
        setUser({
          id: staff.id,
          email: staff.email,
          name: staff.name,
          role: staff.role,
          hotelId: hotel.id,
          hotelName: hotel.name,
        });
      }
      return;
    }

    // Prevent concurrent login attempts
    if (isLoggingInRef.current) {
      console.log('Login already in progress, skipping duplicate call');
      return;
    }

    // API mode (following CV_Online pattern)
    isLoggingInRef.current = true;
    try {
      const { user: authUser, tokens } = await authApi.login({ username, password });
      applyAuthSuccess(authUser, tokens);
      
      // Check subscription status (following CV_Online pattern)
      await checkSubscription(tokens.accessToken);
      
      // Clear any localStorage demo data to prevent conflicts
      localStorage.removeItem('hotel-app-hotel');
      localStorage.removeItem('hotel-app-user');
      localStorage.removeItem('hotel-app-rooms');
      
      const authenticatedUser: User = {
        id: authUser.id.toString(),
        email: authUser.username,
        name: authUser.fullName,
        role: 'admin',
        hotelId: '',
        hotelName: '',
      };
      // Pass user directly to avoid state timing issues
      await loadHotelData(authenticatedUser);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      toast.error(message);
      throw error;
    } finally {
      isLoggingInRef.current = false;
    }
  };

  const signInWithGoogle = async (idToken: string) => {
    // Prevent concurrent Google sign-in attempts
    if (isLoggingInRef.current) {
      console.log('Login already in progress, skipping duplicate call');
      return;
    }

    // API mode only (following CV_Online pattern)
    isLoggingInRef.current = true;
    try {
      // Set loading to true BEFORE applyAuthSuccess to prevent useEffect from triggering
      setLoading(true);
      const { user: authUser, tokens } = await authApi.googleAuth({ idToken });
      applyAuthSuccess(authUser, tokens);
      
      // Check subscription status (following CV_Online pattern)
      await checkSubscription(tokens.accessToken);
      
      // Clear any localStorage demo data to prevent conflicts
      localStorage.removeItem('hotel-app-hotel');
      localStorage.removeItem('hotel-app-user');
      localStorage.removeItem('hotel-app-rooms');
      
      const authenticatedUser: User = {
        id: authUser.id.toString(),
        email: authUser.username,
        name: authUser.fullName,
        role: 'admin',
        hotelId: '',
        hotelName: '',
      };
      // Pass user directly to avoid state timing issues
      // loadHotelData will set loading to false when done
      await loadHotelData(authenticatedUser);
      toast.success('Signed in with Google successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Google sign-in failed';
      toast.error(message);
      setLoading(false); // Ensure loading is reset on error
      throw error;
    } finally {
      isLoggingInRef.current = false;
    }
  };

  const signInWithFacebook = async (accessToken: string) => {
    if (isLoggingInRef.current) {
      return;
    }

    isLoggingInRef.current = true;
    try {
      setLoading(true);
      const { user: authUser, tokens } = await authApi.facebookAuth({ accessToken });
      applyAuthSuccess(authUser, tokens);
      
      await checkSubscription(tokens.accessToken);
      
      localStorage.removeItem('hotel-app-hotel');
      localStorage.removeItem('hotel-app-user');
      localStorage.removeItem('hotel-app-rooms');
      
      const authenticatedUser: User = {
        id: authUser.id.toString(),
        email: authUser.username,
        name: authUser.fullName,
        role: 'admin',
        hotelId: '',
        hotelName: '',
      };
      await loadHotelData(authenticatedUser);
      toast.success('Signed in with Facebook successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Facebook sign-in failed';
      toast.error(message);
      setLoading(false);
      throw error;
    } finally {
      isLoggingInRef.current = false;
    }
  };

  const signInWithApple = async (idToken: string) => {
    if (isLoggingInRef.current) {
      return;
    }

    isLoggingInRef.current = true;
    try {
      setLoading(true);
      const { user: authUser, tokens } = await authApi.appleAuth({ idToken });
      applyAuthSuccess(authUser, tokens);
      
      await checkSubscription(tokens.accessToken);
      
      localStorage.removeItem('hotel-app-hotel');
      localStorage.removeItem('hotel-app-user');
      localStorage.removeItem('hotel-app-rooms');
      
      const authenticatedUser: User = {
        id: authUser.id.toString(),
        email: authUser.username,
        name: authUser.fullName,
        role: 'admin',
        hotelId: '',
        hotelName: '',
      };
      await loadHotelData(authenticatedUser);
      toast.success('Signed in with Apple successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Apple sign-in failed';
      toast.error(message);
      setLoading(false);
      throw error;
    } finally {
      isLoggingInRef.current = false;
    }
  };

  const logout = async () => {
    const activeRefreshToken = refreshTokenRef.current;
    if (activeRefreshToken && !isGuestMode) {
      try {
        await authApi.logout(activeRefreshToken);
      } catch (error) {
        // Continue with logout even if API call fails
      }
    }
    clearAccessTokenRefreshTimeout();
    clearAuthState();
    setUser(null);
    setHotel(null);
    setRooms([]);
    setPayments([]);
    setAccessToken(null);
    setAccessTokenExpiry(null);
    refreshTokenRef.current = null;
    setSubscription(null);
    setIsPremium(false);
    setIsGuestMode(true);
  };

  const updateRoom = async (roomId: string, updates: Partial<Room>) => {
    if (isGuestMode) {
      setRooms(prev => prev.map(room => 
        room.id === roomId ? { ...room, ...updates } : room
      ));
      return;
    }

    try {
      // Map frontend Room fields to API format
      const apiUpdates: any = { ...updates };
      if ('type' in updates && updates.type !== undefined) {
        apiUpdates.roomType = updates.type;
        delete apiUpdates.type;
      }
      // Map 'number' to 'roomNumber' if present
      if ('number' in updates && updates.number !== undefined) {
        apiUpdates.roomNumber = updates.number;
        delete apiUpdates.number;
      }
      
      // Use the returned room data instead of fetching everything
      const updatedRoom = await roomApi.update(roomId, apiUpdates);
      
      // Update only the specific room in local state
      setRooms(prev => prev.map(room => 
        room.id === roomId ? updatedRoom : room
      ));
      
      // No need to refresh hotels, buildings, staff, or payments - they haven't changed
    } catch (error) {
      const handled = await handleApiError(error);
      if (!handled) {
        throw error;
      }
    }
  };

  const checkIn = async (roomId: string, guestData: any) => {
    if (isGuestMode) {
    updateRoom(roomId, {
      status: 'occupied',
      guest: {
        ...guestData,
          checkedInBy: user?.email || user?.name,
      },
      booking: undefined,
    });
      return;
    }

    try {
      // Only send phone if it has a value
      const checkInPayload: any = {
        name: guestData.name,
        phone: guestData.phone?.trim() || '',
        email: guestData.email || '',
        checkInDate: guestData.checkInDate,
        checkOutDate: guestData.checkOutDate,
        totalAmount: guestData.totalAmount,
        isHourly: guestData.isHourly || false,
        checkedInBy: user?.name || user?.email,
      };
      
      if (guestData.services) checkInPayload.services = guestData.services;
      if (guestData.incidentalCharges) checkInPayload.incidentalCharges = guestData.incidentalCharges;
      
      // Use the returned room data instead of fetching everything
      const updatedRoom = await roomApi.checkIn(roomId, checkInPayload);
      
      // Verify the room was actually updated
      if (!updatedRoom) {
        throw new Error('Check-in failed: No room data returned');
      }
      
      if (!updatedRoom.guest) {
        throw new Error('Check-in failed: Guest data not found in response');
      }
      
      if (updatedRoom.status !== 'occupied') {
        throw new Error('Check-in failed: Room status not updated to occupied');
      }
      
      // Update only the specific room in local state
      setRooms(prev => prev.map(room => 
        room.id === roomId ? updatedRoom : room
      ));
      
      // No need to refresh hotels, buildings, or staff - they haven't changed
    } catch (error) {
      console.error('Check-in error:', error);
      const handled = await handleApiError(error);
      if (!handled) {
        throw error;
      }
    }
  };

  const checkOut = async (roomId: string) => {
    if (isGuestMode) {
    updateRoom(roomId, {
      status: 'vacant-dirty',
      guest: undefined,
    });
      return;
    }

    try {
      // Use the returned room data instead of fetching everything
      const updatedRoom = await roomApi.checkOut(roomId);
      
      // Update only the specific room in local state
      setRooms(prev => prev.map(room => 
        room.id === roomId ? updatedRoom : room
      ));
      
      // No need to refresh hotels, buildings, or staff - they haven't changed
      // Payments are created separately via addPayment, so no need to refresh here
    } catch (error) {
      const handled = await handleApiError(error);
      if (!handled) {
        throw error;
      }
    }
  };

  const markRoomCleaned = async (roomId: string) => {
    if (isGuestMode) {
      updateRoom(roomId, { status: 'vacant-clean' });
      return;
    }

    try {
      // Use the returned room data instead of fetching everything
      const updatedRoom = await roomApi.markCleaned(roomId);
      
      // Update only the specific room in local state
      setRooms(prev => prev.map(room => 
        room.id === roomId ? updatedRoom : room
      ));
      
      // No need to refresh hotels, buildings, staff, or payments - they haven't changed
    } catch (error) {
      const handled = await handleApiError(error);
      if (!handled) {
        throw error;
      }
    }
  };

  const addStaff = async (email: string, name: string, role: 'receptionist' | 'housekeeping') => {
    if (!hotel) return;
    
    if (isGuestMode) {
      const newStaff = { id: Date.now().toString(), email, name, role };
      setHotel({ ...hotel, staff: [...hotel.staff, newStaff] });
      return;
    }

    try {
      // Use the returned staff data instead of fetching everything
      const newStaff = await staffApi.create({ hotelId: hotel.id, email, name, role });
      
      // Add the new staff to local state
      setHotel(prev => prev ? {
        ...prev,
        staff: [...prev.staff, newStaff]
      } : null);
      
      // No need to refresh hotels, buildings, rooms, or payments - they haven't changed
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message);
      }
      throw error;
    }
  };

  const addPayment = async (payment: Payment, roomId?: string) => {
    if (isGuestMode) {
      setPayments(prev => [payment, ...prev]);
      return;
    }

    if (!hotel) return;

    try {
      // Try to use local state first - it should be fresh after check-in
      let room: Room | undefined;
      if (roomId) {
        // First try to find room in local state
        room = rooms.find(r => r.id === roomId);
        
        // Only fetch from backend if:
        // 1. Room not found in local state, OR
        // 2. Room found but doesn't have guest data (might be stale)
        if (!room || !room.guest) {
          room = await roomApi.get(roomId);
          // Update local state with fetched room if it was missing
          if (!rooms.find(r => r.id === roomId)) {
            setRooms(prev => [...prev, room!]);
          } else if (room.guest) {
            // Update existing room in local state with fresh guest data
            setRooms(prev => prev.map(r => r.id === roomId ? room! : r));
          }
        }
      } else {
        // Fallback: find by room number from local state if roomId not provided
        // Backend will validate the room belongs to the hotel anyway
        room = rooms.find(r => r.number === payment.roomNumber);
        if (!room) {
          toast.error('Room not found');
          return;
        }
      }

      // Use room.guest.isHourly if available, otherwise use simplified calculation
      const isHourly = room.guest?.isHourly ?? 
        (payment.roomCharge > 0 && payment.checkInDate !== payment.checkOutDate ? false : true);

      // Use the returned payment data instead of fetching everything
      const createdPayment = await paymentApi.create({
        hotelId: hotel.id,
        roomId: room.id,
        roomNumber: payment.roomNumber,
        guestName: payment.guestName,
        checkInDate: payment.checkInDate,
        checkOutDate: payment.checkOutDate,
        roomCharge: payment.roomCharge,
        isHourly: isHourly,
        services: payment.services,
        incidentalCharges: payment.incidentalCharges,
        subtotal: payment.subtotal,
        vat: payment.vat,
        total: payment.total,
        paymentMethod: payment.paymentMethod,
        documentType: payment.documentType,
        companyName: payment.companyName,
        companyTaxCode: payment.companyTaxCode,
        companyAddress: payment.companyAddress,
        processedBy: payment.processedBy,
      });
      
      // Add the new payment to local state (prepend since it's the most recent)
      setPayments(prev => [createdPayment, ...prev]);
      
      // No need to refresh hotels, buildings, staff, or rooms - they haven't changed
    } catch (error) {
      const handled = await handleApiError(error);
      if (!handled) {
        throw error;
      }
    }
  };

  const clearPaymentsByPeriod = async (period: 'today' | 'month' | 'year' | 'all') => {
    if (isGuestMode) {
      const now = new Date();
      let filteredPayments = payments;

      switch (period) {
        case 'today':
          const today = now.toISOString().split('T')[0];
          filteredPayments = payments.filter(p => {
            const paymentDate = p.timestamp || p.checkInDate;
            return !paymentDate.startsWith(today);
          });
          break;
        case 'month':
          const currentMonth = now.toISOString().slice(0, 7);
          filteredPayments = payments.filter(p => {
            const paymentDate = p.timestamp || p.checkInDate;
            return !paymentDate.startsWith(currentMonth);
          });
          break;
        case 'year':
          const currentYear = now.getFullYear().toString();
          filteredPayments = payments.filter(p => {
            const paymentDate = p.timestamp || p.checkInDate;
            return !paymentDate.startsWith(currentYear);
          });
          break;
        case 'all':
          filteredPayments = [];
          break;
      }
      setPayments(filteredPayments);
      toast.success(`Đã xóa ${payments.length - filteredPayments.length} bản ghi thanh toán`);
      return;
    }

    if (!hotel) return;

    try {
      const deletedCount = await paymentApi.deleteByPeriod(hotel.id, period);
      
      // Filter payments locally based on period instead of fetching everything
      const now = new Date();
      let filteredPayments = payments;
      
      switch (period) {
        case 'today':
          const today = now.toISOString().split('T')[0];
          filteredPayments = payments.filter(p => {
            const paymentDate = p.timestamp || p.checkInDate;
            return !paymentDate.startsWith(today);
          });
          break;
        case 'month':
          const currentMonth = now.toISOString().slice(0, 7);
          filteredPayments = payments.filter(p => {
            const paymentDate = p.timestamp || p.checkInDate;
            return !paymentDate.startsWith(currentMonth);
          });
          break;
        case 'year':
          const currentYear = now.getFullYear().toString();
          filteredPayments = payments.filter(p => {
            const paymentDate = p.timestamp || p.checkInDate;
            return !paymentDate.startsWith(currentYear);
          });
          break;
        case 'all':
          filteredPayments = [];
          break;
      }
      
      setPayments(filteredPayments);
      toast.success(`Đã xóa ${deletedCount} bản ghi thanh toán`);
      
      // No need to refresh hotels, buildings, staff, or rooms - they haven't changed
    } catch (error) {
      const handled = await handleApiError(error);
      if (!handled) {
        throw error;
      }
    }
  };

  const addRoom = async (room: Room) => {
    if (isGuestMode) {
    setRooms(prev => [...prev, room]);
      return;
    }

    if (!hotel) {
      toast.error('Hotel not found');
      return;
    }

    if (!room.buildingId) {
      toast.error('Building ID is required');
      return;
    }

    try {
      // Ensure hotel.id and buildingId are valid
      const hotelId = hotel.id;
      const buildingId = room.buildingId;
      
      if (!hotelId || !buildingId) {
        toast.error('Hotel ID and Building ID are required');
        return;
      }

      // Use the returned room data instead of fetching everything
      const createdRoom = await roomApi.create({
        hotelId: hotelId,
        buildingId: buildingId,
        roomNumber: room.number,
        floor: room.floor,
        roomType: room.type,
        price: room.price,
        hourlyRate: room.hourlyRate,
        status: room.status,
      });
      
      // Add the new room to local state
      setRooms(prev => [...prev, createdRoom]);
      
      // No need to refresh hotels, buildings, staff, or payments - they haven't changed
    } catch (error) {
      if (error instanceof ApiClientError && error.statusCode === 404) {
        toast.error('Hotel or building not found. Please refresh the page.');
      } else {
        const handled = await handleApiError(error, 'Failed to create room');
        if (!handled && !(error instanceof ApiClientError)) {
          toast.error('Failed to create room');
        }
      }
      if (!(error instanceof ApiClientError && error.statusCode === 404)) {
        throw error;
      }
    }
  };

  const deleteRoom = async (roomId: string) => {
    if (isGuestMode) {
      setRooms(prev => prev.filter(r => r.id !== roomId));
      return;
    }

    try {
      await roomApi.delete(roomId);
      
      // Remove the room from local state
      setRooms(prev => prev.filter(r => r.id !== roomId));
      
      // No need to refresh hotels, buildings, staff, or payments - they haven't changed
    } catch (error) {
      const handled = await handleApiError(error);
      if (!handled) {
        throw error;
      }
    }
  };

  const deleteFloor = async (floor: number, buildingId?: string) => {
    if (isGuestMode) {
      setRooms(prev => prev.filter(r => {
      if (r.floor !== floor) return true;
      if (buildingId && r.buildingId !== buildingId) return true;
      return false;
    }));
      return;
    }

    // In API mode, delete rooms individually
    const roomsToDelete = rooms.filter(r => {
      if (r.floor !== floor) return false;
      if (buildingId && r.buildingId !== buildingId) return false;
      return true;
    });

    const roomIdsToDelete = roomsToDelete.map(r => r.id);

    for (const room of roomsToDelete) {
      try {
        await roomApi.delete(room.id);
      } catch (error) {
        console.error(`Failed to delete room ${room.id}:`, error);
      }
    }
    
    // Remove deleted rooms from local state
    setRooms(prev => prev.filter(r => !roomIdsToDelete.includes(r.id)));
    
    // No need to refresh hotels, buildings, staff, or payments - they haven't changed
  };

  const bulkUpdateRoomPrices = async (roomIds: string[], price: number) => {
    if (isGuestMode) {
    setRooms(prev => prev.map(room => 
      roomIds.includes(room.id) ? { ...room, price } : room
    ));
      return;
    }

    // Update rooms individually and collect successfully updated rooms
    const updatedRooms: Room[] = [];
    for (const roomId of roomIds) {
      try {
        const updatedRoom = await roomApi.update(roomId, { price });
        updatedRooms.push(updatedRoom);
      } catch (error) {
        console.error(`Failed to update room ${roomId}:`, error);
      }
    }
    
    // Update local state with all successfully updated rooms
    setRooms(prev => prev.map(room => {
      const updated = updatedRooms.find(u => u.id === room.id);
      return updated || room;
    }));
    
    // No need to refresh hotels, buildings, staff, or payments - they haven't changed
  };

  const updateHotelInfo = async (name: string, address: string, taxCode?: string, phoneNumber?: string, email?: string) => {
    if (!hotel) return;

    if (isGuestMode) {
      setHotel({ ...hotel, name, address, taxCode, phoneNumber, email });
      return;
    }

    try {
      const updated = await hotelApi.update(hotel.id, { name, address, taxCode, phoneNumber, email });
      setHotel(updated);
    } catch (error) {
      const handled = await handleApiError(error);
      if (!handled) {
        throw error;
      }
    }
  };

  const updateBankAccount = async (bankAccount: { bankName: string; bankCode: string; accountNumber: string; accountHolder: string }) => {
    if (!hotel) return;

    if (isGuestMode) {
      setHotel({ ...hotel, bankAccount });
      return;
    }

    try {
      const updated = await hotelApi.update(hotel.id, {
        bankName: bankAccount.bankName,
        bankCode: bankAccount.bankCode,
        accountNumber: bankAccount.accountNumber,
        accountHolder: bankAccount.accountHolder,
      });
      setHotel(updated);
    } catch (error) {
      const handled = await handleApiError(error);
      if (!handled) {
        throw error;
      }
    }
  };

  const addBuilding = async (building: Building) => {
    if (!hotel) return;

    if (isGuestMode) {
      setHotel({ ...hotel, buildings: [...hotel.buildings, building] });
      return;
    }

    try {
      const newBuilding = await buildingApi.create({
        hotelId: hotel.id,
        name: building.name,
        description: building.description,
        displayOrder: building.order,
      });
      setHotel({ ...hotel, buildings: [...hotel.buildings, newBuilding] });
    } catch (error) {
      const handled = await handleApiError(error);
      if (!handled) {
        throw error;
      }
    }
  };

  const updateBuilding = async (buildingId: string, updates: Partial<Building>) => {
    if (!hotel) return;

    if (isGuestMode) {
    setHotel({
      ...hotel,
      buildings: hotel.buildings.map(b =>
        b.id === buildingId ? { ...b, ...updates } : b
      ),
    });
      return;
    }

    try {
      const updated = await buildingApi.update(buildingId, {
        name: updates.name,
        description: updates.description,
        displayOrder: updates.order,
      });
      setHotel({
        ...hotel,
        buildings: hotel.buildings.map(b => b.id === buildingId ? updated : b),
      });
    } catch (error) {
      const handled = await handleApiError(error);
      if (!handled) {
        throw error;
      }
    }
  };

  const deleteBuilding = async (buildingId: string) => {
    if (!hotel) return;
    
    if (isGuestMode) {
    const hasRooms = rooms.some(r => r.buildingId === buildingId);
    if (hasRooms) {
        toast.error('Không thể xóa tòa nhà đang có phòng. Vui lòng xóa hoặc chuyển phòng sang tòa khác trước.');
      return;
    }
    setHotel({
      ...hotel,
      buildings: hotel.buildings.filter(b => b.id !== buildingId),
    });
      return;
    }

    try {
      await buildingApi.delete(buildingId);
      
      // Remove the building from local state
      setHotel(prev => prev ? {
        ...prev,
        buildings: prev.buildings.filter(b => b.id !== buildingId)
      } : null);
      
      // No need to refresh hotels, rooms, staff, or payments - only buildings changed
    } catch (error) {
      const handled = await handleApiError(error);
      if (!handled) {
        throw error;
      }
    }
  };

  return (
    <AppContext.Provider
      value={{
        user,
        hotel,
        rooms,
        payments,
        businessModel,
        loading,
        subscription,
        isPremium,
        setBusinessModel,
        login,
        signInWithGoogle,
        signInWithFacebook,
        signInWithApple,
        logout,
        refreshSubscription,
        updateRoom,
        checkIn,
        checkOut,
        markRoomCleaned,
        addStaff,
        setupHotel,
        updateHotelInfo,
        updateBankAccount,
        addPayment,
        clearPaymentsByPeriod,
        addRoom,
        deleteRoom,
        deleteFloor,
        bulkUpdateRoomPrices,
        addBuilding,
        updateBuilding,
        deleteBuilding,
        refreshData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
