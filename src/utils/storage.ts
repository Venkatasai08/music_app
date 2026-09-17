// Storage Utility with Safe JSON Serializer

import AsyncStorage from '@react-native-async-storage/async-storage';

export const storage = {
  async getItem<T>(key: string, defaultValue: T): Promise<T> {
    try {
      const item = await AsyncStorage.getItem(key);
      if (item !== null) {
        return JSON.parse(item) as T;
      }
      return defaultValue;
    } catch (error) {
      console.warn(`[Storage] Failed to read key: ${key}`, error);
      return defaultValue;
    }
  },

  async setItem<T>(key: string, value: T): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`[Storage] Failed to write key: ${key}`, error);
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.warn(`[Storage] Failed to remove key: ${key}`, error);
    }
  },
};
