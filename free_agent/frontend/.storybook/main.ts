import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-a11y',
    '@storybook/addon-interactions',
    '@storybook/addon-themes',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
  viteFinal: async (config) => {
    return {
      ...config,
      resolve: {
        ...config.resolve,
        alias: {
          ...config.resolve?.alias,
          '@': '/src',
          '@components': '/src/components',
          '@hooks': '/src/hooks',
          '@stores': '/src/stores',
          '@utils': '/src/utils',
          '@types': '/src/types',
          '@theme': '/src/theme',
          '@i18n': '/src/i18n',
          '@api': '/src/api',
          '@a11y': '/src/a11y',
        },
      },
    };
  },
};

export default config;
