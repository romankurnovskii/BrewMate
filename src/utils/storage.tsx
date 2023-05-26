import { createContext, useContext, useState } from 'react';
import {
  convertHomebrewAppstoCommonStructure as convertHomebrewAppsToCommonStructure,
  sortAppsByName,
  updateAllCasks,
  updateInstalledStatusApps,
} from './helpersHomebrew';
import { IHomebrewApp } from '../types/homebrew';
import {
  fetchAppsFromSerhiiLondarOSMAC,
  getAllCasks,
  getLocalInstalledApps,
} from './api';
import { AppType, IAppsStorage } from '../types/apps';
import { convertOpenSourceAppsToCommonStructure } from './helpersOSApps';

export const getDataFromStorage = (key: string) => {
  const data = localStorage.getItem(key);
  if (data) {
    return JSON.parse(data);
  }
  return null;
};

export const saveDataToStorage = (key: string, data: any) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// React Store Context

interface IAppContext {
  procsOutput: string;
  setProcsOutput: (output: string) => void;
  apps: IAppsStorage;
  casks: IHomebrewApp[];
  setCasks: (apps: IHomebrewApp[]) => void;
  installedApps: IHomebrewApp[];
  updateInstalledApps: () => Promise<any>;
  setInstalledApps: (apps: IHomebrewApp[]) => void;
  updateCasksData: () => Promise<any>;
  updateAppsFromOpenSource: () => Promise<any>;
}

const AppContext = createContext<IAppContext>({
  procsOutput: '',
  setProcsOutput: () => {},
  apps: {
    [AppType.Homebrew]: [],
    [AppType.OpenSourceGithub]: [],
  },
  casks: [],
  setCasks: () => {},
  installedApps: [],
  updateInstalledApps: () => Promise.resolve(),
  setInstalledApps: () => {},
  updateCasksData: () => Promise.resolve(),
  updateAppsFromOpenSource: () => Promise.resolve(),
});

export const useAppContext = () => useContext(AppContext);

export const AppContextProvider = ({ children }: any) => {
  const [procsOutput, setProcsOutput] = useState('');
  const [apps, setApps] = useState<IAppsStorage>({
    [AppType.Homebrew]: [],
    [AppType.OpenSourceGithub]: [],
  });
  const [casks, setCasks] = useState<IHomebrewApp[]>([]);
  const [installedApps, setInstalledApps] = useState<IHomebrewApp[]>([]);

  const updateCasksData = async () => {
    console.log('Updating casks data');

    return Promise.all([
      getAllCasks(),
      updateAllCasks(),
      getLocalInstalledApps(),
    ])
      .then(([allCasks, fetchedCasks, installedApps]) => {
        const allCasksUpdated = updateInstalledStatusApps(
          fetchedCasks,
          installedApps,
        );
        const convertedApps =
          convertHomebrewAppsToCommonStructure(allCasksUpdated);
        setCasks(allCasksUpdated);

        let _allCasks = Object.values(allCasks);
        if (_allCasks.length === 0) {
          _allCasks = convertHomebrewAppsToCommonStructure(allCasksUpdated);
        }
        setApps((prev) => ({
          ...prev,
          [AppType.Homebrew]: _allCasks,
        }));
        setInstalledApps(installedApps);
        return allCasksUpdated;
      })
      .catch(console.error);
  };

  const updateInstalledApps = async () => {
    let _installedApps = await getLocalInstalledApps();
    _installedApps = sortAppsByName(_installedApps);
    setInstalledApps(_installedApps);
    const updatedApps = updateInstalledStatusApps(casks, _installedApps);
    setCasks(updatedApps);
  };

  const updateAppsFromOpenSource = async () => {
    const _apps = await fetchAppsFromSerhiiLondarOSMAC();
    const convertedApps = convertOpenSourceAppsToCommonStructure(_apps);
    setApps((prev) => ({
      ...prev,
      [AppType.OpenSourceGithub]: convertedApps,
    }));
  };

  return (
    <AppContext.Provider
      value={{
        procsOutput,
        setProcsOutput,
        apps,
        casks,
        setCasks,
        installedApps,
        updateInstalledApps,
        setInstalledApps,
        updateCasksData,
        updateAppsFromOpenSource,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
