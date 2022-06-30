import * as core from "@actions/core";
import { context } from "@actions/github";
import { Context } from "@actions/github/lib/context";

export class Runner {
    constructor(private context: Context) { }

    run() {
        if (this.context.eventName !== "deployment_status") {
            throw new Error("This Action only works for 'deployment_status' triggers");
        }

        const deployment = this.context.payload.deployment;

        core.startGroup('Set outputs');
        this.setOutput('deployment_github_ref', deployment.ref);
        this.setOutput('environment', deployment.environment);
        core.endGroup();
    }

    setOutput(name: string, value: string) {
        core.setOutput(name, value);
        core.info(`   ${name}: ${value}`);
    }
}

export function run() {
    new Runner(context).run();
}

function runWrapper() {
    try {
        if (process.env["ISTEST"]) {
            console.log("testing")
        } else {
            run();
        }
    } catch (error) {
        core.setFailed(`create-deployment-from-label action failed: ${error}`);
        console.log(error);
    }
}

void runWrapper();