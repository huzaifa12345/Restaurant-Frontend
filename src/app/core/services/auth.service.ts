import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, LoginRequest } from '../models/api.models';

const ACCESS_TOKEN_KEY = 'rms_access_token';
const REFRESH_TOKEN_KEY = 'rms_refresh_token';
const AUTH_USER_KEY = 'rms_auth_user';

interface StoredAuthUser {
  userId: string;
  restaurantId: string;
  restaurantName: string;
  username: string;
  roleName: string;
  permissions: string[];
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly session = signal<StoredAuthUser | null>(this.readStoredUser());
  private readonly token = signal<string | null>(localStorage.getItem(ACCESS_TOKEN_KEY));

  readonly currentUser = this.session.asReadonly();
  readonly isAuthenticated = computed(() => !!this.token() && !!this.session());
  readonly permissions = computed(() => this.session()?.permissions ?? []);

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router
  ) {}

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, request).pipe(
      tap(response => this.persistSession(response))
    );
  }

  refreshToken(): Observable<AuthResponse> {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/refresh-token`, { refreshToken })
      .pipe(tap(response => this.persistSession(response)));
  }

  logout(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    this.token.set(null);
    this.session.set(null);
    void this.router.navigate(['/login']);
  }

  getAccessToken(): string | null {
    return this.token();
  }

  hasPermission(permission: string): boolean {
    return this.permissions().includes(permission);
  }

  hasAnyPermission(permissions: string[]): boolean {
    return permissions.some(p => this.hasPermission(p));
  }

  private persistSession(response: AuthResponse): void {
    const user: StoredAuthUser = {
      userId: response.userId,
      restaurantId: response.restaurantId,
      restaurantName: response.restaurantName,
      username: response.username,
      roleName: response.roleName,
      permissions: response.permissions ?? []
    };

    localStorage.setItem(ACCESS_TOKEN_KEY, response.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    this.token.set(response.accessToken);
    this.session.set(user);
  }

  private readStoredUser(): StoredAuthUser | null {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as StoredAuthUser;
    } catch {
      return null;
    }
  }
}
