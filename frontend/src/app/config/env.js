const getEnv = (key, fallback = '') => {
  return import.meta.env[key] || fallback
}

export const env = {
  apiBaseUrl: getEnv('VITE_API_BASE_URL', 'http://localhost:5000/api/v1'),
  appName: getEnv('VITE_APP_NAME', 'Yemi'),
  appEnv: getEnv('VITE_APP_ENV', 'development'),
  isDevelopment: getEnv('VITE_APP_ENV', 'development') === 'development',
  isProduction: getEnv('VITE_APP_ENV', 'development') === 'production',
}
