import type { Meta, StoryObj } from '@storybook/web-components';
import type { HomeMaintenanceCardConfig } from './types';
import type { HomeAssistant } from 'custom-card-helpers';

import './home-maintenance-card';

import { mockHass, mockHassOverdue, mockHassEmpty } from '../.storybook/mock-hass';

const CARD_TYPE = 'custom:home-maintenance-card';

const defaultConfig: HomeMaintenanceCardConfig = {
  type: CARD_TYPE,
  title: 'Home Maintenance',
  view_mode: 'grid',
  progress_type: 'ring',
  sort_by: 'urgency',
  filter: 'all',
  due_soon_days: 7,
  show_header: true,
  show_filter_bar: false,
  columns: 3,
};

function renderCard(args: { hass: HomeAssistant | null; config: HomeMaintenanceCardConfig }) {
  const wrapper = document.createElement('div');
  wrapper.style.maxWidth = '500px';
  const card = document.createElement('home-maintenance-card') as HTMLElement & {
    hass: HomeAssistant | null;
    setConfig: (config: HomeMaintenanceCardConfig) => void;
  };
  card.hass = args.hass;
  card.setConfig({ ...defaultConfig, ...args.config });
  wrapper.appendChild(card);
  return wrapper;
}

const meta: Meta = {
  title: 'Cards/Home Maintenance',
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    'config.view_mode': {
      control: 'select',
      options: ['grid', 'list', 'compact'],
    },
    'config.progress_type': {
      control: 'select',
      options: ['ring', 'bar'],
    },
    'config.sort_by': {
      control: 'select',
      options: ['urgency', 'name', 'due_date'],
    },
    'config.filter': {
      control: 'select',
      options: ['all', 'overdue', 'due_soon', 'on_track'],
    },
  },
};

export default meta;

type Story = StoryObj<{ hass: HomeAssistant | null; config: HomeMaintenanceCardConfig }>;

export const Loading: Story = {
  render: renderCard,
  args: {
    hass: null,
    config: defaultConfig,
  },
};

export const GridDefault: Story = {
  render: renderCard,
  args: {
    hass: mockHass,
    config: { ...defaultConfig, view_mode: 'grid', progress_type: 'ring' },
  },
};

export const GridBarProgress: Story = {
  render: renderCard,
  args: {
    hass: mockHass,
    config: { ...defaultConfig, view_mode: 'grid', progress_type: 'bar' },
  },
};

export const List: Story = {
  render: renderCard,
  args: {
    hass: mockHass,
    config: { ...defaultConfig, view_mode: 'list' },
  },
};

export const Compact: Story = {
  render: renderCard,
  args: {
    hass: mockHass,
    config: { ...defaultConfig, view_mode: 'compact' },
  },
};

export const WithFilterBar: Story = {
  render: renderCard,
  args: {
    hass: mockHass,
    config: { ...defaultConfig, show_filter_bar: true },
  },
};

export const NoHeader: Story = {
  render: renderCard,
  args: {
    hass: mockHass,
    config: { ...defaultConfig, show_header: false },
  },
};

export const CustomTitle: Story = {
  render: renderCard,
  args: {
    hass: mockHass,
    config: { ...defaultConfig, title: 'Manteniments' },
  },
};

export const Empty: Story = {
  render: renderCard,
  args: {
    hass: mockHassEmpty,
    config: defaultConfig,
  },
};

export const OverdueOnly: Story = {
  render: renderCard,
  args: {
    hass: mockHassOverdue,
    config: { ...defaultConfig, filter: 'overdue' },
  },
};

export const ManualEntities: Story = {
  render: renderCard,
  args: {
    hass: mockHass,
    config: {
      ...defaultConfig,
      entities: ['binary_sensor.hvac_filter', 'binary_sensor.smoke_detector'],
    },
  },
};

export const ExcludeEntities: Story = {
  render: renderCard,
  args: {
    hass: mockHass,
    config: {
      ...defaultConfig,
      exclude_entities: ['binary_sensor.gutter_clean'],
    },
  },
};

export const Columns: Story = {
  render: renderCard,
  args: {
    hass: mockHass,
    config: { ...defaultConfig, columns: 4 },
  },
};

export const DueSoonDays: Story = {
  render: renderCard,
  args: {
    hass: mockHass,
    config: { ...defaultConfig, due_soon_days: 14 },
  },
};

export const DarkTheme: Story = {
  render: renderCard,
  args: {
    hass: mockHass,
    config: { ...defaultConfig },
  },
  parameters: {
    themes: {
      themeOverride: 'ha-dark',
    },
  },
};

export const Responsive: Story = {
  render: renderCard,
  args: {
    hass: mockHass,
    config: { ...defaultConfig },
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
};
