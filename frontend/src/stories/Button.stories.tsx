import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../../components/ui/Button';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'A versatile button component with multiple variants, sizes, and states.',
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['solid', 'outline', 'ghost', 'link'],
      description: 'Visual style variant',
    },
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
      description: 'Size of the button',
    },
    color: {
      control: 'select',
      options: ['primary', 'secondary', 'success', 'warning', 'error', 'info'],
      description: 'Color scheme',
    },
    isLoading: {
      control: 'boolean',
      description: 'Show loading spinner',
    },
    isDisabled: {
      control: 'boolean',
      description: 'Disable the button',
    },
    isFullWidth: {
      control: 'boolean',
      description: 'Full width button',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    variant: 'solid',
    color: 'primary',
    children: 'Primary Button',
    size: 'md',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'solid',
    color: 'secondary',
    children: 'Secondary Button',
    size: 'md',
  },
};

export const Outline: Story = {
  args: {
    variant: 'outline',
    color: 'primary',
    children: 'Outline Button',
    size: 'md',
  },
};

export const Ghost: Story = {
  args: {
    variant: 'ghost',
    color: 'primary',
    children: 'Ghost Button',
    size: 'md',
  },
};

export const Loading: Story = {
  args: {
    variant: 'solid',
    color: 'primary',
    children: 'Loading Button',
    size: 'md',
    isLoading: true,
    loadingText: 'Loading...',
  },
};

export const Disabled: Story = {
  args: {
    variant: 'solid',
    color: 'primary',
    children: 'Disabled Button',
    size: 'md',
    isDisabled: true,
  },
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
      <Button size="xs">Extra Small</Button>
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
      <Button size="xl">Extra Large</Button>
    </div>
  ),
};

export const Colors: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
      <Button color="primary">Primary</Button>
      <Button color="secondary">Secondary</Button>
      <Button color="success">Success</Button>
      <Button color="warning">Warning</Button>
      <Button color="error">Error</Button>
      <Button color="info">Info</Button>
    </div>
  ),
};

export const WithIcons: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '10px' }}>
      <Button leftIcon="🎉">With Left Icon</Button>
      <Button rightIcon="→">With Right Icon</Button>
    </div>
  ),
};

export const FullWidth: Story = {
  args: {
    variant: 'solid',
    color: 'primary',
    children: 'Full Width Button',
    size: 'md',
    isFullWidth: true,
  },
};
