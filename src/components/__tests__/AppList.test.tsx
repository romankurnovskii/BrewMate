import { render, screen } from '@testing-library/react';
import { mockAllAppsCommon } from '../../App.test';
import { IApp } from '../../types/apps';
import AppList from '../AppList';

const apps: IApp[] = mockAllAppsCommon;

describe('AppList', () => {
  it('should render a list of apps', () => {
    render(<AppList apps={apps} />);
    const appBlocks = apps.map((app) => screen.getByText(app.title));
    expect(appBlocks).toHaveLength(apps.length);
  });
});
