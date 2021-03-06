#!/usr/bin/env node
import arg from 'arg';
import { execSync, exec } from 'child_process';
import { error, log, warn } from 'console';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { format } from 'prettier';
import { TsConfig, Package } from './types';

const args = arg({ '--update': Boolean, '--tsConfigFileName': String });
const tsConfigFileName = args['--tsConfigFileName'] || 'tsconfig.json';

const packages: Package[] = JSON.parse(execSync(`lerna ls --json --loglevel silent`).toString());
const packagesDirectory = dirname(packages[0].location);

packages.forEach(({ name, location }) => {
  exec('npm ls --depth 0 --json --silent', { cwd: location }, (_error, stdout, _stderror) => {
    const dependencyNames = Object.keys(JSON.parse(stdout).dependencies || {});
    const paths = dependencyNames.map(getPathForDependency).filter(x => !!x);

    if (paths.length == 0) {
      return log(`${name} - 0 dependencies found.`);
    }

    const configFilePath = join(location, tsConfigFileName);
    const config: TsConfig = JSON.parse(readFileSync(configFilePath).toString());
    const { references = [] } = config;
    const existingPaths = references.map(r => r.path);

    if (paths.sort().toString() === existingPaths.sort().toString()) {
      log(`${name} - ${paths.length} dependencies found. All match project references in ${tsConfigFileName}.`);
    } else if (args['--update']) {
      warn(`*UPDATE* - ${name} - Some dependencies didn't match. Writing ${paths.length} to ${tsConfigFileName}.`);
      const newJsonConfig = JSON.stringify({ ...config, references: paths.map(path => ({ path })) });
      writeFileSync(configFilePath, format(newJsonConfig, { parser: 'json' }));
    } else {
      error(`**FAIL** - ${name} - Some dependencies didn't match.`);
      error(`**FAIL** - ${name} - From npm packages: ${paths}`);
      error(`**FAIL** - ${name} - From ${tsConfigFileName}: ${existingPaths}`);
      process.exit(1);
    }
  });
});

const doesTsConfigFileExist = ({ location }: Package) => existsSync(join(location, tsConfigFileName));

function getRelativeTsConfigFilePath({ location }: Package) {
  const relativePath = location.replace(packagesDirectory, '..');
  const file = tsConfigFileName == 'tsconfig.json' ? '' : tsConfigFileName;
  return join(relativePath, file);
}

function getPathForDependency(name: string) {
  const pkg = packages.find(p => p.name === name);
  return pkg && doesTsConfigFileExist(pkg) ? getRelativeTsConfigFilePath(pkg) : '';
}
