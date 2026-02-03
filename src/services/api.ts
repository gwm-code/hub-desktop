import axios from 'axios';
import { useSettingsStore } from '../store/useSettingsStore';

export const createApi = () => {
  const { serverUrl } = useSettingsStore.getState();
  return axios.create({
    baseURL: serverUrl,
  });
};
