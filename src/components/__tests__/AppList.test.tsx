import { render, screen } from '@testing-library/react';
import { mockAllApps, mockAllAppsCommon } from '../../App.test';
import { IApp } from '../../types/apps';
import { IHomebrewApp } from '../../types/homebrew';
import AppList from '../AppList';

const apps: IHomebrewApp[] = mockAllApps;
const appsCommon: IApp[] = mockAllAppsCommon;

describe('AppList', () => {
  it('should render a list of apps', () => {
    render(<AppList appsNew={appsCommon} apps={apps} />);
    const appBlocks = appsCommon.map((app) => screen.getByText(app.title));
    expect(appBlocks).toHaveLength(appsCommon.length);
  });
});
