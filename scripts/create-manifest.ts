import { writeFileSync } from "fs";

const TAG = process.argv[2];
if (!TAG) {
    console.error("Please provide a tag as an argument");
    process.exit(1);
}

const manifest = {
    artifactURL: `https://github.com/KingTenet/geo-run/archive/refs/tags/${TAG}.tar.gz`,
};

writeFileSync("manifest.json", JSON.stringify(manifest, null, 2));
console.log(`Created manifest.json for tag ${TAG}`);
