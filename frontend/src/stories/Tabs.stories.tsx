import type { Meta, StoryObj } from '@storybook/react';
import { Tabs } from '../../components/ui/Tabs';
import { Box, Text } from '../../components/ui';

const meta: Meta<typeof Tabs> = {
  title: 'UI/Tabs',
  component: Tabs,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'A tabs component for organizing and navigating between related content.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Tabs>;

export const Default: Story = {
  render: () => {
    const tabs = [
      { label: 'Tab 1', content: 'Content for Tab 1' },
      { label: 'Tab 2', content: 'Content for Tab 2' },
      { label: 'Tab 3', content: 'Content for Tab 3' },
    ];
    return <Tabs tabs={tabs} />;
  },
};

export const Variants: Story = {
  render: () => {
    const tabs = [
      { label: 'Overview', content: 'Overview content' },
      { label: 'Features', content: 'Features content' },
      { label: 'Pricing', content: 'Pricing content' },
    ];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        <div>
          <Text mb={2}>Line Variant</Text>
          <Tabs tabs={tabs} variant="line" />
        </div>
        <div>
          <Text mb={2}>Enclosed Variant</Text>
          <Tabs tabs={tabs} variant="enclosed" />
        </div>
        <div>
          <Text mb={2}>Soft Rounded Variant</Text>
          <Tabs tabs={tabs} variant="soft-rounded" />
        </div>
        <div>
          <Text mb={2}>Solid Rounded Variant</Text>
          <Tabs tabs={tabs} variant="solid-rounded" />
        </div>
      </div>
    );
  },
};

export const WithIcons: Story = {
  render: () => {
    const tabs = [
      { label: 'Home', content: 'Home content', icon: '🏠' },
      { label: 'Profile', content: 'Profile content', icon: '👤' },
      { label: 'Settings', content: 'Settings content', icon: '⚙️' },
    ];
    return <Tabs tabs={tabs} />;
  },
};

export const WithBadge: Story = {
  render: () => {
    const tabs = [
      { label: 'Inbox', content: 'Inbox content', badge: '12' },
      { label: 'Sent', content: 'Sent content', badge: '5' },
      { label: 'Drafts', content: 'Drafts content' },
    ];
    return <Tabs tabs={tabs} />;
  },
};

export const DisabledTab: Story = {
  render: () => {
    const tabs = [
      { label: 'Active Tab', content: 'Active content' },
      { label: 'Disabled Tab', content: 'Disabled content', isDisabled: true },
      { label: 'Another Active', content: 'Another content' },
    ];
    return <Tabs tabs={tabs} />;
  },
};
