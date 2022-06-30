import * as core from "@actions/core";

export async function run() {
}

async function runWrapper() {
    try {
        if (process.env["ISTEST"]) {
            console.log("testing")
        } else {
            await run();
        }
    } catch (error) {
        core.setFailed(`create-deployment-from-label action failed: ${error}`);
        console.log(error);
    }
}

void runWrapper();