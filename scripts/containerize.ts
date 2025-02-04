import { execSync } from "child_process";
import { readFileSync } from "fs";

function exec(command: string, cwd?: string) {
    console.log(`Executing: ${command} ${cwd ? `in ${cwd}` : ""}`);
    execSync(command, {
        stdio: "inherit",
        cwd,
    });
}

function main() {
    try {
        const manifestStr = readFileSync("manifest.json");
        if (!manifestStr) {
            throw new Error();
        }

        const manifest = JSON.parse(manifestStr.toString());

        exec(
            `docker build --build-arg ARTIFACT_URL=${manifest.artifactURL} -t geo-app .`,
            "./"
        );
    } catch (err) {
        console.log("No manifest.json found. Have you run a release?");
    }
}

main();
