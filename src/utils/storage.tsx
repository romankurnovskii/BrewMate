import React, { createContext, useContext, useState } from 'react';
import { updateAllCasks, updateInstalledStatusApps } from './helpersHomebrew';
import { IHomebrewApp } from '../types/homebrew';
import { getLocalInstalledApps } from './api';
import { sortAppsByName } from './helpers';

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
  casks: IHomebrewApp[];
  setCasks: (apps: IHomebrewApp[]) => void;
  installedApps: IHomebrewApp[];
  updateInstalledApps: () => Promise<any>;
  setInstalledApps: (apps: IHomebrewApp[]) => void;
  updateCasksData: () => Promise<any>;
}

const AppContext = createContext<IAppContext>({
  procsOutput: '',
  setProcsOutput: () => {},
  casks: [],
  setCasks: () => {},
  installedApps: [],
  updateInstalledApps: () => Promise.resolve(),
  setInstalledApps: () => {},
  updateCasksData: () => Promise.resolve(),
});

export const useAppContext = () => useContext(AppContext);

export const AppContextProvider = ({ children }: any) => {
  const [procsOutput, setProcsOutput] = useState('');
  const [casks, setCasks] = useState<IHomebrewApp[]>([]);
  const [installedApps, setInstalledApps] = useState<IHomebrewApp[]>([]);

  const updateCasksData = async () => {
    console.log('Updating casks data');

    return Promise.all([updateAllCasks(), getLocalInstalledApps()])
      .then(([fetchedCasks, installedApps]) => {
        const allCasksUpdated = updateInstalledStatusApps(
          fetchedCasks,
          installedApps
        );
        setCasks(allCasksUpdated);
        setInstalledApps(installedApps);
        return allCasksUpdated;
      })
      .catch(console.error);
  };

  const updateInstalledApps = async () => {
    let _installedApps = await getLocalInstalledApps();
    _installedApps = sortAppsByName(_installedApps)
    setInstalledApps(_installedApps);
    const updatedApps = updateInstalledStatusApps(casks, _installedApps);
    setCasks(updatedApps);
  };

  return (
    <AppContext.Provider
      value={{
        procsOutput,
        setProcsOutput,
        casks,
        setCasks,
        installedApps,
        updateInstalledApps,
        setInstalledApps,
        updateCasksData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
