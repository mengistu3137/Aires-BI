import { appConfig } from '../app/config/app.config.js'

const getPrefixedKey = (key) => `${appConfig.storagePrefix}${key}`

export const getStorageItem = (key) => {
  try {
    const item = localStorage.getItem(getPrefixedKey(key))
    return item ? JSON.parse(item) : null
  } catch (error) {
    console.error('Storage read exception', error)
    return null
  }
}

export const setStorageItem = (key, value) => {
  try {
    localStorage.setItem(getPrefixedKey(key), JSON.stringify(value))
    return true
  } catch (error) {
    console.error('Storage write exception', error)
    return false
  }
}

export const removeStorageItem = (key) => {
  try {
    localStorage.removeItem(getPrefixedKey(key))
    return true
  } catch (error) {
    console.error('Storage delete exception', error)
    return false
  }
}
