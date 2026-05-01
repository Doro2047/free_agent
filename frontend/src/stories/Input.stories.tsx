import type { Meta, StoryObj } from '@storybook/react';
import { Input } from '../../components/ui/Input';
import { useState } from 'react';

const meta: Meta<typeof Input> = {
  title: 'UI/Input',
  component: Input,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'A versatile input component with multiple variants, validation states, and icons.',
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['outline', 'filled', 'flushed', 'unstyled'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    validationState: {
      control: 'select',
      options: ['valid', 'invalid', 'none'],
    },
    isDisabled: {
      control: 'boolean',
    },
    isReadOnly: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: {
    placeholder: 'Enter text...',
    size: 'md',
  },
};

export const WithLabel: Story = {
  args: {
    label: 'Email Address',
    placeholder: 'Enter your email',
    type: 'email',
  },
};

export const WithHelperText: Story = {
  args: {
    label: 'Password',
    type: 'password',
    helperText: 'Must be at least 8 characters',
    placeholder: 'Enter password',
  },
};

export const WithError: Story = {
  args: {
    label: 'Email',
    type: 'email',
    validationState: 'invalid',
    errorMessage: 'Invalid email address',
    defaultValue: 'invalid-email',
  },
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '300px' }}>
      <Input size="sm" placeholder="Small input" />
      <Input size="md" placeholder="Medium input" />
      <Input size="lg" placeholder="Large input" />
    </div>
  ),
};

export const Variants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '300px' }}>
      <Input variant="outline" placeholder="Outline input" />
      <Input variant="filled" placeholder="Filled input" />
      <Input variant="flushed" placeholder="Flushed input" />
      <Input variant="unstyled" placeholder="Unstyled input" />
    </div>
  ),
};

export const WithIcons: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '300px' }}>
      <Input leftIcon="📧" placeholder="With left icon" />
      <Input rightIcon="🔍" placeholder="With right icon" />
    </div>
  ),
};

export const Disabled: Story = {
  args: {
    label: 'Disabled Input',
    isDisabled: true,
    defaultValue: 'Cannot edit',
  },
};
