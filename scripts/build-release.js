    const fs = require("fs");
    const path = require("path");
    const { execSync } = require("child_process");
    
    const root = path.resolve(__dirname, "..");
    
    const packageJsonPath = path.join(root, "package.json");
    
    const environmentPath = path.join(root, "src/environment/environment.tsx");
    const productionEnvironmentPath = path.join(
        root,
        "src/environment/environment.production.tsx"
    );
    const localEnvironmentPath = path.join(
        root,
        "src/environment/environment.local.tsx"
    );
    
    function run(command) {
        console.log(`\n▶ ${command}`);
        execSync(command, {
            cwd: root,
            stdio: "inherit",
            shell: true,
        });
    }
    
    function copyFileContents(from, to) {
        fs.copyFileSync(from, to);
        console.log(`Copied ${path.relative(root, from)} → ${path.relative(root, to)}`);
    }
    
    function incrementMinorVersion() {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    
        const [major, minor] = packageJson.version.split(".").map(Number);
    
        if (!Number.isInteger(major) || !Number.isInteger(minor)) {
            throw new Error(`Invalid package.json version: ${packageJson.version}`);
        }
    
        packageJson.version = `${major}.${minor + 1}.0`;
    
        fs.writeFileSync(
            packageJsonPath,
            `${JSON.stringify(packageJson, null, 2)}\n`
        );
    
        console.log(`Version bumped to ${packageJson.version}`);
    }
    
    try {
        incrementMinorVersion();
    
        copyFileContents(productionEnvironmentPath, environmentPath);
    
        run("npm run react:build");
        run("npm run electron:build");
        run("npm run publish");
    } finally {
        copyFileContents(localEnvironmentPath, environmentPath);
    }