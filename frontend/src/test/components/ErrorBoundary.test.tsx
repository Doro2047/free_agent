import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';
import { Button, Heart, AlertCircle } from 'lucide-react';

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  const ThrowError = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
    if (shouldThrow) {
      throw new Error('Test error');
    }
    return <div>正常内容</div>;
  };

  it('应渲染子组件当没有错误时', () => {
    render(
      <ErrorBoundary>
        <div>测试内容</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('测试内容')).toBeInTheDocument();
  });

  it('应在错误发生时显示错误信息', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow />
      </ErrorBoundary>
    );

    expect(screen.getByText('出错了')).toBeInTheDocument();
    expect(screen.getByText('应用遇到了一些问题，请尝试刷新页面或返回首页')).toBeInTheDocument();
  });

  it('应提供重试按钮', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow />
      </ErrorBoundary>
    );

    const retryButton = screen.getByRole('button', { name: /重试/i });
    expect(retryButton).toBeInTheDocument();
  });

  it('应提供返回首页按钮', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow />
      </ErrorBoundary>
    );

    const homeButton = screen.getByRole('button', { name: /返回首页/i });
    expect(homeButton).toBeInTheDocument();
  });

  it('应在点击重试后恢复正常渲染', async () => {
    const { container } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow />
      </ErrorBoundary>
    );

    const retryButton = screen.getByRole('button', { name: /重试/i });
    fireEvent.click(retryButton);

    expect(screen.queryByText('出错了')).not.toBeInTheDocument();
  });

  it('应使用自定义 fallback 组件', () => {
    const CustomFallback = () => <div>自定义错误页面</div>;

    render(
      <ErrorBoundary fallback={<CustomFallback />}>
        <ThrowError shouldThrow />
      </ErrorBoundary>
    );

    expect(screen.getByText('自定义错误页面')).toBeInTheDocument();
  });

  it('应在组件卸载后调用 onError 回调', () => {
    const handleError = vi.fn();

    render(
      <ErrorBoundary onError={handleError}>
        <ThrowError shouldThrow />
      </ErrorBoundary>
    );

    expect(handleError).toHaveBeenCalled();
    const errorArg = handleError.mock.calls[0][0];
    expect(errorArg).toBeInstanceOf(Error);
    expect(errorArg.message).toBe('Test error');
  });
});
