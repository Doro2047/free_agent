import type { Meta, StoryObj } from '@storybook/react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { useState } from 'react';

const meta: Meta<typeof Modal> = {
  title: 'UI/Modal',
  component: Modal,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'A modal dialog component with backdrop blur, animations, and focus trapping.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Modal>;

export const Default: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <>
        <Button onClick={() => setIsOpen(true)}>Open Modal</Button>
        <Modal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title="Modal Title"
        >
          <p>Modal content goes here. You can put any React content inside.</p>
        </Modal>
      </>
    );
  },
};

export const WithForm: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <>
        <Button onClick={() => setIsOpen(true)}>Open Form Modal</Button>
        <Modal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title="Contact Form"
          size="md"
        >
          <form style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px' }}>Name</label>
              <input type="text" style={{ width: '100%', padding: '8px' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px' }}>Email</label>
              <input type="email" style={{ width: '100%', padding: '8px' }} />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button type="submit">Submit</Button>
            </div>
          </form>
        </Modal>
      </>
    );
  },
};

export const Sizes: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState<string | null>(null);
    const sizes = ['sm', 'md', 'lg', 'xl', 'full'];
    return (
      <div style={{ display: 'flex', gap: '8px' }}>
        {sizes.map((size) => (
          <Button key={size} onClick={() => setIsOpen(size)}>
            {size.toUpperCase()}
          </Button>
        ))}
        {sizes.map((size) => (
          <Modal
            key={size}
            isOpen={isOpen === size}
            onClose={() => setIsOpen(null)}
            title={`${size.toUpperCase()} Modal`}
            size={size as 'sm' | 'md' | 'lg' | 'xl' | 'full'}
          >
            <p>This is a {size} sized modal.</p>
          </Modal>
        ))}
      </div>
    );
  },
};

export const Confirmation: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <>
        <Button color="error" onClick={() => setIsOpen(true)}>Delete Item</Button>
        <Modal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title="Confirm Deletion"
          size="sm"
        >
          <p>Are you sure you want to delete this item? This action cannot be undone.</p>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '24px' }}>
            <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button color="error" onClick={() => setIsOpen(false)}>Delete</Button>
          </div>
        </Modal>
      </>
    );
  },
};
