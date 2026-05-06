const fs = require('node:fs');
const path = require('node:path');

const packageJsonPath = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native-maps',
  'package.json',
);

if (!fs.existsSync(packageJsonPath)) {
  process.exit(0);
}

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const codegenConfig = packageJson.codegenConfig;

if (!codegenConfig) {
  process.exit(0);
}

codegenConfig.ios = codegenConfig.ios ?? {};
codegenConfig.ios.modulesProvider = {
  ...(codegenConfig.ios.modulesProvider ?? {}),
  RNMapsAirModule: 'RNMapsAirModule',
};

fs.writeFileSync(
  packageJsonPath,
  `${JSON.stringify(packageJson, null, 2)}\n`,
  'utf8',
);
