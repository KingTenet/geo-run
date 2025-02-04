interface Location {
    name: string;
    latitude: number;
    longitude: number;
}

type LocationCondition = {
    location: Location;
    distanceMeters: number;
    type: "within" | "beyond";
};

interface Script {
    path: string;
    args?: string[];
    locations: LocationCondition[];
    maxLocationAge: number; // milliseconds
}

interface Config {
    scripts: Script[];
}

export const config: Config = {
    scripts: [
        {
            path: "./scripts/block-apps.sh",
            args: ["--force"],
            locations: [
                {
                    location: {
                        name: "home",
                        latitude: 51.5074,
                        longitude: -0.1278,
                    },
                    distanceMeters: 1000,
                    type: "beyond",
                },
                {
                    location: {
                        name: "office",
                        latitude: 51.5171,
                        longitude: -0.1404,
                    },
                    distanceMeters: 500,
                    type: "within",
                },
            ],
            maxLocationAge: 5 * 60 * 1000, // 5 minutes
        },
        // Add more scripts
    ],
};
