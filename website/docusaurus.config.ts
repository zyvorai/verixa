import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Verixa',
  tagline: 'Rehearse every action. Ship with evidence.',
  favicon: 'img/favicon.svg',

  future: {
    v4: true,
  },

  url: 'https://zyvorai.github.io',
  baseUrl: '/verixa/',

  organizationName: 'zyvorai',
  projectName: 'verixa',

  onBrokenLinks: 'throw',

  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  // Screenshots live once in ../docs/ux and are shared by the README and this site.
  staticDirectories: ['static', '../docs/ux'],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/zyvorai/verixa/tree/main/website/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'hero-overview.png',
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: false,
    },
    navbar: {
      title: 'Verixa',
      logo: {
        alt: 'Verixa',
        src: 'img/favicon.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          to: '/gallery',
          label: 'Gallery',
          position: 'left',
        },
        {
          href: 'https://github.com/zyvorai/verixa',
          label: 'GitHub',
          position: 'right',
        },
        {
          href: 'https://zyvor.dev',
          label: 'Zyvor',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {label: 'Quickstart', to: '/docs/getting-started/quickstart'},
            {label: 'Architecture', to: '/docs/core-concepts/architecture'},
            {label: 'Deploy', to: '/docs/getting-started/deploy'},
            {label: 'Security', to: '/docs/security'},
          ],
        },
        {
          title: 'Project',
          items: [
            {label: 'GitHub', href: 'https://github.com/zyvorai/verixa'},
            {label: 'Changelog', href: 'https://github.com/zyvorai/verixa/blob/main/CHANGELOG.md'},
            {label: 'Contributing', href: 'https://github.com/zyvorai/verixa/blob/main/CONTRIBUTING.md'},
            {label: 'License (Apache-2.0)', href: 'https://github.com/zyvorai/verixa/blob/main/LICENSE'},
          ],
        },
        {
          title: 'Zyvor',
          items: [
            {label: 'zyvor.dev', href: 'https://zyvor.dev'},
            {label: 'Netra', href: 'https://zyvorai.github.io/netra/'},
            {label: 'security@zyvor.dev', href: 'mailto:security@zyvor.dev'},
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Zyvor AI Labs. Apache-2.0.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'json', 'python'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
