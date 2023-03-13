import { render, screen } from '@testing-library/react';
import { mockAllApps } from '../../App.test';
import { IHomebrewApp } from '../../types/homebrew';
import AppList from '../AppList';

const apps: IHomebrewApp[] = mockAllApps;

describe('AppList', () => {
  it('should render a list of apps', () => {
    render(<AppList apps={apps} />);
    const appBlocks = apps.map((app) => screen.getByText(app.token));
    expect(appBlocks).toHaveLength(2);
  });
});
