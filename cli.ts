#!/usr/bin/env node

import { execSync, exec } from "child_process";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { log, error } from "console";

interface Package {
  name: string;
  location: string;
}

interface ProjectReference {
  path: string;
}

const update = process.argv.includes("--update");
const configFileName = "tsconfig.dist.json";

const packages = JSON.parse(execSync(`lerna ls --json --loglevel silent`).toString());

const packagesDirectory = dirname(packages[0].location);
const getConfigFilePath = (base: string) => join(base, configFileName);

function getNewProjectReferencePaths(dependencies: {}) {
  return Object.keys(dependencies)
    .map((dependencyName: string) => {
      const matchingPackage = packages.find((lernaPackage: Package) => lernaPackage.name === dependencyName);
      const configFileExists = matchingPackage && existsSync(join(matchingPackage.location, configFileName));
      if (configFileExists) {
        const projectReferencePath = matchingPackage.location
          .replace(packagesDirectory, "..")
          .concat(`/${configFileName}`);
        return projectReferencePath;
      }
    })
    .filter(x => !!x);
}

function processNewProjectReferencePaths(newPaths: string[], currentPackage: Package) {
  const { name, location } = currentPackage;
  const configFile = JSON.parse(readFileSync(getConfigFilePath(location)).toString());
  const existingPaths = configFile.references.map((p: ProjectReference) => p && p.path);
  const allDependenciesMatch = newPaths.sort().toString() === existingPaths.sort().toString();

  if (allDependenciesMatch) {
    log(`${name} - ${newPaths.length} dependencies found. All match project references in ${configFileName}.`);
  } else if (update) {
    log(`${name} - Some dependencies don't match.  Updating ${configFileName}...`);
    updateConfigFile(configFile, newPaths, location);
    log(`**UPDATE** - ${name} - Wrote ${newPaths.length} dependencies to ${configFileName}.`);
  } else {
    error(`**FAIL** - ${name} - Some dependencies don't match project references in ${configFileName}.`);
    error(`**FAIL** Lerna Package Dependencies: ${newPaths}`);
    error(`**FAIL** Typescript Project References: ${existingPaths}`);
    process.exit(1);
  }
}

function updateConfigFile(configFile: any, newPaths: string[], currentPackageLocation: string) {
  const configFilePath = getConfigFilePath(currentPackageLocation);
  const newConfig = {
    ...configFile,
    references: newPaths.map(path => ({ path }))
  };

  writeFileSync(configFilePath, JSON.stringify(newConfig));
  execSync(`npx prettier --write ${configFilePath}`);
}

function processPackage(currentPackage: Package) {
  const cwd = currentPackage.location;
  exec("npm ls --depth 0 --json --silent", { cwd }).stdout.on("data", (data: string) => {
    const dependencies = JSON.parse(data).dependencies;
    if (dependencies) {
      const projectReferencePaths = getNewProjectReferencePaths(dependencies);
      processNewProjectReferencePaths(projectReferencePaths, currentPackage);
    } else {
      log(`${currentPackage.name} - No dependencies found.`);
    }
  });
}

packages.forEach(processPackage);
