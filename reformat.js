const childProcess = require("child_process");
const path = require("path");

const guiDir = process.argv[2];
const file = process.argv[3];

const binDir = path.join(guiDir, "node_modules", ".bin");
const tslint = path.join(binDir, "tslint");
const prettier = path.join(binDir, "prettier");

const opts = {
    stdio: "inherit",
    cwd: guiDir,
};

childProcess.execSync(`${prettier} --ignore-path ../.prettierignore --write ${file}`, opts);
childProcess.execSync(`${tslint} --fix ${file}`, opts);
