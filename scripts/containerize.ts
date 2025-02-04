import { execSync } from "child_process";
import path from "path";

function exec(command: string, cwd?: string) {
    console.log(`Executing: ${command} ${cwd ? `in ${cwd}` : ""}`);
    execSync(command, {
        stdio: "inherit",
        cwd,
    });
}

function main() {
    const tag = process.argv[2];
    if (!tag) {
        console.error("Please provide a tag as an argument");
        process.exit(1);
    }

    try {
        exec(
            `docker build --build-arg ARTIFACT_URL=https://github.com/KingTenet/geo-run/archive/refs/tags/${tag}.tar.gz -t geo-run .`,
            path.join(__dirname, "../")
        );
    } catch (err) {
        console.error(err);
        console.log("Build failed");
    }
}

main();
