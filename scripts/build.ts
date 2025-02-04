import { execSync } from "child_process";
import { readFileSync } from "fs";
import path from "path";

function exec(command: string, cwd?: string) {
    console.log(`Executing: ${command} ${cwd ? `in ${cwd}` : ""}`);
    execSync(command, {
        stdio: "inherit",
        cwd,
    });
}

function main() {
    const tag = readFileSync("manifest.json");
    if (!tag) {
        console.log("No manifest.json found. Have you run a release?");
        return;
    }

    // Build each component
    exec("pnpm install", path.join(__dirname, "../client"));
    exec("pnpm run build", path.join(__dirname, "../client"));

    exec("pnpm install", path.join(__dirname, "../server"));
    exec("pnpm run build", path.join(__dirname, "../server"));

    exec("pnpm install", path.join(__dirname, "../daemon"));
    exec("npm run build", path.join(__dirname, "../daemon"));

    exec("rm -fr server/public", path.join(__dirname, "./"));
    exec("mv client/dist server/public", path.join(__dirname, "./"));
}

main();
