import type { Manager } from '@storybook/manager-api';
import type { Addon } from '@storybook/types';

export * from './constants';
export * from './functions';
export * from './types';

export interface Theme {
  name: string;
  colorPrimary?: string;
  colorSecondary?: string;
  appBg?: string;
  appContentBg?: string;
  appPreviewBg?: string;
  appBorderColor?: string;
  appBorderRadius?: number;
  fontBase?: string;
  fontCode?: string;
  textColor?: string;
  textInverseColor?: string;
  barTextColor?: string;
  barSelectedColor?: string;
  barBg?: string;
  inputBg?: string;
  inputBorder?: string;
  inputTextColor?: string;
  inputBorderRadius?: number;
  brandTitle?: string;
  brandUrl?: string;
  brandTarget?: string;
}

export const addons: Addon[] = [];
export const manager: Manager = {} as Manager;

export default {
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Free Agent UI Component Library',
      },
    },
  },
};
