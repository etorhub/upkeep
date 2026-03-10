import type { Preview } from '@storybook/web-components';
import { withThemeByDataAttribute } from '@storybook/addon-themes';

import { registerMockElements } from './mock-elements';

import './ha-themes.css';

registerMockElements();

const preview: Preview = {
  decorators: [
    withThemeByDataAttribute({
      themes: {
        'ha-light': 'ha-light',
        'ha-dark': 'ha-dark',
      },
      defaultTheme: 'ha-light',
      parentSelector: 'html',
      attributeName: 'data-theme',
    }),
  ],
  parameters: {
    layout: 'centered',
    backgrounds: { disable: true },
  },
};

export default preview;
