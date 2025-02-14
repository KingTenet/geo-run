import { execSync } from "child_process";
import path from "path";
import dotenv from "dotenv";

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

    // Load environment variables from .env file
    const envPath = path.join(__dirname, "../.env");
    const envConfig = dotenv.config({ path: envPath });

    if (envConfig.error) {
        console.warn("Warning: No .env file found or error reading it");
    }

    // Build the environment variables string for docker run
    const envVars = Object.entries(process.env)
        .filter(([key]) => key.startsWith('CLIENT_') || key.startsWith('DAEMON_') || key.startsWith('WEBSOCKET_'))
        .map(([key, value]) => `-e ${key}=${value}`)
        .join(" ");

    // Build each component
    exec("docker stop geo-run", path.join(__dirname, "./"));
    exec("docker container rm geo-run", path.join(__dirname, "./"));
    exec(`pnpm run containerize ${tag}`, path.join(__dirname, "./"));
    exec(
        `docker run --name geo-run ${envVars} -d -p 3000:3000 geo-run`,
        path.join(__dirname, "./")
    );
}

main();
