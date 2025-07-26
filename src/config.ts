const SERVER_URL = import.meta.env.SERVER_URL || 'http://localhost:3001'
const BROWSER_HEADLESS = import.meta.env.BROWSER_HEADLESS !== 'false'

export { SERVER_URL, BROWSER_HEADLESS }
