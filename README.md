# lerna-to-typescript-project-references [![npm version](https://badge.fury.io/js/lerna-to-typescript-project-references.svg)](https://www.npmjs.com/package/lerna-to-typescript-project-references)

Keep package dependencies synchronized between Lerna and TypeScript.

This simple script runs over packages in a Lerna monorepo, and matches local package dependencies to project references within TypeScript config files.

By default it'll exit and return an error when a mismatched dependency is found. This is useful for CI scenarios, where you may want to avoid merging a change where you've mistakenly added an unmatched dependency.

With the update flag set, `lerna-to-typescript-project-references` will update TypeScript config files to match the dependencies found in the package files.

## Command Line Usage

```
Usage: lerna-to-typescript-project-references.js [options]

Options:
  --update [boolean]           # Whether to write updates to ts config files.
  --tsConfigFileName [string]  # Set a custom name for your ts config file.  eg. tsconfig.dist.json
```

## Examples

With no options, and configuration file in need of updating.

```
> lerna-to-typescript-project-references

@example/pkg1 - 0 dependencies found.
@example/pkg2 - 1 dependencies found. All match project references in tsconfig.json.
**FAIL** - @example/pkg3 - Some dependencies didn't match.
**FAIL** - @example/pkg3 - From npm packages: ../pkg1,../pkg2
**FAIL** - @example/pkg3 - From tsconfig.json: ../pkg1
npm ERR! code ELIFECYCLE
```

We can see from the output that the `tsconfig.json` file in pkg3 is missing a reference to `../pkg2`. To have `lerna-to-typescript-project-references` update it for us, we can run it again, with the update flag enabled.

```
> lerna-to-typescript-project-references --update

@example/pkg1 - 0 dependencies found.
@example/pkg2 - 1 dependencies found. All match project references in tsconfig.json.
**UPDATE** - @example/pkg3 - Some dependencies didn't match. Writing 2 dependencies to tsconfig.json.
```

Now if run without options again, the script completes without error since all the dependencies match.

```
> lerna-to-typescript-project-references --update

@example/pkg1 - 0 dependencies found.
@example/pkg2 - 1 dependencies found. All match project references in tsconfig.json.
@example/pkg3 - 2 dependencies found. All match project references in tsconfig.json.
```
