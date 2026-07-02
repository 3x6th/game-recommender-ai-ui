import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuthContext } from './AuthContext';
import { AuthSession, UserProfile, authApi, usersApi } from '../services/api';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function session(steamId: string): AuthSession {
  return {
    accessToken: `token-${steamId}`,
    accessExpiresIn: 3600,
    role: 'USER',
    sessionId: `session-${steamId}`,
    steamId,
  };
}

function profile(steamId: string): UserProfile {
  return {
    steamId,
    avatarUrl: `https://cdn.example/${steamId}.jpg`,
    profileUrl: `https://steamcommunity.com/profiles/${steamId}`,
  };
}

function Harness() {
  const { authData, userProfile, login, logout } = useAuthContext();

  return (
    <>
      <button onClick={() => login(session('111'))}>Login A</button>
      <button onClick={() => login(session('222'))}>Login B</button>
      <button onClick={logout}>Logout</button>
      <output data-testid="steam-id">{authData?.steamId ?? 'guest'}</output>
      <output data-testid="profile-id">{userProfile?.steamId ?? 'none'}</output>
    </>
  );
}

describe('AuthProvider user profile', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
    vi.spyOn(authApi, 'refresh').mockImplementation(() => new Promise(() => {}));
    vi.spyOn(authApi, 'preAuthorize').mockResolvedValue({
      accessToken: 'guest-token',
      accessExpiresIn: 3600,
      role: 'GUEST',
      sessionId: 'guest-session',
    });
  });

  it('loads the profile after an authenticated Steam session appears', async () => {
    vi.spyOn(usersApi, 'getMe').mockResolvedValue(profile('111'));

    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Login A' }));

    await waitFor(() => expect(usersApi.getMe).toHaveBeenCalledOnce());
    expect(await screen.findByText('111', { selector: '[data-testid="profile-id"]' })).toBeInTheDocument();
  });

  it('clears the profile on logout and ignores the old request response', async () => {
    const oldRequest = deferred<UserProfile>();
    vi.spyOn(usersApi, 'getMe').mockReturnValue(oldRequest.promise);

    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Login A' }));
    await waitFor(() => expect(usersApi.getMe).toHaveBeenCalledOnce());
    fireEvent.click(screen.getByRole('button', { name: 'Logout' }));

    expect(screen.getByTestId('profile-id')).toHaveTextContent('none');

    await act(async () => {
      oldRequest.resolve(profile('111'));
      await oldRequest.promise;
    });

    expect(screen.getByTestId('steam-id')).toHaveTextContent('guest');
    expect(screen.getByTestId('profile-id')).toHaveTextContent('none');
  });

  it('keeps the new account profile when the old request finishes later', async () => {
    const oldRequest = deferred<UserProfile>();
    const newRequest = deferred<UserProfile>();
    vi.spyOn(usersApi, 'getMe')
      .mockReturnValueOnce(oldRequest.promise)
      .mockReturnValueOnce(newRequest.promise);

    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Login A' }));
    await waitFor(() => expect(usersApi.getMe).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: 'Login B' }));
    await waitFor(() => expect(usersApi.getMe).toHaveBeenCalledTimes(2));

    await act(async () => {
      newRequest.resolve(profile('222'));
      await newRequest.promise;
    });
    expect(screen.getByTestId('profile-id')).toHaveTextContent('222');

    await act(async () => {
      oldRequest.resolve(profile('111'));
      await oldRequest.promise;
    });
    expect(screen.getByTestId('steam-id')).toHaveTextContent('222');
    expect(screen.getByTestId('profile-id')).toHaveTextContent('222');
  });
});
