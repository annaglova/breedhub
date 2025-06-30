export interface SimpleUser {
  avatar?: string | null;
  email: string | null;
  id: string | null;
  name: string | null;
  status?: string | null;
}

/**
 * JWT токен утиліти
 * Адаптовано з Angular версії
 */
export class AuthUtils {
  /**
   * Base64 decoder
   */
  private static _b64decode(str: string): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let output = '';

    str = String(str).replace(/=+$/, '');

    if (str.length % 4 === 1) {
      throw new Error("'atob' failed: The string to be decoded is not correctly encoded.");
    }

    for (
      let bc = 0, bs: any, buffer: any, idx = 0;
      (buffer = str.charAt(idx++));
      ~buffer &&
      ((bs = bc % 4 ? bs * 64 + buffer : buffer),
      bc++ % 4)
        ? (output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6))))
        : 0
    ) {
      buffer = chars.indexOf(buffer);
    }

    return output;
  }

  /**
   * Base64 unicode decoder
   */
  private static _b64DecodeUnicode(str: any): string {
    return decodeURIComponent(
      Array.prototype.map
        .call(
          this._b64decode(str),
          (c: any) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        )
        .join('')
    );
  }

  /**
   * URL Base 64 decoder
   */
  private static _urlBase64Decode(str: string): string {
    let output = str.replace(/-/g, '+').replace(/_/g, '/');
    switch (output.length % 4) {
      case 0:
        break;
      case 2:
        output += '==';
        break;
      case 3:
        output += '=';
        break;
      default:
        throw Error('Illegal base64url string!');
    }
    return this._b64DecodeUnicode(output);
  }

  /**
   * Decode JWT token
   */
  private static _decodeToken(token: string): any {
    if (!token) {
      return null;
    }

    const parts = token.split('.');

    if (parts.length !== 3) {
      throw new Error(
        "The inspected token doesn't appear to be a JWT. Check to make sure it has three parts and see https://jwt.io for more."
      );
    }

    const decoded = this._urlBase64Decode(parts[1]);

    if (!decoded) {
      throw new Error('Cannot decode the token.');
    }

    return JSON.parse(decoded);
  }

  /**
   * Get token expiration date
   */
  private static _getTokenExpirationDate(token: string): Date | null {
    const decodedToken = this._decodeToken(token);

    if (!decodedToken || !Object.prototype.hasOwnProperty.call(decodedToken, 'exp')) {
      return null;
    }

    const date = new Date(0);
    date.setUTCSeconds(decodedToken.exp);

    return date;
  }

  /**
   * Convert decoded token to user object
   */
  private static toUser(decodedToken: any): SimpleUser {
    return {
      avatar: decodedToken.picture,
      email: decodedToken.email,
      id: decodedToken.user_id,
      name: decodedToken.name,
    };
  }

  // Public methods

  /**
   * Get token expiration date
   */
  public static getTokenExpirationDate(token: string): Date | null {
    return this._getTokenExpirationDate(token);
  }

  /**
   * Extract user from token if valid
   */
  public static getUserFromToken(token: string, offsetSeconds?: number): SimpleUser | null {
    if (!token || token === '') {
      return null;
    }

    const decodedToken = this._decodeToken(token);

    if (!Object.prototype.hasOwnProperty.call(decodedToken, 'exp')) {
      return null;
    }

    const date = new Date(0);
    date.setUTCSeconds(decodedToken.exp);

    offsetSeconds = offsetSeconds || 0;

    if (date === null) {
      return null;
    }

    // Check if the token is expired
    if (!(date.valueOf() > new Date().valueOf() + offsetSeconds * 1000)) {
      return null;
    }

    return this.toUser(decodedToken);
  }

  /**
   * Check if token is expired
   */
  static isTokenExpired(token: string, offsetSeconds?: number): boolean {
    if (!token || token === '') {
      return true;
    }

    const date = this._getTokenExpirationDate(token);

    offsetSeconds = offsetSeconds || 0;

    if (date === null) {
      return true;
    }

    return !(date.valueOf() > new Date().valueOf() + offsetSeconds * 1000);
  }
}