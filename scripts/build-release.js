const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const environmentPath = path.join(rootDir, "src", "environment", "environment.tsx");
const productionEnvironmentPath = path.join(rootDir, "src", "environment", "environment.production.tsx");

function run(command, args) {
    const executable = process.platform === "win32" ? (process.env.ComSpec || "cmd.exe") : command;
    const executableArgs = process.platform === "win32"
        ? ["/d", "/s", "/c", [command, ...args].map(quoteCmdArg).join(" ")]
        : args;

    const result = spawnSync(executable, executableArgs, {
        cwd: rootDir,
        stdio: "inherit",
        env: {
            ...process.env,
            NODE_ENV: "production",
            CSC_IDENTITY_AUTO_DISCOVERY: "false",
        },
    });

    if (result.error) throw result.error;
    if (result.status !== 0) {
        throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status}`);
    }
}

function quoteCmdArg(value) {
    if (/^[A-Za-z0-9_./:@=-]+$/.test(value)) return value;
    return `"${value.replace(/"/g, '\\"')}"`;
}

function main() {
    if (!fs.existsSync(environmentPath)) {
        throw new Error(`Missing environment file: ${environmentPath}`);
    }
    if (!fs.existsSync(productionEnvironmentPath)) {
        throw new Error(`Missing production environment file: ${productionEnvironmentPath}`);
    }

    const originalEnvironment = fs.readFileSync(environmentPath);

    try {
        fs.copyFileSync(productionEnvironmentPath, environmentPath);
        console.log("[release] environment.tsx replaced with production environment");

        run("npm", ["run", "react:build"]);
        run("npm", ["run", "electron:build"]);
        run("npx", [
            "electron-builder",
            "-w",
            "--publish",
            "never",
            "-c.win.signAndEditExecutable=false",
            "-c.win.forceCodeSigning=false",
        ]);

        console.log("[release] Windows installer build complete");
    } finally {
        fs.writeFileSync(environmentPath, originalEnvironment);
        console.log("[release] environment.tsx restored");
    }
}

main();
