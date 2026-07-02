import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TextBlock } from './TextBlock';

describe('TextBlock', () => {
  it('renders supported Markdown as semantic elements', () => {
    render(
      <TextBlock
        text={'Try **Hades** and *take your time*.\n\n- Fast runs\n- Great story\n\n[Steam](https://store.steampowered.com)'}
      />,
    );

    expect(screen.getByText('Hades').tagName).toBe('STRONG');
    expect(screen.getByText('take your time').tagName).toBe('EM');
    expect(screen.getByRole('list')).toHaveClass('list-disc');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'Steam' })).toHaveAttribute(
      'href',
      'https://store.steampowered.com',
    );
    expect(screen.queryByText('**Hades**')).not.toBeInTheDocument();
  });

  it('collapses and expands a long answer without truncating its Markdown', () => {
    const longText = `**Hades**\n\n${'A thoughtful recommendation. '.repeat(30)}`;
    render(<TextBlock text={longText} />);

    const content = screen.getByTestId('text-block-content');
    const expandButton = screen.getByRole('button', { name: 'Показать ещё' });

    expect(content).toHaveClass('max-h-48', 'overflow-hidden');
    expect(expandButton).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('Hades').tagName).toBe('STRONG');

    fireEvent.click(expandButton);

    expect(content).toHaveClass('max-h-none');
    expect(content).not.toHaveClass('overflow-hidden');
    expect(screen.getByRole('button', { name: 'Свернуть' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('drops raw HTML and blocks executable URLs', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    const { container } = render(
      <TextBlock
        text={'Safe <img src=x onerror="alert(1)"> text\n\n<script>alert(2)</script>\n\n[bad](javascript:alert(3)) [good](https://example.com)'}
      />,
    );

    expect(container.querySelector('img')).not.toBeInTheDocument();
    expect(container.querySelector('script')).not.toBeInTheDocument();
    expect(screen.getByText('bad').closest('a')).not.toHaveAttribute('href');
    expect(screen.getByRole('link', { name: 'good' })).toHaveAttribute('href', 'https://example.com');
    expect(alertSpy).not.toHaveBeenCalled();

    alertSpy.mockRestore();
  });
});
