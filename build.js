#!/usr/bin/env node

import path from 'node:path';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';

import rimraf from 'rimraf';
import esbuild from 'esbuild';

const rm = promisify(rimraf);

const srcDir = 'src';
const outputDir = 'dist';

const services = await fs.readdir(path.resolve(srcDir));

const isWatchMode = process.argv?.[2]?.trim() === '--watch';

try {
  await rm(path.resolve(outputDir));

  await esbuild.build({
    entryPoints: services.map((service) =>
      path.resolve('src', service, 'index.ts')
    ),
    platform: 'node',
    bundle: false,
    treeShaking: true,
    outdir: outputDir,
    target: ['node18'],
    format: 'esm',
    watch: isWatchMode
      ? {
          onRebuild(error) {
            if (error) {
              console.error('Watch build failed:', error);
            } else {
              console.log('Esbuild detected changes and rebuilt files.');
            }
          },
        }
      : false,
  });

  if (isWatchMode) {
    console.log('Watching for changes...');
  } else {
    console.log('Esbuild ran successfully');
  }
} catch (error) {
  console.error(error);
}
