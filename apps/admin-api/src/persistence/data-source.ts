import 'reflect-metadata';

import { DataSource } from 'typeorm';

import {
  buildDataSourceOptions,
  validateRuntimeConfig,
} from '../config/runtime.config';

validateRuntimeConfig(process.env);

export default new DataSource(buildDataSourceOptions());
