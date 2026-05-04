import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CodeEditor } from '@/components/editor/CodeEditor';
import { useFileStore } from '@/stores/fileStore';
import { useAppStore } from '@/stores/appStore';

vi.mock('@/stores/fileStore');
vi.mock('@/stores/appStore');

describe('CodeEditor', () => {
  const mockUpdateFileContent = vi.fn();
  const mockSaveFile = vi.fn();

  const mockFileStore = {
    activeFilePath: '/test/file.ts',
    openFiles: [
      {
        path: '/test/file.ts',
        content: 'const hello = "world";',
        isModified: false,
      },
    ],
    updateFileContent: mockUpdateFileContent,
    saveFile: mockSaveFile,
  };

  const mockAppStore = {
    theme: 'dark' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useFileStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
      if (typeof selector === 'function') {
        return selector(mockFileStore);
      }
      return mockFileStore;
    });
    (useAppStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
      if (typeof selector === 'function') {
        return selector(mockAppStore);
      }
      return mockAppStore;
    });
  });

  it('应显示空状态当没有活动文件时', () => {
    const emptyStore = {
      ...mockFileStore,
      activeFilePath: null,
    };
    (useFileStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(emptyStore);

    render(<CodeEditor />);

    expect(screen.getByText('选择文件以编辑')).toBeInTheDocument();
  });

  it('应显示文件信息栏当有活动文件时', () => {
    render(<CodeEditor />);

    expect(screen.getByText('file.ts')).toBeInTheDocument();
    expect(screen.getByText('typescript')).toBeInTheDocument();
  });

  it('应渲染 Monaco Editor 当有活动文件时', async () => {
    render(<CodeEditor />);

    await waitFor(() => {
      const editor = document.querySelector('.monaco-editor');
      expect(editor).toBeInTheDocument();
    });
  });

  it('应显示加载状态当编辑器正在初始化时', () => {
    render(<CodeEditor />);

    expect(screen.getByText('加载编辑器...')).toBeInTheDocument();
  });
});
