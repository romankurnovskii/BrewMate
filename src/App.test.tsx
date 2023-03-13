import { act, render, screen } from '@testing-library/react';
import App from './App';
import { IHomebrewApp } from './types/homebrew';
import { updateInstalledStatusApps } from './utils/helpers';

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
