import { execSync } from "child_process";
import { readFileSync } from "fs";
import path from "path";

function exec(command: string, cwd?: string) {
    console.log(`Executing: ${command} ${cwd ? `in ${cwd}` : ""}`);
    try {
        execSync(command, {
            stdio: "inherit",
            cwd,
        });
    } catch (err) {
        console.log(`Error`);
        return err;
    }
}

function main() {
    const tag = process.argv[2];
    if (!tag) {
        console.error("Please provide a tag as an argument");
        process.exit(1);
    }
    // Build each component
    exec("docker stop geo-run", path.join(__dirname, "./"));
    exec("docker container rm geo-run", path.join(__dirname, "./"));
    exec(`pnpm run containerize ${tag}`, path.join(__dirname, "./"));
    exec(
        "docker run --name geo-run -d -p 8080:80 geo-run",
        path.join(__dirname, "./")
    );
}

main();
