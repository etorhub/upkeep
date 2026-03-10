import type { StorybookConfig } from '@storybook/web-components-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx|js|jsx|mdx)'],
  addons: ['@storybook/addon-essentials', '@storybook/addon-themes', '@storybook/addon-viewport'],
  framework: {
    name: '@storybook/web-components-vite',
    options: {},
  },
  previewHead: (head) => `
    ${head}
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@mdi/font@7.4.47/css/materialdesignicons.min.css" />
  `,
};

export default config;
