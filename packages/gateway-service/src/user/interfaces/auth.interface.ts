import { Observable } from 'rxjs';

export interface AuthServiceClient {
  ValidateUser(data: { username: string; password: string }): Observable<{
    success: boolean;
    message: string;
    access_token: string;
  }>;
}
