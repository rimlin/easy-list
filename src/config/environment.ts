import { Environment } from 'interfaces/environment';

// Determine environment
let currEnv: Environment = Environment.PRODUCTION;

if (process.env.ENVIRONMENT === 'development') {
  currEnv = Environment.DEVELOPMENT;
}

export const CurrentEnvironment: Environment = currEnv;
