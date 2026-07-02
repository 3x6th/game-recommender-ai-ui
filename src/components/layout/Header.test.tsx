import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SteamAvatar } from '../SteamAvatar';

describe('SteamAvatar', () => {
  it('renders an accessible Steam avatar', () => {
    render(<SteamAvatar avatarUrl="https://cdn.example/avatar.jpg" steamId="76561198000000000" />);

    expect(screen.getByRole('img', { name: 'Steam avatar for 76561198000000000' })).toHaveAttribute(
      'src',
      'https://cdn.example/avatar.jpg',
    );
  });

  it('renders a stable fallback when the URL is absent', () => {
    render(<SteamAvatar avatarUrl={null} steamId="76561198000000000" />);

    expect(screen.getByRole('img', { name: 'Steam avatar fallback' })).toBeInTheDocument();
  });

  it('replaces a broken image with the fallback', () => {
    render(<SteamAvatar avatarUrl="https://cdn.example/broken.jpg" steamId="76561198000000000" />);

    fireEvent.error(screen.getByRole('img', { name: 'Steam avatar for 76561198000000000' }));

    expect(screen.queryByAltText('Steam avatar for 76561198000000000')).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Steam avatar fallback' })).toBeInTheDocument();
  });
});
