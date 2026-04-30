import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from '../../components/ui/Badge';

const meta: Meta<typeof Badge> = {
  title: 'UI/Badge',
  component: Badge,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'A badge component for labeling and status indicators.',
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['solid', 'subtle', 'outline'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    colorScheme: {
      control: 'select',
      options: ['gray', 'red', 'orange', 'yellow', 'green', 'teal', 'blue', 'cyan', 'purple', 'pink'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = {
  args: {
    children: 'Badge',
  },
};

export const Colors: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      <Badge colorScheme="gray">Gray</Badge>
      <Badge colorScheme="red">Red</Badge>
      <Badge colorScheme="orange">Orange</Badge>
      <Badge colorScheme="yellow">Yellow</Badge>
      <Badge colorScheme="green">Green</Badge>
      <Badge colorScheme="teal">Teal</Badge>
      <Badge colorScheme="blue">Blue</Badge>
      <Badge colorScheme="cyan">Cyan</Badge>
      <Badge colorScheme="purple">Purple</Badge>
      <Badge colorScheme="pink">Pink</Badge>
    </div>
  ),
};

export const Variants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '8px' }}>
      <Badge variant="solid">Solid</Badge>
      <Badge variant="subtle">Subtle</Badge>
      <Badge variant="outline">Outline</Badge>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <Badge size="sm">Small</Badge>
      <Badge size="md">Medium</Badge>
      <Badge size="lg">Large</Badge>
    </div>
  ),
};

export const WithIcon: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '8px' }}>
      <Badge colorScheme="green">Online</Badge>
      <Badge colorScheme="red">Offline</Badge>
      <Badge colorScheme="yellow">Away</Badge>
    </div>
  ),
};
