import { act, render, screen } from '@testing-library/react';
import App from './App';
import { AppType } from './types/apps';
import { IHomebrewApp } from './types/homebrew';
import { updateInstalledStatusApps } from './utils/helpersHomebrew';

export const mockAllApps = [
  {
    token: 'app1',
    count: 1,
    desc: 'App 1',
    homepage: 'https://app1.com',
    installed: '1.0.0',
    name: ['app1'],
    url: 'https://app1.com/download.dmg',
    version: '1.1.0',
    outdated: true,
  },
  {
    token: 'app2',
    count: 2,
    desc: 'App 2',
    homepage: 'https://app2.com',
    installed: null,
    name: ['app2'],
    url: 'https://app2.com/download.dmg',
    version: '2.0.0',
    outdated: false,
  },
];

export const mockAllAppsCommon = [
  {
    id: 'app1',
    title: 'App One',
    description: 'This is the first app.',
    categories: ['Utility', 'Productivity'],
    installed: null,
    homepage: 'https://appone.example.com',
    appSourceType: AppType.Homebrew,
    sourceMetaData: {
      // Add any specific properties for IHomebrewApp here
    },
  },
  {
    id: 'app2',
    title: 'App Two',
    description: 'This is the second app.',
    categories: ['Entertainment', 'Video'],
    installed: '1.0.0',
    homepage: 'https://apptwo.example.com',
    appSourceType: AppType.Homebrew,
    sourceMetaData: {
      // Add any specific properties for IHomebrewApp here
    },
  },
  {
    id: 'app3',
    title: 'App Three',
    description: 'This is the third app.',
    categories: ['Education', 'Learning'],
    installed: null,
    homepage: 'https://appthree.example.com',
    appSourceType: AppType.Homebrew,
    sourceMetaData: {
      // Add any specific properties for IHomebrewApp here
    },
  },
];

test('renders text', async () => {
  await act(async () => {
    render(<App />);
  });
  const linkElement = screen.getByText(/BrewMate/i);
  expect(linkElement).toBeInTheDocument();

  const menuElement = screen.getByText(/Installed/i);
  expect(menuElement).toBeInTheDocument();
});

describe('updateInstalledStatusApps function', () => {
  let installedApps: IHomebrewApp[];

  beforeEach(() => {
    installedApps = [
      {
        token: 'app1',
        count: 1,
        desc: 'App 1',
        homepage: 'https://app1.com',
        installed: '1.2.0',
        name: ['app1'],
        url: 'https://app1.com/download.dmg',
        version: '1.2.0',
        outdated: true,
      },
    ];
  });

  it('should update installed status of apps', () => {
    const updatedApps = updateInstalledStatusApps(mockAllApps, installedApps);

    expect(updatedApps[0].installed).toEqual('1.2.0');
    expect(updatedApps[0].outdated).toEqual(true);
    expect(updatedApps[1].installed).toEqual(null);
    expect(updatedApps[1].outdated).toEqual(false);
  });
});
