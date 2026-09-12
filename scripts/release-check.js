const {spawnSync} = require('node:child_process');
const {existsSync, readdirSync, statSync} = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const packageJson = require('../package.json');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function runStep(label, args) {
    console.log(`\n> ${label}`);

    const result = spawnSync(npmCommand, args, {
        cwd: rootDir,
        env: process.env,
        stdio: 'inherit'
    });

    if (result.status !== 0) {
        throw new Error(`${label} failed with exit code ${result.status ?? 'unknown'}`);
    }
}

function findPackedOutputs(directory, productName, depth = 0) {
    if (depth > 5 || !existsSync(directory)) return [];

    return readdirSync(directory, {withFileTypes: true}).flatMap(entry => {
        const entryPath = path.join(directory, entry.name);
        const matchesProduct = entry.name.startsWith(productName);

        if (matchesProduct) {
            return [entryPath];
        }

        if (entry.isDirectory()) {
            return findPackedOutputs(entryPath, productName, depth + 1);
        }

        return [];
    });
}

function verifyPackOutput(startedAt) {
    const productName = packageJson.build?.productName || packageJson.name;
    const outputs = findPackedOutputs(distDir, productName)
        .filter(outputPath => statSync(outputPath).mtimeMs >= startedAt - 1000);

    if (outputs.length === 0) {
        throw new Error(`No fresh "${productName}" package output was found in dist/.`);
    }

    console.log('\n> package output');
    outputs.forEach(output => {
        console.log(`- ${path.relative(rootDir, output)}`);
    });
}

function main() {
    runStep('quality checks', ['run', 'check']);

    const packageStartedAt = Date.now();
    runStep('local package build', ['run', 'pack']);
    verifyPackOutput(packageStartedAt);

    console.log('\nRelease check completed.');
}

try {
    main();
} catch (error) {
    console.error(`\nRelease check failed: ${error.message}`);
    process.exitCode = 1;
}
