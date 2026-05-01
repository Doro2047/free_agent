import type { Meta, StoryObj } from '@storybook/react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Text } from '../../components/ui';

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'A card component for grouping and displaying content in a clean format.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  render: () => (
    <Card>
      <Text>This is a basic card with some content.</Text>
    </Card>
  ),
};

export const WithHeader: Story = {
  render: () => (
    <Card header="Card Title">
      <Text>This card has a header section.</Text>
    </Card>
  ),
};

export const WithHeaderActions: Story = {
  render: () => (
    <Card
      header="Settings"
      headerActions={<Button size="sm">Edit</Button>}
    >
      <Text>Card with header actions on the right.</Text>
    </Card>
  ),
};

export const WithFooter: Story = {
  render: () => (
    <Card footer={<Button size="sm">View More</Button>}>
      <Text>Card with footer actions.</Text>
    </Card>
  ),
};

export const CompleteCard: Story = {
  render: () => (
    <Card
      header="Project Overview"
      headerActions={<Button size="sm" variant="outline">Share</Button>}
      footer={
        <>
          <Button variant="ghost" size="sm">Cancel</Button>
          <Button size="sm">Save Changes</Button>
        </>
      }
    >
      <Text mb={3}>
        This is a complete card example with header, content, and footer sections.
        Cards are great for organizing related information.
      </Text>
      <Text color="gray.500" fontSize="sm">
        Last updated: 2 hours ago
      </Text>
    </Card>
  ),
};

export const CardsGrid: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
      <Card header="Card 1">
        <Text>First card content</Text>
      </Card>
      <Card header="Card 2">
        <Text>Second card content</Text>
      </Card>
      <Card header="Card 3">
        <Text>Third card content</Text>
      </Card>
    </div>
  ),
};
